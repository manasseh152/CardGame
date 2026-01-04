/**
 * Composite Adapter
 * 
 * Combines a primary interactive adapter with one or more logging adapters.
 * All input operations go through the primary adapter.
 * All output operations are mirrored to logging adapters.
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

export interface CompositeAdapterConfig {
    /** Primary adapter for user interaction */
    primary: IOAdapter;
    /** Logging adapters that receive all events */
    loggers: IOAdapter[];
}

export class CompositeAdapter implements IOAdapter {
    readonly name: string;
    private primary: IOAdapter;
    private loggers: IOAdapter[];

    constructor(config: CompositeAdapterConfig) {
        this.primary = config.primary;
        this.loggers = config.loggers;
        this.name = `composite(${this.primary.name}+${this.loggers.map(l => l.name).join(',')})`;
    }

    async connect(): Promise<void> {
        // Connect all adapters
        await Promise.all([
            this.primary.connect(),
            ...this.loggers.map(l => l.connect()),
        ]);
    }

    async disconnect(): Promise<void> {
        // Disconnect all adapters
        await Promise.all([
            this.primary.disconnect(),
            ...this.loggers.map(l => l.disconnect()),
        ]);
    }

    // ========================================================================
    // Output - Messages (mirror to all adapters)
    // ========================================================================

    async intro(message: string): Promise<void> {
        await Promise.all([
            this.primary.intro(message),
            ...this.loggers.map(l => l.intro(message)),
        ]);
    }

    async outro(message: string): Promise<void> {
        await Promise.all([
            this.primary.outro(message),
            ...this.loggers.map(l => l.outro(message)),
        ]);
    }

    async log(level: LogLevel, message: string): Promise<void> {
        await Promise.all([
            this.primary.log(level, message),
            ...this.loggers.map(l => l.log(level, message)),
        ]);
    }

    async note(content: string, title?: string): Promise<void> {
        await Promise.all([
            this.primary.note(content, title),
            ...this.loggers.map(l => l.note(content, title)),
        ]);
    }

    // ========================================================================
    // Output - Spinner (mirror to all adapters)
    // ========================================================================

    spinner(): SpinnerController {
        const primarySpinner = this.primary.spinner();
        const loggerSpinners = this.loggers.map(l => l.spinner());

        return {
            start(message?: string) {
                primarySpinner.start(message);
                loggerSpinners.forEach(s => s.start(message));
            },
            stop(message?: string) {
                primarySpinner.stop(message);
                loggerSpinners.forEach(s => s.stop(message));
            },
            message(message: string) {
                primarySpinner.message(message);
                loggerSpinners.forEach(s => s.message(message));
            },
        };
    }

    // ========================================================================
    // Input - Prompts (primary only, but log the prompt and result)
    // ========================================================================

    async text(options: TextPromptOptions): Promise<PromptResult<string>> {
        // Log the prompt to loggers
        await Promise.all(
            this.loggers.map(l => l.log('info', `[PROMPT:text] ${options.message}`))
        );

        // Get input from primary
        const result = await this.primary.text(options);

        // Log the result to loggers
        if (result.cancelled) {
            await Promise.all(
                this.loggers.map(l => l.log('warning', `[RESPONSE:text] cancelled`))
            );
        } else {
            await Promise.all(
                this.loggers.map(l => l.log('info', `[RESPONSE:text] ${result.value}`))
            );
        }

        return result;
    }

    async select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>> {
        // Log the prompt to loggers
        const optionLabels = options.options.map(o => o.label).join(', ');
        await Promise.all(
            this.loggers.map(l => l.log('info', `[PROMPT:select] ${options.message} [${optionLabels}]`))
        );

        // Get input from primary
        const result = await this.primary.select(options);

        // Log the result to loggers
        if (result.cancelled) {
            await Promise.all(
                this.loggers.map(l => l.log('warning', `[RESPONSE:select] cancelled`))
            );
        } else {
            const selectedOption = options.options.find(o => o.value === result.value);
            await Promise.all(
                this.loggers.map(l => l.log('info', `[RESPONSE:select] ${selectedOption?.label ?? result.value}`))
            );
        }

        return result;
    }

    async confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>> {
        // Log the prompt to loggers
        await Promise.all(
            this.loggers.map(l => l.log('info', `[PROMPT:confirm] ${options.message}`))
        );

        // Get input from primary
        const result = await this.primary.confirm(options);

        // Log the result to loggers
        if (result.cancelled) {
            await Promise.all(
                this.loggers.map(l => l.log('warning', `[RESPONSE:confirm] cancelled`))
            );
        } else {
            await Promise.all(
                this.loggers.map(l => l.log('info', `[RESPONSE:confirm] ${result.value}`))
            );
        }

        return result;
    }
}

