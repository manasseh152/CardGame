/**
 * Game Registry
 * 
 * Central registry for all available game types.
 * Games register their factories here at startup, and the RoomManager
 * uses the registry to instantiate games when rooms are created.
 */

import type { 
    GameType, 
    GameCategory, 
    GameMetadata, 
    GameFactory 
} from './Game';

// ============================================================================
// Game Registry Class
// ============================================================================

/**
 * Registry that stores all available game factories.
 * Provides methods for registering games and querying available games.
 */
export class GameRegistry {
    private factories: Map<GameType, GameFactory> = new Map();

    /**
     * Register a game factory.
     * @param factory - The game factory to register
     * @throws Error if a factory with the same type is already registered
     */
    register(factory: GameFactory): void {
        const type = factory.metadata.type;
        
        if (this.factories.has(type)) {
            throw new Error(`Game type '${type}' is already registered`);
        }
        
        this.factories.set(type, factory);
        console.log(`Registered game: ${factory.metadata.name} (${type})`);
    }

    /**
     * Get a game factory by type.
     * @param type - The game type to look up
     * @returns The factory, or undefined if not found
     */
    getFactory(type: GameType): GameFactory | undefined {
        return this.factories.get(type);
    }

    /**
     * Check if a game type is registered.
     * @param type - The game type to check
     * @returns true if the game type is registered
     */
    hasGame(type: GameType): boolean {
        return this.factories.has(type);
    }

    /**
     * Get metadata for all available games.
     * @returns Array of game metadata
     */
    getAvailableGames(): GameMetadata[] {
        return Array.from(this.factories.values()).map(f => f.metadata);
    }

    /**
     * Get metadata for games in a specific category.
     * @param category - The category to filter by
     * @returns Array of game metadata in that category
     */
    getGamesByCategory(category: GameCategory): GameMetadata[] {
        return this.getAvailableGames().filter(m => m.category === category);
    }

    /**
     * Get all registered game types.
     * @returns Array of game type identifiers
     */
    getGameTypes(): GameType[] {
        return Array.from(this.factories.keys());
    }

    /**
     * Get the number of registered games.
     */
    get size(): number {
        return this.factories.size;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global game registry instance.
 * Use this to register and look up game factories.
 */
export const gameRegistry = new GameRegistry();

// ============================================================================
// Auto-Registration
// ============================================================================

/**
 * Register built-in games.
 * This function is called when the module is first imported.
 * Additional games can be registered by calling gameRegistry.register() directly.
 */
export function registerBuiltInGames(): void {
    // Import and register Blackjack
    // Note: We use dynamic import to avoid circular dependencies
    // The actual registration happens in the BlackjackGame module
}

// We don't auto-register here to avoid circular dependencies.
// The BlackjackGame module will register itself when imported.
// See src/game/index.ts for the import order.

