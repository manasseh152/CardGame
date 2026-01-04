/**
 * Adapters Module
 * 
 * Exports all IO adapters and the factory function.
 */

export * from './types';
export { ClackConsoleAdapter } from './ClackConsoleAdapter';
export { JsonLinesAdapter, type JsonLinesAdapterConfig } from './JsonLinesAdapter';
export { CompositeAdapter, type CompositeAdapterConfig } from './CompositeAdapter';
export { WebSocketAdapter, type WebSocketAdapterConfig } from './WebSocketAdapter';
export { 
    MultiplayerAdapter, 
    RoomIOAdapter,
    type MultiplayerAdapterConfig,
    type ClientConnection,
    type RoomInfo,
    type RoomPlayerInfo,
    type ClientMessage,
    type ServerMessage,
} from './MultiplayerAdapter';

import type { IOAdapter, AdapterType, AdapterConfig } from './types';
import { ClackConsoleAdapter } from './ClackConsoleAdapter';
import { JsonLinesAdapter } from './JsonLinesAdapter';
import { CompositeAdapter } from './CompositeAdapter';
import { WebSocketAdapter } from './WebSocketAdapter';

/**
 * Extended adapter configuration with logging options.
 */
export interface ExtendedAdapterConfig extends AdapterConfig {
    /** Enable JSON Lines logging to a file */
    logFile?: string;
    /** Enable JSON Lines logging to stderr */
    logToStderr?: boolean;
    /** WebSocket server port (for ws adapter) */
    port?: number;
    /** WebSocket server hostname (for ws adapter) */
    hostname?: string;
}

/**
 * Create an IO adapter based on configuration.
 * 
 * @param config - Adapter configuration or adapter type string
 * @returns The configured IO adapter
 */
export function createAdapter(config: ExtendedAdapterConfig | AdapterType): IOAdapter {
    const adapterConfig: ExtendedAdapterConfig = typeof config === 'string' 
        ? { type: config } 
        : config;

    // Create the primary adapter
    let primary: IOAdapter;
    switch (adapterConfig.type) {
        case 'clack':
            primary = new ClackConsoleAdapter();
            break;

        case 'jsonl':
            primary = new JsonLinesAdapter();
            break;

        case 'ws':
            primary = new WebSocketAdapter({
                port: adapterConfig.port,
                hostname: adapterConfig.hostname,
            });
            break;

        default:
            throw new Error(`Unknown adapter type: ${adapterConfig.type}`);
    }

    // Create loggers if specified
    const loggers: IOAdapter[] = [];

    if (adapterConfig.logFile) {
        // File-based logging using Bun's native file I/O
        loggers.push(new JsonLinesAdapter({
            output: Bun.file(adapterConfig.logFile),
            // No input for logging-only adapter
            input: null,
        }));
    }

    if (adapterConfig.logToStderr) {
        loggers.push(new JsonLinesAdapter({
            output: Bun.stderr,
            // No input for logging-only adapter
            input: null,
        }));
    }

    // Return composite adapter if we have loggers, otherwise just the primary
    if (loggers.length > 0) {
        return new CompositeAdapter({
            primary,
            loggers,
        });
    }

    return primary;
}

/**
 * Parse CLI arguments to determine adapter configuration.
 * 
 * Supports:
 *   --adapter=clack          Primary adapter type
 *   --adapter=jsonl          Primary adapter type
 *   --adapter=ws             WebSocket server adapter
 *   --port=3000              WebSocket server port (for ws adapter)
 *   --hostname=localhost     WebSocket server hostname (for ws adapter)
 *   --log=game.jsonl         Log all events to a file
 *   --log-stderr             Log all events to stderr
 * 
 * @param args - Command line arguments (default: process.argv.slice(2))
 * @returns Extended adapter configuration
 */
export function parseAdapterFromArgs(args: string[] = process.argv.slice(2)): ExtendedAdapterConfig {
    const config: ExtendedAdapterConfig = { type: 'clack' };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!;

        // --adapter=value format
        if (arg.startsWith('--adapter=')) {
            config.type = arg.slice('--adapter='.length) as AdapterType;
            continue;
        }

        // --adapter value or -a value format
        if (arg === '--adapter' || arg === '-a') {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                config.type = nextArg as AdapterType;
                i++; // Skip next arg
                continue;
            }
        }

        // --port=value format
        if (arg.startsWith('--port=')) {
            config.port = parseInt(arg.slice('--port='.length), 10);
            continue;
        }

        // --port value or -p value format
        if (arg === '--port' || arg === '-p') {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                config.port = parseInt(nextArg, 10);
                i++; // Skip next arg
                continue;
            }
        }

        // --hostname=value format
        if (arg.startsWith('--hostname=')) {
            config.hostname = arg.slice('--hostname='.length);
            continue;
        }

        // --hostname value format
        if (arg === '--hostname') {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                config.hostname = nextArg;
                i++; // Skip next arg
                continue;
            }
        }

        // --log=file format
        if (arg.startsWith('--log=')) {
            config.logFile = arg.slice('--log='.length);
            continue;
        }

        // --log file format
        if (arg === '--log' || arg === '-l') {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                config.logFile = nextArg;
                i++; // Skip next arg
                continue;
            }
        }

        // --log-stderr flag
        if (arg === '--log-stderr') {
            config.logToStderr = true;
            continue;
        }
    }

    return config;
}
