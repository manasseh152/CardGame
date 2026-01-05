/**
 * Room Manager
 * 
 * Manages multiple concurrent game rooms with player tracking,
 * ready state, and game lifecycle management.
 * Supports multiple game types through the GameRegistry.
 */

import type { 
    RoomId, 
    PlayerId, 
    SessionId,
    RoomSettings,
} from './identity';
import { 
    IdFactory, 
    createRoomIdentity,
    type RoomIdentity,
} from './identity';
import type { 
    MultiplayerAdapter, 
    RoomInfo, 
    RoomPlayerInfo,
    RoomCreateMessage,
    ClientConnection,
} from '../adapters/MultiplayerAdapter';
import type { RoomIOAdapter } from '../adapters/MultiplayerAdapter';
import type { GameType, MultiplayerGame, GameConfig } from './Game';
import { gameRegistry } from './GameRegistry';

// ============================================================================
// Room State
// ============================================================================

export interface RoomPlayer {
    playerId: PlayerId;
    sessionId: SessionId;
    name: string;
    isReady: boolean;
    isHost: boolean;
    chips: number;
}

export interface GameRoom {
    identity: RoomIdentity;
    players: Map<PlayerId, RoomPlayer>;
    hostPlayerId: PlayerId;
    isPlaying: boolean;
    /** The type of game this room is playing */
    gameType: GameType;
    /** The active game instance (when playing) */
    game?: MultiplayerGame;
    /** The room IO adapter (when playing) */
    adapter?: RoomIOAdapter;
}

// ============================================================================
// Room Manager
// ============================================================================

export class RoomManager {
    private rooms: Map<RoomId, GameRoom> = new Map();
    private playerRooms: Map<PlayerId, RoomId> = new Map();
    private sessionPlayers: Map<SessionId, PlayerId> = new Map();
    private multiplayerAdapter: MultiplayerAdapter;
    private defaultChips: number;

    constructor(adapter: MultiplayerAdapter, defaultChips: number = 1000) {
        this.multiplayerAdapter = adapter;
        this.defaultChips = defaultChips;
        this.setupEventHandlers();
    }

    // ========================================================================
    // Event Handler Setup
    // ========================================================================

    private setupEventHandlers(): void {
        this.multiplayerAdapter.setEventHandlers({
            onPlayerIdentified: (sessionId, playerId, name) => {
                this.sessionPlayers.set(sessionId, playerId);
            },

            onRoomListRequested: (sessionId) => {
                this.sendRoomList(sessionId);
            },

            onGameListRequested: (sessionId) => {
                this.sendGameList(sessionId);
            },

            onRoomCreate: (sessionId, settings) => {
                this.createRoom(sessionId, settings);
            },

            onRoomJoin: (sessionId, roomId) => {
                this.joinRoom(sessionId, roomId);
            },

            onRoomLeave: (sessionId) => {
                this.leaveRoom(sessionId);
            },

            onRoomReady: (sessionId, ready) => {
                this.setPlayerReady(sessionId, ready);
            },

            onRoomStart: (sessionId) => {
                this.startGame(sessionId);
            },

            onDisconnect: (sessionId) => {
                this.handleDisconnect(sessionId);
            },
        });
    }

    // ========================================================================
    // Room List
    // ========================================================================

    private getPublicRoomList(): RoomInfo[] {
        const rooms: RoomInfo[] = [];
        
        for (const room of this.rooms.values()) {
            if (!room.identity.settings.isPrivate) {
                rooms.push({
                    id: room.identity.id,
                    name: room.identity.name,
                    playerCount: room.players.size,
                    maxPlayers: room.identity.maxPlayers,
                    isPrivate: false,
                    isPlaying: room.isPlaying,
                    gameType: room.gameType,
                });
            }
        }
        
        return rooms;
    }

    private sendRoomList(sessionId: SessionId): void {
        const rooms = this.getPublicRoomList();
        this.multiplayerAdapter.sendRoomList(sessionId, rooms);
    }

    private sendGameList(sessionId: SessionId): void {
        const games = gameRegistry.getAvailableGames();
        this.multiplayerAdapter.sendGameList(sessionId, games);
    }

    // ========================================================================
    // Room Creation
    // ========================================================================

    createRoom(sessionId: SessionId, settings: RoomCreateMessage): GameRoom | null {
        const connection = this.multiplayerAdapter.getConnection(sessionId);
        if (!connection?.playerId || !connection.playerName) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'You must identify yourself first');
            return null;
        }

        // Check if player is already in a room
        if (this.playerRooms.has(connection.playerId)) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'You are already in a room');
            return null;
        }

        // Get and validate game type (default to blackjack)
        const gameType: GameType = (settings.gameType as GameType) ?? 'blackjack';
        const gameFactory = gameRegistry.getFactory(gameType);
        
        if (!gameFactory) {
            this.multiplayerAdapter.sendRoomError(sessionId, `Unknown game type: ${gameType}`);
            return null;
        }

        // Validate max players against game's limits
        const maxPlayers = Math.min(
            settings.maxPlayers ?? gameFactory.metadata.maxPlayers,
            gameFactory.metadata.maxPlayers
        );

        // Create room identity
        const roomIdentity = createRoomIdentity(settings.name || `${connection.playerName}'s Room`, {
            maxPlayers,
            settings: {
                isPrivate: settings.isPrivate ?? false,
                minBet: settings.minBet ?? 10,
                maxBet: settings.maxBet ?? 1000,
                deckCount: settings.deckCount ?? 1,
            },
        });

        // Create room player
        const roomPlayer: RoomPlayer = {
            playerId: connection.playerId,
            sessionId,
            name: connection.playerName,
            isReady: false,
            isHost: true,
            chips: this.defaultChips,
        };

        // Create room with game type
        const room: GameRoom = {
            identity: roomIdentity,
            players: new Map([[connection.playerId, roomPlayer]]),
            hostPlayerId: connection.playerId,
            isPlaying: false,
            gameType,
        };

        this.rooms.set(roomIdentity.id, room);
        this.playerRooms.set(connection.playerId, roomIdentity.id);
        this.multiplayerAdapter.setConnectionRoom(sessionId, roomIdentity.id);

        // Send room joined message
        this.multiplayerAdapter.sendRoomJoined(sessionId, {
            id: roomIdentity.id,
            name: roomIdentity.name,
            playerCount: 1,
            maxPlayers: roomIdentity.maxPlayers,
            isPrivate: roomIdentity.settings.isPrivate,
            isPlaying: false,
            gameType,
        }, true);

        // Broadcast player list
        this.broadcastRoomPlayers(roomIdentity.id);

        return room;
    }

    // ========================================================================
    // Room Joining
    // ========================================================================

    joinRoom(sessionId: SessionId, roomIdStr: string): boolean {
        const connection = this.multiplayerAdapter.getConnection(sessionId);
        if (!connection?.playerId || !connection.playerName) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'You must identify yourself first');
            return false;
        }

        // Check if player is already in a room
        if (this.playerRooms.has(connection.playerId)) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'You are already in a room');
            return false;
        }

        // Normalize room code
        const roomId = IdFactory.normalizeRoomCode(roomIdStr);
        if (!roomId) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Invalid room code');
            return false;
        }

        // Find room
        const room = this.rooms.get(roomId);
        if (!room) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Room not found');
            return false;
        }

        // Check if room is full
        if (room.players.size >= room.identity.maxPlayers) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Room is full');
            return false;
        }

        // Check if game is in progress
        if (room.isPlaying) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Game is already in progress');
            return false;
        }

        // Add player to room
        const roomPlayer: RoomPlayer = {
            playerId: connection.playerId,
            sessionId,
            name: connection.playerName,
            isReady: false,
            isHost: false,
            chips: this.defaultChips,
        };

        room.players.set(connection.playerId, roomPlayer);
        this.playerRooms.set(connection.playerId, roomId);
        this.multiplayerAdapter.setConnectionRoom(sessionId, roomId);

        // Send room joined message
        this.multiplayerAdapter.sendRoomJoined(sessionId, {
            id: room.identity.id,
            name: room.identity.name,
            playerCount: room.players.size,
            maxPlayers: room.identity.maxPlayers,
            isPrivate: room.identity.settings.isPrivate,
            isPlaying: room.isPlaying,
            gameType: room.gameType,
        }, false);

        // Broadcast updated player list
        this.broadcastRoomPlayers(roomId);

        return true;
    }

    // ========================================================================
    // Room Leaving
    // ========================================================================

    leaveRoom(sessionId: SessionId): boolean {
        const connection = this.multiplayerAdapter.getConnection(sessionId);
        if (!connection?.playerId) {
            return false;
        }

        return this.removePlayerFromRoom(connection.playerId);
    }

    private removePlayerFromRoom(playerId: PlayerId): boolean {
        const roomId = this.playerRooms.get(playerId);
        if (!roomId) {
            return false;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.playerRooms.delete(playerId);
            return false;
        }

        const player = room.players.get(playerId);
        if (!player) {
            this.playerRooms.delete(playerId);
            return false;
        }

        // Cancel any pending prompts for this player (important for voluntary leave during game)
        this.multiplayerAdapter.cancelPendingPrompt(player.sessionId);

        // Remove player
        room.players.delete(playerId);
        this.playerRooms.delete(playerId);
        this.multiplayerAdapter.setConnectionRoom(player.sessionId, undefined);

        // Send left message to player
        this.multiplayerAdapter.sendTo(player.sessionId, { type: 'room_left' });

        // If room is empty, delete it
        if (room.players.size === 0) {
            // End the game if it was running
            if (room.isPlaying) {
                room.isPlaying = false;
                room.game = undefined;
                room.adapter = undefined;
            }
            this.rooms.delete(roomId);
            return true;
        }

        // If host left, assign new host
        if (room.hostPlayerId === playerId) {
            const newHost = room.players.values().next().value;
            if (newHost) {
                room.hostPlayerId = newHost.playerId;
                newHost.isHost = true;
            }
        }

        // Handle player leaving during an active game
        if (room.isPlaying && room.game) {
            this.handlePlayerLeftDuringGame(room, playerId, player.name);
        }

        // Broadcast player left notification to remaining players
        this.multiplayerAdapter.broadcastToRoom(roomId, {
            type: 'player_left',
            playerId,
            playerName: player.name,
        });

        // Broadcast updated player list
        this.broadcastRoomPlayers(roomId);

        return true;
    }

    /**
     * Handle a player leaving during an active game.
     * Delegates to the game's handlePlayerLeft method.
     */
    private handlePlayerLeftDuringGame(room: GameRoom, playerId: PlayerId, playerName: string): void {
        const game = room.game;
        if (!game) return;

        // Log the disconnection to remaining players
        if (room.adapter) {
            room.adapter.log('warning', `${playerName} has left the game.`);
        }

        // Delegate to the game to handle the player leaving
        const canContinue = game.handlePlayerLeft(playerId, playerName);

        // If no players left, end the game
        if (!canContinue) {
            game.isRunning = false;
            this.endGame(room.identity.id);
        }
    }

    private handleDisconnect(sessionId: SessionId): void {
        const playerId = this.sessionPlayers.get(sessionId);
        if (playerId) {
            this.removePlayerFromRoom(playerId);
            this.sessionPlayers.delete(sessionId);
        }
    }

    // ========================================================================
    // Ready State
    // ========================================================================

    setPlayerReady(sessionId: SessionId, ready: boolean): void {
        const connection = this.multiplayerAdapter.getConnection(sessionId);
        if (!connection?.playerId) {
            return;
        }

        const roomId = this.playerRooms.get(connection.playerId);
        if (!roomId) {
            return;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }

        const player = room.players.get(connection.playerId);
        if (player) {
            player.isReady = ready;
            this.broadcastRoomPlayers(roomId);

            // Check if all players are ready to start
            if (ready && this.canStartGame(room)) {
                this.checkAutoStart(room);
            }
        }
    }

    private canStartGame(room: GameRoom): boolean {
        if (room.isPlaying) return false;
        if (room.players.size < 1) return false;
        
        // All players must be ready
        for (const player of room.players.values()) {
            if (!player.isReady) return false;
        }
        
        return true;
    }

    private checkAutoStart(room: GameRoom): void {
        // Only host can start, so we don't auto-start
        // Instead, send a "ready to start" notification
        this.multiplayerAdapter.broadcastToRoom(room.identity.id, {
            type: 'room_ready_to_start',
        });
    }

    // ========================================================================
    // Game Start
    // ========================================================================

    async startGame(sessionId: SessionId): Promise<boolean> {
        const connection = this.multiplayerAdapter.getConnection(sessionId);
        if (!connection?.playerId) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Not identified');
            return false;
        }

        const roomId = this.playerRooms.get(connection.playerId);
        if (!roomId) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Not in a room');
            return false;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Room not found');
            return false;
        }

        // Only host can start
        if (room.hostPlayerId !== connection.playerId) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Only the host can start the game');
            return false;
        }

        // Get game factory from registry
        const gameFactory = gameRegistry.getFactory(room.gameType);
        if (!gameFactory) {
            this.multiplayerAdapter.sendRoomError(sessionId, `Unknown game type: ${room.gameType}`);
            return false;
        }

        // Check minimum players
        if (room.players.size < gameFactory.metadata.minPlayers) {
            this.multiplayerAdapter.sendRoomError(
                sessionId, 
                `Need at least ${gameFactory.metadata.minPlayers} player(s) for ${gameFactory.metadata.name}`
            );
            return false;
        }

        // Mark room as playing
        room.isPlaying = true;

        // Send game starting notification
        this.multiplayerAdapter.sendGameStarting(roomId);

        // Create room adapter for game I/O
        room.adapter = this.multiplayerAdapter.createRoomAdapter(roomId);

        // Create player profiles for game
        const playerProfiles = Array.from(room.players.values()).map(p => ({
            name: p.name,
            chips: p.chips,
            playerId: p.playerId,
        }));

        // Create game config
        const gameConfig: GameConfig = {
            players: playerProfiles,
            decks: room.identity.settings.deckCount,
        };

        // Create game using factory
        room.game = gameFactory.create(room.adapter, gameConfig);

        // Run the game in background
        this.runGameLoop(room).catch(err => {
            console.error('Game error:', err);
            this.endGame(roomId);
        });

        return true;
    }

    private async runGameLoop(room: GameRoom): Promise<void> {
        if (!room.game || !room.adapter) return;

        try {
            // Set up player ID mapping for prompts
            const playerMap = new Map<string, PlayerId>();
            for (const player of room.players.values()) {
                playerMap.set(player.name, player.playerId);
            }

            // Provide a getter for the current host (may change if host leaves)
            const getHostPlayerId = () => room.hostPlayerId;

            // Run the game's multiplayer loop
            await room.game.runMultiplayer(playerMap, room.adapter, getHostPlayerId);
        } finally {
            this.endGame(room.identity.id);
        }
    }

    private endGame(roomId: RoomId): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.isPlaying = false;
        room.game = undefined;
        room.adapter = undefined;

        // Reset all players' ready state
        for (const player of room.players.values()) {
            player.isReady = false;
        }

        // Notify players game ended
        this.multiplayerAdapter.broadcastToRoom(roomId, { type: 'game_ended' });
        this.broadcastRoomPlayers(roomId);
    }

    // ========================================================================
    // Broadcasting
    // ========================================================================

    private broadcastRoomPlayers(roomId: RoomId): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const players: RoomPlayerInfo[] = Array.from(room.players.values()).map(p => ({
            playerId: p.playerId,
            name: p.name,
            isReady: p.isReady,
            isHost: p.isHost,
        }));

        this.multiplayerAdapter.sendRoomPlayers(roomId, players);
    }

    // ========================================================================
    // Getters
    // ========================================================================

    getRoom(roomId: RoomId): GameRoom | undefined {
        return this.rooms.get(roomId);
    }

    getRoomForPlayer(playerId: PlayerId): GameRoom | undefined {
        const roomId = this.playerRooms.get(playerId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }
}

