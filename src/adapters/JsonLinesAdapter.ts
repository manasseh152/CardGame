/**
 * JSON Lines Adapter
 * 
 * Non-interactive adapter that reads JSON commands from stdin and writes
 * JSON responses to stdout. Useful for automation, testing, and integration.
 * 
 * Input format (one JSON object per line):
 *   {"value": "Alice"}           - for text prompts
 *   {"value": "add"}             - for select prompts  
 *   {"value": true}              - for confirm prompts
 *   {"cancel": true}             - to cancel any prompt
 * 
 * Output format (one JSON object per line):
 *   {"type": "intro", "message": "..."}
 *   {"type": "log", "level": "info", "message": "..."}
 *   {"type": "prompt", "promptType": "text", "options": {...}}
 *   {"type": "spinner", "action": "start", "message": "..."}
 */

import type {
    IOAdapter,
    LogLevel,
    SpinnerController,
    TextPromptOptions,
    SelectPromptOptions,
    ConfirmPromptOptions,
    PromptResult,
} from './types';

interface JsonInput {
    value?: unknown;
    cancel?: boolean;
}

interface JsonOutput {
    type: string;
    [key: string]: unknown;
}

export interface JsonLinesAdapterConfig {
    /** BunFile or stream source to read input from (default: Bun.stdin). Set to null for output-only adapters. */
    input?: { stream(): ReadableStream<Uint8Array> } | null;
    /** BunFile to write output to (default: Bun.stdout) */
    output?: typeof Bun.stdout;
}

export class JsonLinesAdapter implements IOAdapter {
    readonly name = 'jsonl';

    private lineReader: AsyncGenerator<string, void, unknown> | null = null;
    private inputQueue: string[] = [];
    private waitingResolve: ((line: string) => void) | null = null;
    private writer: ReturnType<typeof Bun.stdout.writer> | null = null;
    private config: {
        input: { stream(): ReadableStream<Uint8Array> } | null;
        output: typeof Bun.stdout;
    };

    constructor(config: JsonLinesAdapterConfig = {}) {
        this.config = {
            // Allow null for output-only adapters, default to Bun.stdin
            input: config.input === null ? null : (config.input ?? Bun.stdin),
            output: config.output ?? Bun.stdout,
        };
    }

    async connect(): Promise<void> {
        // Create a FileSink writer for efficient streaming output
        this.writer = this.config.output.writer();

        // Create an async line reader from the input stream (if input is provided)
        if (this.config.input) {
            this.lineReader = this.createLineReader();
            this.startReading();
        }

        this.emit({ type: 'connected', adapter: this.name });
    }

    async disconnect(): Promise<void> {
        this.lineReader = null;
        this.emit({ type: 'disconnected', adapter: this.name });

        // Flush and close the writer
        if (this.writer) {
            await this.writer.end();
            this.writer = null;
        }
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    /**
     * Creates an async generator that yields lines from the input stream.
     * Uses Bun's native ReadableStream API for efficient line-by-line reading.
     */
    private async *createLineReader(): AsyncGenerator<string, void, unknown> {
        if (!this.config.input) return;
        const stream = this.config.input.stream();
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Yield any remaining content as the last line
                    if (buffer.length > 0) {
                        yield buffer;
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // Split on newlines and yield complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.length > 0) {
                        yield line;
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Starts the background reading loop that processes incoming lines.
     */
    private async startReading(): Promise<void> {
        if (!this.lineReader) return;

        try {
            for await (const line of this.lineReader) {
                if (this.waitingResolve) {
                    const resolve = this.waitingResolve;
                    this.waitingResolve = null;
                    resolve(line);
                } else {
                    this.inputQueue.push(line);
                }
            }
        } catch {
            // Stream closed or errored - this is expected on disconnect
        }
    }

    /**
     * Emits a JSON object to stdout using Bun's FileSink for efficient writes.
     */
    private emit(data: JsonOutput): void {
        const line = JSON.stringify(data) + '\n';
        if (this.writer) {
            this.writer.write(line);
            this.writer.flush();
        }
    }

    private async readLine(): Promise<string> {
        // Check queue first
        const queued = this.inputQueue.shift();
        if (queued !== undefined) {
            return queued;
        }

        // Wait for next line
        return new Promise<string>((resolve) => {
            this.waitingResolve = resolve;
        });
    }

    private async readInput(): Promise<JsonInput> {
        const line = await this.readLine();
        try {
            return JSON.parse(line) as JsonInput;
        } catch {
            // If not valid JSON, treat as raw value
            return { value: line };
        }
    }

    // ========================================================================
    // Output - Messages
    // ========================================================================

    async intro(message: string): Promise<void> {
        this.emit({ type: 'intro', message });
    }

    async outro(message: string): Promise<void> {
        this.emit({ type: 'outro', message });
    }

    async log(level: LogLevel, message: string): Promise<void> {
        this.emit({ type: 'log', level, message });
    }

    async note(content: string, title?: string): Promise<void> {
        this.emit({ type: 'note', title, content });
    }

    // ========================================================================
    // Output - Spinner
    // ========================================================================

    spinner(): SpinnerController {
        const emit = this.emit.bind(this);
        return {
            start(message?: string) {
                emit({ type: 'spinner', action: 'start', message });
            },
            stop(message?: string) {
                emit({ type: 'spinner', action: 'stop', message });
            },
            message(message: string) {
                emit({ type: 'spinner', action: 'message', message });
            },
        };
    }

    // ========================================================================
    // Input - Prompts
    // ========================================================================

    async text(options: TextPromptOptions): Promise<PromptResult<string>> {
        this.emit({
            type: 'prompt',
            promptType: 'text',
            message: options.message,
            placeholder: options.placeholder,
            defaultValue: options.defaultValue,
        });

        const input = await this.readInput();

        if (input.cancel) {
            return { cancelled: true };
        }

        const value = String(input.value ?? options.defaultValue ?? '');

        // Validate if validator provided
        if (options.validate) {
            const error = options.validate(value);
            if (error) {
                this.emit({ type: 'validation_error', message: error });
                // In non-interactive mode, we'll accept the value anyway
                // but log the validation error
            }
        }

        return { cancelled: false, value };
    }

    async select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>> {
        this.emit({
            type: 'prompt',
            promptType: 'select',
            message: options.message,
            options: options.options,
        });

        const input = await this.readInput();

        if (input.cancel) {
            return { cancelled: true };
        }

        // Find matching option by value
        const selectedValue = input.value;
        const option = options.options.find(opt => opt.value === selectedValue);

        if (option) {
            return { cancelled: false, value: option.value };
        }

        // If no exact match, try to match by index
        if (typeof selectedValue === 'number') {
            const optionByIndex = options.options[selectedValue];
            if (optionByIndex) {
                return { cancelled: false, value: optionByIndex.value };
            }
        }

        // Default to first option
        if (options.options.length > 0) {
            this.emit({
                type: 'warning',
                message: `Invalid selection "${selectedValue}", defaulting to first option`,
            });
            return { cancelled: false, value: options.options[0]!.value };
        }

        return { cancelled: true };
    }

    async confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>> {
        this.emit({
            type: 'prompt',
            promptType: 'confirm',
            message: options.message,
            initialValue: options.initialValue,
        });

        const input = await this.readInput();

        if (input.cancel) {
            return { cancelled: true };
        }

        // Parse boolean from various formats
        const value = input.value;
        let boolValue: boolean;

        if (typeof value === 'boolean') {
            boolValue = value;
        } else if (typeof value === 'string') {
            boolValue = ['true', 'yes', 'y', '1'].includes(value.toLowerCase());
        } else {
            boolValue = options.initialValue ?? false;
        }

        return { cancelled: false, value: boolValue };
    }
}
