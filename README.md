# Blackjack Card Game

A multiplayer Blackjack game built with Bun, featuring a modular adapter system for multiple I/O interfaces and real-time WebSocket multiplayer support.

## Features

- **Full Blackjack Game**: Complete implementation with betting, splitting, doubling down, and dealer AI
- **Multiplayer Support**: Multiple players can connect from different devices
- **Multi-Room System**: Create public/private rooms, join via lobby or room codes
- **Modular I/O Adapters**: Console (Clack), JSON Lines, WebSocket, and Composite adapters
- **Player Identity System**: Unique IDs for players, sessions, rooms, and hands

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+ installed

### Installation

```bash
bun install
```

### Running the Multiplayer Server

Start the WebSocket server for multiplayer games:

```bash
bun run multiplayer
```

Options:
- `--port=3000` - Server port (default: 3000)
- `--hostname=localhost` - Server hostname (default: localhost)

### Running Single-Player Console Mode

For local single-player games with the terminal UI:

```bash
bun run start
```

Or with development watch mode:

```bash
bun run dev
```

## Project Structure

```
src/
├── adapters/               # I/O Adapter implementations
│   ├── ClackConsoleAdapter.ts   # Interactive terminal UI
│   ├── JsonLinesAdapter.ts      # JSON Lines protocol
│   ├── WebSocketAdapter.ts      # Single-client WebSocket
│   ├── MultiplayerAdapter.ts    # Multi-client WebSocket for rooms
│   ├── CompositeAdapter.ts      # Combine multiple adapters
│   └── types.ts                 # Adapter interfaces
├── game/
│   ├── BlackjackGame.ts         # Main game logic
│   ├── Deck.ts                  # Card deck management
│   ├── Player.ts                # Player classes
│   ├── PlayerManager.ts         # Pre-game player setup
│   ├── RoomManager.ts           # Multi-room game management
│   ├── identity.ts              # ID generation system
│   └── types.ts                 # Game types
├── index.ts                     # Console mode entry point
└── multiplayer.ts               # Multiplayer server entry point

blackjack-poc-ws/           # React frontend (see its README)
```

## Adapter System

The game uses an adapter pattern to abstract I/O operations:

| Adapter | Use Case |
|---------|----------|
| `ClackConsoleAdapter` | Interactive terminal games with beautiful prompts |
| `JsonLinesAdapter` | Machine-readable JSON protocol for automation |
| `WebSocketAdapter` | Single-client WebSocket connection |
| `MultiplayerAdapter` | Multi-client WebSocket with room support |
| `CompositeAdapter` | Combine primary adapter with logging adapters |

### CLI Adapter Options

```bash
# Interactive console (default)
bun run start --adapter=clack

# JSON Lines mode (stdin/stdout)
bun run start --adapter=jsonl

# Single-client WebSocket server
bun run start --adapter=ws --port=3000

# With logging to file
bun run start --log=game.jsonl

# With logging to stderr
bun run start --log-stderr
```

## Multiplayer Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser 1     │     │   Browser 2     │     │   Browser 3     │
│   (Player A)    │     │   (Player B)    │     │   (Player C)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   MultiplayerAdapter    │
                    │   (WebSocket Server)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      RoomManager        │
                    ├─────────────────────────┤
                    │  Room: ABC123           │
                    │  ├── Player A (host)    │
                    │  └── Player B           │
                    ├─────────────────────────┤
                    │  Room: XYZ789           │
                    │  └── Player C           │
                    └─────────────────────────┘
```

### Message Protocol

**Client → Server:**
- `{ type: "identify", name: "Alice" }` - Set player name
- `{ type: "room_list" }` - Get available public rooms
- `{ type: "room_create", name?: string, isPrivate?: boolean }` - Create room
- `{ type: "room_join", roomId: "ABC123" }` - Join room by code
- `{ type: "room_leave" }` - Leave current room
- `{ type: "room_ready", ready: true }` - Toggle ready state
- `{ type: "room_start" }` - Start the game (host only)
- `{ value: ... }` - Response to game prompts

**Server → Client:**
- `{ type: "connected", sessionId: "..." }` - Connection established
- `{ type: "identified", playerId: "...", name: "..." }` - Identity confirmed
- `{ type: "room_list", rooms: [...] }` - Available rooms
- `{ type: "room_joined", room: {...}, isHost: true }` - Joined room
- `{ type: "room_players", players: [...] }` - Room player list update
- `{ type: "game_starting" }` - Game is starting
- `{ type: "prompt", promptType: "...", ... }` - Player action prompt
- `{ type: "game_state", ... }` - Game state broadcast

## Game Rules

- Standard Blackjack rules with dealer standing on 17
- Blackjack pays 3:2
- Players can split pairs (requires equal bet)
- Double down available on first two cards
- Insurance and surrender not implemented

## Development

```bash
# Type check
bun run build

# Run with watch mode
bun run dev

# Run multiplayer server with watch mode
bun run multiplayer:dev
```

## License

MIT
