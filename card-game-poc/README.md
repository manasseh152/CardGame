# Card Games — Multiplayer Web Client

A React-based web client for multiplayer card games. Features a beautiful dark-themed UI with real-time WebSocket connectivity and support for multiple game types.

## Features

- **Multi-Game Support**: Play Blackjack, Ride the Bus, and more
- **Game Browser**: Browse available games with categories (Casino, Drinking, Party)
- **Multiplayer Lobby**: Browse public rooms or join via room code
- **Room Management**: Create rooms with custom settings (game type, public/private, max players)
- **Waiting Room**: See players, ready states, and start games as host
- **Real-time Game Table**: Animated cards, player turns, and game state
- **Responsive Design**: Works on desktop and mobile browsers

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+ installed
- Multiplayer server running (see main README)

### Installation

```bash
bun install
```

### Development

1. Start the multiplayer server (in the parent directory):

```bash
cd ..
bun run multiplayer
```

2. Start the frontend dev server:

```bash
bun run dev
```

3. Open http://localhost:5173 in your browser

### Production Build

```bash
bun run build
```

The built files will be in the `dist/` directory.

## User Flow

```
┌─────────────────┐
│   Connect to    │
│     Server      │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Enter Player   │
│      Name       │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│     Lobby       │────▶│  Browse Games   │
│                 │     │  Select a game  │
│  • Browse games │     └─────────────────┘
│  • Public rooms │
│  • Join by code │     ┌─────────────────┐
│  • Create room  │────▶│  Create Room    │
│                 │     │  Choose game,   │
│                 │     │  set options    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Waiting Room   │
│                 │
│  • Game info    │
│  • Player list  │
│  • Ready toggle │
│  • Start game   │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Game Table    │
│                 │
│  • Card display │
│  • Game actions │
│  • Player stats │
└─────────────────┘
```

## Project Structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── prompts/             # Game prompt components
│   ├── ConnectionPanel.tsx  # Server connection UI
│   ├── PlayingCard.tsx      # Card rendering
│   ├── GameLog.tsx          # Event log display
│   └── SpinnerOverlay.tsx   # Loading indicator
├── features/
│   ├── connection/          # Connection panel
│   ├── identity/            # Player identification
│   ├── lobby/               # Game browser & room list
│   ├── games/               # Game selection components
│   ├── waiting-room/        # Pre-game room view
│   ├── game/                # Game table & prompts
│   └── layout/              # App header, footer, patterns
├── hooks/
│   ├── useWebSocket.ts      # Main WebSocket orchestration
│   ├── useConnection.ts     # Connection state
│   ├── useIdentity.ts       # Player identity
│   ├── useRoom.ts           # Room management
│   ├── useGame.ts           # Game state
│   └── useGameLog.ts        # Event logging
├── context/
│   └── WebSocketContext.tsx # Global WebSocket provider
├── routes/                  # TanStack Router file-based routes
├── types/
│   └── index.ts             # TypeScript definitions
├── lib/
│   └── utils.ts             # Utility functions
├── main.tsx                 # React entry point
└── index.css                # Global styles + Tailwind
```

## Key Features

### Game Browser

The lobby includes a game browser with:
- **Search**: Find games by name or description
- **Categories**: Filter by Casino, Drinking, or Party games
- **Quick Start**: Select a game and create a room instantly
- **Room Count**: See how many public rooms are playing each game

### Multiple Game Types

Currently supported games:
- **Blackjack** (Casino) - Classic casino card game
- **Ride the Bus** (Drinking) - Popular drinking card game

More games can be added by implementing the game logic on the server.

### `useWebSocket` Hook

Central state management for WebSocket connection, identity, rooms, and game state.

```typescript
const {
  // Connection
  connectionState,
  connect,
  disconnect,
  
  // Identity
  playerName,
  playerId,
  identify,
  
  // Rooms
  currentRoom,
  roomPlayers,
  isHost,
  availableRooms,
  availableGames,
  createRoom,
  joinRoom,
  leaveRoom,
  setReady,
  startGame,
  
  // Game
  gameState,
  currentPrompt,
  sendResponse,
  
  // View
  currentView,  // 'connecting' | 'identify' | 'lobby' | 'waiting-room' | 'playing'
} = useWebSocket();
```

### View Routing

The app uses TanStack Router with file-based routing:

| Route | View |
|-------|------|
| `/connect` | Connect to server |
| `/identify` | Enter player name |
| `/rooms` | Lobby (browse games/rooms) |
| `/rooms/:roomId` | Waiting room |
| `/rooms/:roomId/game` | Game table |

## Styling

- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** for accessible component primitives
- **Dark card game theme** with emerald/amber/rose accents
- **Lucide React** for icons
- **Outfit** font for UI, **Playfair Display** for display text

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
- **TanStack Router** for routing
- **Tailwind CSS v4** for styling
- **shadcn/ui** for UI components
- **Sonner** for toast notifications

## Configuration

The default WebSocket URL is `ws://localhost:3000`. This can be changed in the connection panel.

For production, set the appropriate WebSocket URL for your deployment.

## Browser Support

Modern browsers with WebSocket support:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
