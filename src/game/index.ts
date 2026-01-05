/**
 * Game Module
 * 
 * Exports all game-related types and classes.
 */

// Core types
export * from './types';
export * from './identity';

// Game abstraction layer
export {
    type GameType,
    type GameCategory,
    type GameMetadata,
    type GameConfig,
    type GameFactory,
    type BaseGame,
    type MultiplayerGame,
} from './Game';

// Game registry
export { GameRegistry, gameRegistry } from './GameRegistry';

// Deck
export { Deck, DEFAULT_DECK_CONFIG, BLACKJACK_DECK_CONFIG } from './Deck';

// Player
export { 
    Player, 
    BlackjackPlayer,
    type PlayerOptions,
    type BlackjackPlayerOptions,
    type PlayerSnapshot,
    type BlackjackPlayerSnapshot,
} from './Player';
export { PlayerManager } from './PlayerManager';

// Games - import to trigger auto-registration with gameRegistry
export { 
    BlackjackGame, 
    BlackjackGameFactory,
    type BlackjackGameStatePayload,
} from './BlackjackGame';

// Room management
export { RoomManager, type GameRoom, type RoomPlayer } from './RoomManager';

