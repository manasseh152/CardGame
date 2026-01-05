// ============================================================================
// Message Types from Server
// ============================================================================

export interface ServerMessage {
    type: string;
    [key: string]: unknown;
}

export interface ConnectedMessage extends ServerMessage {
    type: 'connected';
    sessionId: string;
}

export interface IdentifiedMessage extends ServerMessage {
    type: 'identified';
    playerId: string;
    name: string;
}

export interface DisconnectedMessage extends ServerMessage {
    type: 'disconnected';
}

export interface IntroMessage extends ServerMessage {
    type: 'intro';
    message: string;
}

export interface OutroMessage extends ServerMessage {
    type: 'outro';
    message: string;
}

export interface LogMessage extends ServerMessage {
    type: 'log';
    level: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'message';
    message: string;
}

export interface NoteMessage extends ServerMessage {
    type: 'note';
    title?: string;
    content: string;
}

export interface SpinnerMessage extends ServerMessage {
    type: 'spinner';
    action: 'start' | 'stop' | 'message';
    message?: string;
}

export interface TextPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'text';
    message: string;
    placeholder?: string;
    defaultValue?: string;
}

export interface SelectPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'select';
    message: string;
    options: Array<{
        value: string;
        label: string;
        hint?: string;
    }>;
}

export interface ConfirmPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'confirm';
    message: string;
    initialValue?: boolean;
}

export interface ValidationErrorMessage extends ServerMessage {
    type: 'validation_error';
    message: string;
}

export interface WarningMessage extends ServerMessage {
    type: 'warning';
    message: string;
}

// ============================================================================
// Game Types
// ============================================================================

/** Categories for organizing games */
export type GameCategory = 'casino' | 'drinking' | 'party';

/** Unique identifier for each game type */
export type GameType = 'blackjack' | 'ride-the-bus';

/** Metadata about a game type */
export interface GameMetadata {
    type: GameType;
    name: string;
    category: GameCategory;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    icon?: string;
}

export interface GameListMessage extends ServerMessage {
    type: 'game_list';
    games: GameMetadata[];
}

// ============================================================================
// Room Types
// ============================================================================

export interface RoomInfo {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    isPrivate: boolean;
    isPlaying: boolean;
    /** The type of game this room is playing */
    gameType?: GameType;
}

export interface RoomPlayerInfo {
    playerId: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
}

export interface RoomListMessage extends ServerMessage {
    type: 'room_list';
    rooms: RoomInfo[];
}

export interface RoomJoinedMessage extends ServerMessage {
    type: 'room_joined';
    room: RoomInfo;
    isHost: boolean;
}

export interface RoomPlayersMessage extends ServerMessage {
    type: 'room_players';
    players: RoomPlayerInfo[];
}

export interface RoomLeftMessage extends ServerMessage {
    type: 'room_left';
}

export interface RoomErrorMessage extends ServerMessage {
    type: 'room_error';
    error: string;
}

export interface PlayerLeftMessage extends ServerMessage {
    type: 'player_left';
    playerId: string;
    playerName: string;
}

export interface RoomReadyToStartMessage extends ServerMessage {
    type: 'room_ready_to_start';
}

export interface GameStartingMessage extends ServerMessage {
    type: 'game_starting';
}

export interface GameEndedMessage extends ServerMessage {
    type: 'game_ended';
}

// ============================================================================
// Game State Types
// ============================================================================

export interface CardState {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
    hidden?: boolean;
}

export interface PlayerState {
    id: string;
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
    parentPlayerId?: string;
}

export interface GameState {
    phase: 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'round-over';
    dealer: PlayerState;
    players: PlayerState[];
    message: string;
}

export interface GameStateMessage extends ServerMessage {
    type: 'game_state';
    phase: GameState['phase'];
    dealer: PlayerState;
    players: PlayerState[];
    message: string;
}

// ============================================================================
// Combined Types
// ============================================================================

export type PromptMessage = TextPromptMessage | SelectPromptMessage | ConfirmPromptMessage;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export type AppView = 'connecting' | 'identify' | 'lobby' | 'waiting-room' | 'playing';

export interface GameLogEntry {
    id: string;
    timestamp: Date;
    type: 'intro' | 'outro' | 'log' | 'note' | 'warning' | 'validation_error';
    level?: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'message';
    message: string;
    title?: string;
}

