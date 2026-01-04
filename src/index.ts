/**
 * Card Game - Main Entry Point
 * 
 * Usage:
 *   bun run src/index.ts                         # Interactive console (default)
 *   bun run src/index.ts --adapter=clack         # Interactive console
 *   bun run src/index.ts --adapter=jsonl         # JSON Lines (stdin/stdout)
 *   bun run src/index.ts --log=game.jsonl        # Interactive + log to file
 *   bun run src/index.ts --log-stderr            # Interactive + log to stderr
 *   bun run src/index.ts --log=game.jsonl --log-stderr  # Both logging options
 */

import { createAdapter, parseAdapterFromArgs } from './adapters';
import { PlayerManager, BlackjackGame } from './game';

async function main() {
    // Parse adapter from command line arguments
    const adapterConfig = parseAdapterFromArgs();
    const adapter = createAdapter(adapterConfig);

    // Connect the adapter
    await adapter.connect();

    // Show intro
    await adapter.intro('Card Game Console');

    // Run player management to configure players
    const playerManager = new PlayerManager(adapter);
    const playerProfiles = await playerManager.run();

    if (!playerProfiles) {
        await adapter.outro('Goodbye!');
        await adapter.disconnect();
        process.exit(0);
    }

    // Create and start the blackjack game
    const game = new BlackjackGame(adapter, { players: playerProfiles, decks: 1 });
    await game.start();

    // Disconnect adapter
    await adapter.disconnect();
}

main().catch(console.error);
