/**
 * Clack Console Adapter
 * 
 * Interactive console adapter using @clack/prompts for beautiful CLI interfaces.
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import type {
    IOAdapter,
    LogLevel,
    SpinnerController,
    TextPromptOptions,
    SelectPromptOptions,
    ConfirmPromptOptions,
    PromptResult,
} from './types';

export class ClackConsoleAdapter implements IOAdapter {
    readonly name = 'clack-console';

    async connect(): Promise<void> {
        // Clack doesn't require connection setup
    }

    async disconnect(): Promise<void> {
        // Clack doesn't require disconnection cleanup
    }

    // ========================================================================
    // Output - Messages
    // ========================================================================

    async intro(message: string): Promise<void> {
        p.intro(color.bgCyan(color.black(` ${message} `)));
    }

    async outro(message: string): Promise<void> {
        p.outro(color.bgGreen(color.black(` ${message} `)));
    }

    async log(level: LogLevel, message: string): Promise<void> {
        switch (level) {
            case 'info':
                p.log.info(message);
                break;
            case 'success':
                p.log.success(message);
                break;
            case 'error':
                p.log.error(message);
                break;
            case 'warning':
                p.log.warning(message);
                break;
            case 'message':
                p.log.message(message);
                break;
        }
    }

    async note(content: string, title?: string): Promise<void> {
        p.note(content, title);
    }

    // ========================================================================
    // Output - Spinner
    // ========================================================================

    spinner(): SpinnerController {
        const s = p.spinner();
        return {
            start(message?: string) {
                s.start(message);
            },
            stop(message?: string) {
                s.stop(message);
            },
            message(message: string) {
                s.message(message);
            },
        };
    }

    // ========================================================================
    // Input - Prompts
    // ========================================================================

    async text(options: TextPromptOptions): Promise<PromptResult<string>> {
        const result = await p.text({
            message: options.message,
            placeholder: options.placeholder,
            defaultValue: options.defaultValue,
            validate: options.validate,
        });

        if (p.isCancel(result)) {
            return { cancelled: true };
        }

        return { cancelled: false, value: result as string };
    }

    async select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>> {
        // Use type assertion to satisfy clack's complex conditional Option<T> type
        // Our SelectOption interface is compatible at runtime
        const result = await (p.select as Function)({
            message: options.message,
            options: options.options,
        });

        if (p.isCancel(result)) {
            return { cancelled: true };
        }

        return { cancelled: false, value: result as T };
    }

    async confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>> {
        const result = await p.confirm({
            message: options.message,
            initialValue: options.initialValue,
        });

        if (p.isCancel(result)) {
            return { cancelled: true };
        }

        return { cancelled: false, value: result as boolean };
    }
}

