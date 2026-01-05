/**
 * Game Interfaces and Types
 * 
 * Defines the core abstractions for supporting multiple game types.
 * All multiplayer games must implement the MultiplayerGame interface.
 */

import type { PlayerId } from './identity';
import type { RoomIOAdapter } from '../adapters/MultiplayerAdapter';

// ============================================================================
// Game Categories and Types
// ============================================================================

/**
 * Categories for organizing games in the UI.
 * Used for filtering and grouping in game selection.
 */
export type GameCategory = 'casino' | 'drinking' | 'party';

/**
 * Unique identifier for each game type.
 * Add new game types here as they are implemented.
 */
export type GameType = 'blackjack' | 'ride-the-bus';

// ============================================================================
// Game Metadata
// ============================================================================

/**
 * Static metadata about a game type.
 * Used for UI display and validation.
 */
export interface GameMetadata {
    /** Unique game type identifier */
    type: GameType;
    
    /** Display name (e.g., "Blackjack", "Ride the Bus") */
    name: string;
    
    /** Category for organization/filtering */
    category: GameCategory;
    
    /** Short description of the game */
    description: string;
    
    /** Minimum number of players required */
    minPlayers: number;
    
    /** Maximum number of players allowed */
    maxPlayers: number;
    
    /** Optional emoji/icon for UI display */
    icon?: string;
}

// ============================================================================
// Game Configuration
// ============================================================================

/**
 * Base configuration passed to game factories.
 * Games can extend this with their own specific config.
 */
export interface GameConfig {
    /** Player profiles with name and chips */
    players: Array<{
        name: string;
        chips: number;
        playerId?: PlayerId;
    }>;
    
    /** Number of decks to use (if applicable) */
    decks?: number;
    
    /** Additional game-specific settings */
    [key: string]: unknown;
}

// ============================================================================
// Game Factory Interface
// ============================================================================

/**
 * Factory for creating game instances.
 * Each game type registers a factory with the GameRegistry.
 */
export interface GameFactory {
    /** Static metadata about this game type */
    metadata: GameMetadata;
    
    /**
     * Create a new instance of this game.
     * @param adapter - The room IO adapter for player interactions
     * @param config - Game configuration including players
     * @returns A new MultiplayerGame instance
     */
    create(adapter: RoomIOAdapter, config: GameConfig): MultiplayerGame;
}

// ============================================================================
// Base Game Interface
// ============================================================================

/**
 * Base interface that all games must implement.
 * Provides the core game lifecycle methods.
 */
export interface BaseGame {
    /** Array of players in the game */
    players: unknown[];
    
    /** Whether the game is currently running */
    isRunning: boolean;
    
    /** Start the game loop */
    start(): Promise<void>;
    
    /** End the game and cleanup */
    end(): Promise<void>;
}

// ============================================================================
// Multiplayer Game Interface
// ============================================================================

/**
 * Interface for games that support multiplayer mode.
 * Extends BaseGame with methods for handling player interactions
 * and routing prompts to specific players.
 */
export interface MultiplayerGame extends BaseGame {
    /**
     * Run the game in multiplayer mode.
     * This method handles the game loop with player-specific prompts.
     * 
     * @param playerMap - Maps player names to their PlayerId for routing prompts
     * @param adapter - The room IO adapter for player interactions
     * @param getHostPlayerId - Function to get current host (may change if host leaves)
     */
    runMultiplayer(
        playerMap: Map<string, PlayerId>,
        adapter: RoomIOAdapter,
        getHostPlayerId: () => PlayerId
    ): Promise<void>;
    
    /**
     * Handle a player leaving during an active game.
     * The game should update its state and continue with remaining players.
     * 
     * @param playerId - The ID of the player who left
     * @param playerName - The name of the player who left
     * @returns true if the game can continue, false if it should end
     */
    handlePlayerLeft(playerId: PlayerId, playerName: string): boolean;
    
    /**
     * Get the name of the player whose turn it currently is.
     * Used for routing prompts to the correct player.
     * 
     * @returns The current player's name, or undefined if no player has a turn
     */
    getCurrentPlayerName(): string | undefined;
    
    /**
     * Get the current phase of the game.
     * Used for game state synchronization.
     */
    phase: string;
    
    /**
     * Index of the current player in the players array.
     */
    currentPlayerIndex: number;
}

