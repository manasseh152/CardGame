/**
 * IO Adapter Types
 * 
 * Defines the interface for all IO adapters, abstracting input/output
 * operations from the game logic.
 */

// ============================================================================
// Input Types
// ============================================================================

export interface SelectOption<T = string> {
    value: T;
    label: string;
    hint?: string;
}

export interface TextPromptOptions {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
}

export interface SelectPromptOptions<T = string> {
    message: string;
    options: SelectOption<T>[];
}

export interface ConfirmPromptOptions {
    message: string;
    initialValue?: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

export type LogLevel = 'info' | 'success' | 'error' | 'warning' | 'message';

export interface SpinnerController {
    start(message?: string): void;
    stop(message?: string): void;
    message(message: string): void;
}

// ============================================================================
// Game State Types (for WebSocket clients)
// ============================================================================

export interface CardState {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
    hidden?: boolean;
}

export interface PlayerState {
    /** Unique player ID */
    id: string;
    /** Unique hand ID (for split hands) */
    handId: string;
    name: string;
    hand: CardState[];
    handValue: number;
    bet: number;
    chips: number;
    status: 'playing' | 'stay' | 'bust' | 'blackjack';
    isDealer: boolean;
    isCurrent: boolean;
    splitHand?: PlayerState;
    /** Parent player ID (for split hands) */
    parentPlayerId?: string;
}

export interface GameState {
    phase: 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'round-over';
    dealer: PlayerState;
    players: PlayerState[];
    message: string;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Represents the result of a prompt operation.
 * - `cancelled: true` means the user cancelled the operation
 * - `cancelled: false` means the user provided a value
 */
export type PromptResult<T> = 
    | { cancelled: true; value?: undefined }
    | { cancelled: false; value: T };

// ============================================================================
// IO Adapter Interface
// ============================================================================

/**
 * Core IO Adapter interface.
 * 
 * All adapters must implement these methods to provide input/output
 * functionality for the game logic.
 */
export interface IOAdapter {
    /** Adapter name for identification */
    readonly name: string;

    // Lifecycle
    connect(): Promise<void>;
    disconnect(): Promise<void>;

    // Output - Messages
    intro(message: string): Promise<void>;
    outro(message: string): Promise<void>;
    log(level: LogLevel, message: string): Promise<void>;
    note(content: string, title?: string): Promise<void>;

    // Output - Game State (optional - primarily for WebSocket clients)
    gameState?(state: GameState): Promise<void>;

    // Output - Spinner
    spinner(): SpinnerController;

    // Input - Prompts
    text(options: TextPromptOptions): Promise<PromptResult<string>>;
    select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>>;
    confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>>;
}

// ============================================================================
// Adapter Factory Types
// ============================================================================

export type AdapterType = 'clack' | 'jsonl' | 'ws';

export interface AdapterConfig {
    type: AdapterType;
    /** For JsonLinesAdapter: output file path */
    outputPath?: string;
}

