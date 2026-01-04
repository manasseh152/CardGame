/**
 * WebSocket Adapter
 * 
 * Server-side WebSocket adapter using Bun.serve() that allows clients to
 * connect and play the game remotely. Uses the same JSON protocol as
 * JsonLinesAdapter for compatibility.
 * 
 * Server to Client (Output):
 *   {"type": "intro", "message": "..."}
 *   {"type": "log", "level": "info", "message": "..."}
 *   {"type": "prompt", "promptType": "text", "message": "...", "placeholder": "..."}
 *   {"type": "prompt", "promptType": "select", "message": "...", "options": [...]}
 *   {"type": "spinner", "action": "start", "message": "..."}
 * 
 * Client to Server (Input):
 *   {"value": "Alice"}           - for text prompts
 *   {"value": "add"}             - for select prompts  
 *   {"value": true}              - for confirm prompts
 *   {"cancel": true}             - to cancel any prompt
 */

import type { Server, ServerWebSocket } from 'bun';
import type {
    IOAdapter,
    LogLevel,
    SpinnerController,
    TextPromptOptions,
    SelectPromptOptions,
    ConfirmPromptOptions,
    PromptResult,
    GameState,
} from './types';

interface JsonInput {
    value?: unknown;
    cancel?: boolean;
}

interface JsonOutput {
    type: string;
    [key: string]: unknown;
}

interface WebSocketData {
    connectedAt: number;
}

export interface WebSocketAdapterConfig {
    /** Server port (default: 3000) */
    port?: number;
    /** Server hostname (default: "localhost") */
    hostname?: string;
}

export class WebSocketAdapter implements IOAdapter {
    readonly name = 'websocket';

    private server: Server<WebSocketData> | null = null;
    private client: ServerWebSocket<WebSocketData> | null = null;
    private inputQueue: JsonInput[] = [];
    private waitingResolve: ((input: JsonInput) => void) | null = null;
    private clientConnectedPromise: Promise<void> | null = null;
    private clientConnectedResolve: (() => void) | null = null;
    private config: Required<WebSocketAdapterConfig>;

    constructor(config: WebSocketAdapterConfig = {}) {
        this.config = {
            port: config.port ?? 3000,
            hostname: config.hostname ?? 'localhost',
        };
    }

    async connect(): Promise<void> {
        // Create a promise that resolves when a client connects
        this.clientConnectedPromise = new Promise<void>((resolve) => {
            this.clientConnectedResolve = resolve;
        });

        // Start the WebSocket server
        this.server = Bun.serve<WebSocketData>({
            port: this.config.port,
            hostname: this.config.hostname,

            fetch: (req, server) => {
                // Upgrade all requests to WebSocket
                const success = server.upgrade(req, {
                    data: {
                        connectedAt: Date.now(),
                    },
                });

                if (success) {
                    return undefined;
                }

                return new Response('WebSocket upgrade failed', { status: 500 });
            },

            websocket: {
                open: (ws) => {
                    // Only allow one client at a time
                    if (this.client) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Another client is already connected',
                        }));
                        ws.close(1008, 'Another client is already connected');
                        return;
                    }

                    this.client = ws;
                    this.send({ type: 'connected', adapter: this.name });

                    // Resolve the connection promise
                    if (this.clientConnectedResolve) {
                        this.clientConnectedResolve();
                        this.clientConnectedResolve = null;
                    }
                },

                message: (ws, message) => {
                    // Parse the incoming message
                    let input: JsonInput;
                    try {
                        const text = typeof message === 'string' 
                            ? message 
                            : new TextDecoder().decode(message);
                        input = JSON.parse(text) as JsonInput;
                    } catch {
                        // If not valid JSON, treat as raw value
                        const text = typeof message === 'string' 
                            ? message 
                            : new TextDecoder().decode(message);
                        input = { value: text };
                    }

                    // If someone is waiting for input, resolve immediately
                    if (this.waitingResolve) {
                        const resolve = this.waitingResolve;
                        this.waitingResolve = null;
                        resolve(input);
                    } else {
                        // Otherwise queue the input
                        this.inputQueue.push(input);
                    }
                },

                close: (ws) => {
                    if (this.client === ws) {
                        this.client = null;
                        
                        // If we were waiting for input, cancel it
                        if (this.waitingResolve) {
                            const resolve = this.waitingResolve;
                            this.waitingResolve = null;
                            resolve({ cancel: true });
                        }
                    }
                },

                drain: () => {
                    // Socket is ready to receive more data
                },
            },
        });

        console.log(`WebSocket server listening on ws://${this.config.hostname}:${this.config.port}`);
    }

    async disconnect(): Promise<void> {
        // Send disconnect message to client
        if (this.client) {
            this.send({ type: 'disconnected', adapter: this.name });
            this.client.close(1000, 'Server shutting down');
            this.client = null;
        }

        // Stop the server
        if (this.server) {
            this.server.stop();
            this.server = null;
        }

        // Reset state
        this.inputQueue = [];
        this.waitingResolve = null;
        this.clientConnectedPromise = null;
        this.clientConnectedResolve = null;
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    /**
     * Sends a JSON message to the connected client.
     */
    private send(data: JsonOutput): void {
        if (this.client) {
            this.client.send(JSON.stringify(data));
        }
    }

    /**
     * Waits for a client to connect if one isn't already connected.
     */
    private async ensureClient(): Promise<void> {
        if (this.client) return;
        if (this.clientConnectedPromise) {
            await this.clientConnectedPromise;
        }
    }

    /**
     * Reads the next input from the client.
     */
    private async readInput(): Promise<JsonInput> {
        // Ensure we have a connected client
        await this.ensureClient();

        // Check queue first
        const queued = this.inputQueue.shift();
        if (queued !== undefined) {
            return queued;
        }

        // Wait for next input
        return new Promise<JsonInput>((resolve) => {
            this.waitingResolve = resolve;
        });
    }

    // ========================================================================
    // Output - Messages
    // ========================================================================

    async intro(message: string): Promise<void> {
        await this.ensureClient();
        this.send({ type: 'intro', message });
    }

    async outro(message: string): Promise<void> {
        await this.ensureClient();
        this.send({ type: 'outro', message });
    }

    async log(level: LogLevel, message: string): Promise<void> {
        await this.ensureClient();
        this.send({ type: 'log', level, message });
    }

    async note(content: string, title?: string): Promise<void> {
        await this.ensureClient();
        this.send({ type: 'note', title, content });
    }

    async gameState(state: GameState): Promise<void> {
        await this.ensureClient();
        this.send({ type: 'game_state', ...state });
    }

    // ========================================================================
    // Output - Spinner
    // ========================================================================

    spinner(): SpinnerController {
        const send = this.send.bind(this);
        const ensureClient = this.ensureClient.bind(this);
        
        return {
            start(message?: string) {
                ensureClient().then(() => {
                    send({ type: 'spinner', action: 'start', message });
                });
            },
            stop(message?: string) {
                ensureClient().then(() => {
                    send({ type: 'spinner', action: 'stop', message });
                });
            },
            message(message: string) {
                ensureClient().then(() => {
                    send({ type: 'spinner', action: 'message', message });
                });
            },
        };
    }

    // ========================================================================
    // Input - Prompts
    // ========================================================================

    async text(options: TextPromptOptions): Promise<PromptResult<string>> {
        await this.ensureClient();
        
        this.send({
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
                this.send({ type: 'validation_error', message: error });
                // In non-interactive mode, we'll accept the value anyway
                // but send the validation error
            }
        }

        return { cancelled: false, value };
    }

    async select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>> {
        await this.ensureClient();
        
        this.send({
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
            this.send({
                type: 'warning',
                message: `Invalid selection "${selectedValue}", defaulting to first option`,
            });
            return { cancelled: false, value: options.options[0]!.value };
        }

        return { cancelled: true };
    }

    async confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>> {
        await this.ensureClient();
        
        this.send({
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

