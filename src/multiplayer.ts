/**
 * Multiplayer Server Entry Point
 * 
 * Starts the WebSocket server for multiplayer blackjack games.
 * 
 * Usage:
 *   bun run src/multiplayer.ts
 *   bun run src/multiplayer.ts --port=3000
 *   bun run src/multiplayer.ts --hostname=0.0.0.0
 */

import { MultiplayerAdapter } from './adapters/MultiplayerAdapter';
import { RoomManager } from './game/RoomManager';

// Parse CLI arguments
function parseArgs(): { port: number; hostname: string } {
    const args = process.argv.slice(2);
    let port = 3000;
    let hostname = 'localhost';

    for (const arg of args) {
        if (arg.startsWith('--port=')) {
            port = parseInt(arg.slice('--port='.length), 10);
        } else if (arg.startsWith('--hostname=')) {
            hostname = arg.slice('--hostname='.length);
        }
    }

    return { port, hostname };
}

async function main() {
    const { port, hostname } = parseArgs();

    console.log('Starting Multiplayer Blackjack Server...');
    console.log(`  Port: ${port}`);
    console.log(`  Hostname: ${hostname}`);
    console.log('');

    // Create multiplayer adapter
    const adapter = new MultiplayerAdapter({ port, hostname });

    // Create room manager (this sets up all event handlers)
    new RoomManager(adapter);

    // Start the server
    await adapter.start();

    console.log('');
    console.log('Server is ready!');
    console.log(`Connect your browser to ws://${hostname}:${port}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server.');

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await adapter.stop();
        process.exit(0);
    });
}

main().catch(console.error);
