/**
 * Game Module
 * 
 * Exports all game-related types and classes.
 */

export * from './types';
export * from './identity';
export { Deck, DEFAULT_DECK_CONFIG, BLACKJACK_DECK_CONFIG } from './Deck';
export { 
    Player, 
    BlackjackPlayer,
    type PlayerOptions,
    type BlackjackPlayerOptions,
    type PlayerSnapshot,
    type BlackjackPlayerSnapshot,
} from './Player';
export { PlayerManager } from './PlayerManager';
export { BlackjackGame, type BlackjackGameStatePayload } from './BlackjackGame';
export { RoomManager, type GameRoom, type RoomPlayer } from './RoomManager';

