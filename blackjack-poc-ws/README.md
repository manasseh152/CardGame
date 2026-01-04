# Blackjack Web Client

A React-based web client for the multiplayer Blackjack game. Features a beautiful dark-themed casino UI with real-time WebSocket connectivity.

## Features

- **Multiplayer Lobby**: Browse public rooms or join via room code
- **Room Management**: Create rooms with custom settings (public/private, max players)
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
│     Lobby       │────▶│  Create Room    │
│                 │     │    Dialog       │
│  • Public rooms │     └─────────────────┘
│  • Join by code │
│  • Create room  │     ┌─────────────────┐
│                 │────▶│ Join by Code    │
└────────┬────────┘     │    Dialog       │
         │              └─────────────────┘
         ▼
┌─────────────────┐
│  Waiting Room   │
│                 │
│  • Player list  │
│  • Ready toggle │
│  • Start game   │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Game Table    │
│                 │
│  • Card display │
│  • Betting UI   │
│  • Action panel │
└─────────────────┘
```

## Project Structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── prompts/             # Game prompt components
│   ├── ConnectionPanel.tsx  # Server connection UI
│   ├── IdentifyView.tsx     # Player name entry
│   ├── LobbyView.tsx        # Room browser + dialogs
│   ├── WaitingRoom.tsx      # Pre-game room view
│   ├── GameTable.tsx        # Main game display
│   ├── PlayingCard.tsx      # Card rendering
│   ├── GameLog.tsx          # Event log display
│   └── SpinnerOverlay.tsx   # Loading indicator
├── hooks/
│   └── useWebSocket.ts      # WebSocket state management
├── lib/
│   └── utils.ts             # Utility functions
├── App.tsx                  # Main app with view routing
├── main.tsx                 # React entry point
└── index.css                # Global styles + Tailwind
```

## Key Components

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

The app automatically routes between views based on state:

| State | View |
|-------|------|
| Not connected | Connect to server |
| Connected, no name | Enter player name |
| Named, no room | Lobby (browse/create/join) |
| In room, not playing | Waiting room |
| In room, playing | Game table |

## Styling

- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for accessible component primitives
- **Dark casino theme** with emerald/amber accents
- **Lucide React** for icons

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
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
