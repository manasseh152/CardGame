/**
 * Room Manager
 * 
 * Manages multiple concurrent game rooms with player tracking,
 * ready state, and game lifecycle management.
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
import { BlackjackGame } from './BlackjackGame';
import type { RoomIOAdapter } from '../adapters/MultiplayerAdapter';

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
    game?: BlackjackGame;
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
                });
            }
        }
        
        return rooms;
    }

    private sendRoomList(sessionId: SessionId): void {
        const rooms = this.getPublicRoomList();
        this.multiplayerAdapter.sendRoomList(sessionId, rooms);
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

        // Create room identity
        const roomIdentity = createRoomIdentity(settings.name || `${connection.playerName}'s Room`, {
            maxPlayers: settings.maxPlayers ?? 6,
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

        // Create room
        const room: GameRoom = {
            identity: roomIdentity,
            players: new Map([[connection.playerId, roomPlayer]]),
            hostPlayerId: connection.playerId,
            isPlaying: false,
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
     * Removes them from the game and advances to next player if needed.
     */
    private handlePlayerLeftDuringGame(room: GameRoom, playerId: PlayerId, playerName: string): void {
        const game = room.game;
        if (!game) return;

        // Find the player in the game by name
        const gamePlayerIndex = game.players.findIndex(p => p.name === playerName);

        if (gamePlayerIndex === -1) return;

        const gamePlayer = game.players[gamePlayerIndex]!;
        const wasCurrentPlayer = game.currentPlayerIndex === gamePlayerIndex;

        // Mark player as bust/out so they're skipped
        gamePlayer.status = 'bust';
        gamePlayer.chips = 0;

        // Log the disconnection to remaining players
        if (room.adapter) {
            room.adapter.log('warning', `${playerName} has left the game.`);
        }

        // Remove the player from the game's player array
        game.players.splice(gamePlayerIndex, 1);

        // Adjust currentPlayerIndex if needed
        if (game.currentPlayerIndex > gamePlayerIndex) {
            game.currentPlayerIndex--;
        } else if (wasCurrentPlayer) {
            // If it was the current player's turn, they will be skipped
            // The currentPlayerIndex now points to the next player (due to splice)
            // If we're past the end, move to dealer turn
            if (game.currentPlayerIndex >= game.players.length) {
                game.phase = 'dealer-turn';
            }
        }

        // If no players left, end the game
        if (game.players.length === 0) {
            game.isRunning = false;
            this.endGame(room.identity.id);
            return;
        }

        // Broadcast updated game state
        if (room.adapter?.gameState) {
            room.adapter.gameState(game['buildGameState']());
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

        // Check minimum players
        if (room.players.size < 1) {
            this.multiplayerAdapter.sendRoomError(sessionId, 'Need at least 1 player');
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

        // Create and start game
        room.game = new BlackjackGame(room.adapter, {
            players: playerProfiles,
            decks: room.identity.settings.deckCount,
        });

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

            // Custom game loop that routes prompts to correct players
            await this.runMultiplayerGame(room, playerMap);
        } finally {
            this.endGame(room.identity.id);
        }
    }

    private async runMultiplayerGame(
        room: GameRoom, 
        playerMap: Map<string, PlayerId>
    ): Promise<void> {
        if (!room.game || !room.adapter) return;

        const game = room.game;
        const adapter = room.adapter;

        game.isRunning = true;
        await adapter.log('info', 'Welcome to Blackjack! Try to beat the dealer without going over 21.');

        while (game.isRunning) {
            // Betting phase
            if (game.phase === 'betting') {
                // Iterate with index to handle removals
                let i = 0;
                while (i < game.players.length && game.isRunning) {
                    const player = game.players[i]!;
                    const playerId = playerMap.get(player.name);
                    if (playerId) {
                        adapter.setCurrentPlayer(playerId);
                    }
                    
                    // Send current state to all players
                    if (adapter.gameState) {
                        await adapter.gameState(game['buildGameState']());
                    }

                    const betResult = await adapter.text({
                        message: `${player.name}, enter your bet (chips: ${player.chips}):`,
                        placeholder: '50',
                        validate: (value) => {
                            const amount = parseInt(value);
                            if (isNaN(amount) || amount <= 0) return 'Must be a positive number';
                            if (amount > player.chips) return `You only have ${player.chips} chips`;
                            return undefined;
                        },
                    });

                    if (betResult.cancelled) {
                        // Check if player was removed (disconnect)
                        const playerStillExists = game.players.includes(player);
                        if (!playerStillExists) {
                            // Player disconnected, continue with remaining players
                            if (game.players.length === 0) {
                                game.isRunning = false;
                                break;
                            }
                            // Don't increment i since array shifted
                            continue;
                        }
                        // Player quit voluntarily
                        game.isRunning = false;
                        break;
                    }

                    game.placeBet(player, parseInt(betResult.value));
                    i++;
                }

                if (!game.isRunning || game.players.length === 0) break;
                game.dealInitialCards();
            }

            // Player turns
            while (game.phase === 'player-turn' && game.isRunning) {
                const player = game.getCurrentPlayer();
                if (!player) {
                    game.phase = 'dealer-turn';
                    break;
                }

                // Check if there are still players in the game
                if (game.players.length === 0) {
                    game.isRunning = false;
                    break;
                }

                const playerId = playerMap.get(player.name);
                if (playerId) {
                    adapter.setCurrentPlayer(playerId);
                }

                // Broadcast state
                if (adapter.gameState) {
                    await adapter.gameState(game['buildGameState']());
                }

                // Build action options
                const actionOptions: { value: string; label: string; hint: string }[] = [
                    { value: 'hit', label: 'Hit', hint: 'Draw another card' },
                    { value: 'stand', label: 'Stand', hint: 'Keep current hand' },
                ];

                if (player.canDoubleDown()) {
                    actionOptions.push({ value: 'double', label: 'Double Down', hint: 'Double bet, get one card' });
                }
                if (player.canSplit()) {
                    actionOptions.push({ value: 'split', label: 'Split', hint: 'Split pair into two hands' });
                }
                actionOptions.push({ value: 'quit', label: 'Quit', hint: 'Exit the game' });

                const actionResult = await adapter.select({
                    message: `${player.name}'s turn (Hand: ${game.calculateHandValue(player.hand)}):`,
                    options: actionOptions,
                });

                if (actionResult.cancelled) {
                    // Check if this player was removed from the game (disconnect)
                    // If so, continue with the next player instead of ending the game
                    const playerStillExists = game.players.includes(player);
                    if (!playerStillExists) {
                        // Player was removed due to disconnect, handled by handlePlayerLeftDuringGame
                        // Check if there are players left
                        if (game.players.length === 0) {
                            game.isRunning = false;
                            break;
                        }
                        // Continue with the game (next player is already set)
                        continue;
                    }
                    // Player cancelled voluntarily (quit)
                    game.isRunning = false;
                    break;
                }

                switch (actionResult.value) {
                    case 'hit':
                        game.playerHit(player);
                        if (player.status !== 'playing') {
                            game.nextPlayer();
                            if (game.phase === 'player-turn' && !game.getCurrentPlayer()) {
                                game.phase = 'dealer-turn';
                            }
                        }
                        break;
                    case 'stand':
                        game.playerStand(player);
                        game.nextPlayer();
                        if (game.phase === 'player-turn' && !game.getCurrentPlayer()) {
                            game.phase = 'dealer-turn';
                        }
                        break;
                    case 'double':
                        game.playerDoubleDown(player);
                        game.nextPlayer();
                        if (game.phase === 'player-turn' && !game.getCurrentPlayer()) {
                            game.phase = 'dealer-turn';
                        }
                        break;
                    case 'split':
                        game.playerSplit(player);
                        break;
                    case 'quit':
                        game.isRunning = false;
                        break;
                }
            }

            if (!game.isRunning) break;

            // Dealer turn
            if (game.phase === 'dealer-turn') {
                const spinner = adapter.spinner();
                spinner.start('Dealer is playing...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                game.dealerPlay();
                spinner.stop('Dealer finished.');
            }

            // Round over
            if (game.phase === 'round-over') {
                const payouts = game.resolveRound();
                
                if (adapter.gameState) {
                    await adapter.gameState(game['buildGameState']());
                }

                // Format results
                const dealerResult = `Dealer: ${game.dealer.status}`;
                const results = game.players
                    .map((player) => {
                        const payout = payouts.get(player) ?? 0;
                        const bet = player.bet;
                        const net = payout - bet;
                        const result = net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : 'Push';
                        return `${player.name}: ${result} — Now has $${player.chips} chips`;
                    })
                    .join('\n');

                await adapter.note(`${dealerResult}\n${'-'.repeat(40)}\n${results}`, 'Round Results');

                // Check if there are still players in the game
                if (game.players.length === 0) {
                    await adapter.log('warning', 'All players have left!');
                    break;
                }

                // Check if any players have chips
                const activePlayers = game.players.filter(pl => pl.chips > 0);
                if (activePlayers.length === 0) {
                    await adapter.log('warning', 'All players are out of chips!');
                    break;
                }

                // Ask host if they want to continue (use current room host)
                let hostPlayerId = room.hostPlayerId;
                adapter.setCurrentPlayer(hostPlayerId);

                const continueResult = await adapter.select({
                    message: 'What next?',
                    options: [
                        { value: 'newround', label: 'New Round', hint: 'Play another hand' },
                        { value: 'quit', label: 'Quit', hint: 'End the game' },
                    ],
                });

                if (continueResult.cancelled) {
                    // Check if game still has players (host may have disconnected)
                    if (game.players.length === 0) {
                        break;
                    }
                    // If host disconnected, end the round and let remaining players decide
                    // For now, continue to a new round if there are still players
                    await adapter.log('info', 'Host left. Starting new round...');
                }

                if (!continueResult.cancelled && continueResult.value === 'quit') {
                    break;
                }

                // Reset for new round
                game.deck.reset();
                game.deck.shuffle();
                game.phase = 'betting';
                game.currentPlayerIndex = 0;
                for (const player of game.players) {
                    player.reset();
                }
                game.dealer.reset();
            }
        }

        // Game ended
        const standings = game.players
            .sort((a, b) => b.chips - a.chips)
            .map((player, i) => {
                const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
                return `${medal} ${player.name}: $${player.chips} chips`;
            })
            .join('\n');

        await adapter.note(standings, 'Final Standings');
        await adapter.outro('Thanks for playing!');
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

