/**
 * Multiplayer WebSocket Adapter
 * 
 * Multi-client WebSocket adapter that supports multiple players connecting
 * to multiple game rooms. Routes messages to specific players and broadcasts
 * game state to room members.
 */

import type { Server, ServerWebSocket } from 'bun';
import type {
    IOAdapter,
    LogLevel,
    SpinnerController,
    TextPromptOptions,
    SelectPromptOptions,
    ConfirmPromptOptions,
    PromptResult,
    GameState,
} from './types';
import {
    type PlayerId,
    type SessionId,
    type RoomId,
    IdFactory,
} from '../game/identity';

// ============================================================================
// Message Types
// ============================================================================

/** Messages from client to server */
export interface ClientMessage {
    type: string;
    [key: string]: unknown;
}

export interface IdentifyMessage extends ClientMessage {
    type: 'identify';
    name: string;
}

export interface RoomListMessage extends ClientMessage {
    type: 'room_list';
}

export interface RoomCreateMessage extends ClientMessage {
    type: 'room_create';
    name?: string;
    isPrivate?: boolean;
    maxPlayers?: number;
    minBet?: number;
    maxBet?: number;
    deckCount?: number;
}

export interface RoomJoinMessage extends ClientMessage {
    type: 'room_join';
    roomId: string;
}

export interface RoomLeaveMessage extends ClientMessage {
    type: 'room_leave';
}

export interface RoomReadyMessage extends ClientMessage {
    type: 'room_ready';
    ready: boolean;
}

export interface PromptResponseMessage extends ClientMessage {
    value?: unknown;
    cancel?: boolean;
}

/** Messages from server to client */
export interface ServerMessage {
    type: string;
    [key: string]: unknown;
}

// ============================================================================
// Connection Types
// ============================================================================

export interface ClientConnection {
    ws: ServerWebSocket<WebSocketData>;
    sessionId: SessionId;
    playerId?: PlayerId;
    playerName?: string;
    roomId?: RoomId;
    isReady: boolean;
}

interface WebSocketData {
    sessionId: SessionId;
    connectedAt: number;
}

// ============================================================================
// Room Player Info (for broadcasting)
// ============================================================================

export interface RoomPlayerInfo {
    playerId: PlayerId;
    name: string;
    isReady: boolean;
    isHost: boolean;
}

export interface RoomInfo {
    id: RoomId;
    name: string;
    playerCount: number;
    maxPlayers: number;
    isPrivate: boolean;
    isPlaying: boolean;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export interface MultiplayerEventHandlers {
    onPlayerIdentified?: (sessionId: SessionId, playerId: PlayerId, name: string) => void;
    onRoomListRequested?: (sessionId: SessionId) => void;
    onRoomCreate?: (sessionId: SessionId, settings: RoomCreateMessage) => void;
    onRoomJoin?: (sessionId: SessionId, roomId: string) => void;
    onRoomLeave?: (sessionId: SessionId) => void;
    onRoomReady?: (sessionId: SessionId, ready: boolean) => void;
    onRoomStart?: (sessionId: SessionId) => void;
    onPromptResponse?: (sessionId: SessionId, value: unknown, cancelled: boolean) => void;
    onDisconnect?: (sessionId: SessionId) => void;
}

// ============================================================================
// Multiplayer Adapter Configuration
// ============================================================================

export interface MultiplayerAdapterConfig {
    port?: number;
    hostname?: string;
}

// ============================================================================
// Multiplayer Adapter
// ============================================================================

export class MultiplayerAdapter {
    private server: Server<WebSocketData> | null = null;
    private connections: Map<SessionId, ClientConnection> = new Map();
    private promptResolvers: Map<SessionId, (input: { value?: unknown; cancel?: boolean }) => void> = new Map();
    private config: Required<MultiplayerAdapterConfig>;
    private eventHandlers: MultiplayerEventHandlers = {};

    constructor(config: MultiplayerAdapterConfig = {}) {
        this.config = {
            port: config.port ?? 3000,
            hostname: config.hostname ?? 'localhost',
        };
    }

    // ========================================================================
    // Lifecycle
    // ========================================================================

    async start(): Promise<void> {
        this.server = Bun.serve<WebSocketData>({
            port: this.config.port,
            hostname: this.config.hostname,

            fetch: (req, server) => {
                const success = server.upgrade(req, {
                    data: {
                        sessionId: IdFactory.sessionId(),
                        connectedAt: Date.now(),
                    },
                });

                if (success) {
                    return undefined;
                }

                return new Response('WebSocket upgrade failed', { status: 500 });
            },

            websocket: {
                open: (ws) => {
                    const sessionId = ws.data.sessionId;
                    
                    const connection: ClientConnection = {
                        ws,
                        sessionId,
                        isReady: false,
                    };
                    
                    this.connections.set(sessionId, connection);
                    
                    this.sendTo(sessionId, {
                        type: 'connected',
                        sessionId,
                    });
                },

                message: (ws, message) => {
                    const sessionId = ws.data.sessionId;
                    const connection = this.connections.get(sessionId);
                    if (!connection) return;

                    let data: ClientMessage;
                    try {
                        const text = typeof message === 'string'
                            ? message
                            : new TextDecoder().decode(message);
                        data = JSON.parse(text) as ClientMessage;
                    } catch {
                        return;
                    }

                    this.handleClientMessage(sessionId, data);
                },

                close: (ws) => {
                    const sessionId = ws.data.sessionId;
                    
                    // Cancel any pending prompts
                    const resolver = this.promptResolvers.get(sessionId);
                    if (resolver) {
                        resolver({ cancel: true });
                        this.promptResolvers.delete(sessionId);
                    }
                    
                    // Notify handlers
                    this.eventHandlers.onDisconnect?.(sessionId);
                    
                    // Remove connection
                    this.connections.delete(sessionId);
                },

                drain: () => {
                    // Socket ready for more data
                },
            },
        });

        console.log(`Multiplayer server listening on ws://${this.config.hostname}:${this.config.port}`);
    }

    async stop(): Promise<void> {
        // Close all connections
        for (const [sessionId, connection] of this.connections) {
            this.sendTo(sessionId, { type: 'disconnected' });
            connection.ws.close(1000, 'Server shutting down');
        }
        
        this.connections.clear();
        this.promptResolvers.clear();
        
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
    }

    // ========================================================================
    // Event Handlers Registration
    // ========================================================================

    setEventHandlers(handlers: MultiplayerEventHandlers): void {
        this.eventHandlers = handlers;
    }

    // ========================================================================
    // Message Handling
    // ========================================================================

    private handleClientMessage(sessionId: SessionId, data: ClientMessage): void {
        const connection = this.connections.get(sessionId);
        if (!connection) return;

        switch (data.type) {
            case 'identify': {
                const msg = data as IdentifyMessage;
                const playerId = IdFactory.playerId();
                connection.playerId = playerId;
                connection.playerName = msg.name;
                
                this.sendTo(sessionId, {
                    type: 'identified',
                    playerId,
                    name: msg.name,
                });
                
                this.eventHandlers.onPlayerIdentified?.(sessionId, playerId, msg.name);
                break;
            }

            case 'room_list': {
                this.eventHandlers.onRoomListRequested?.(sessionId);
                break;
            }

            case 'room_create': {
                const msg = data as RoomCreateMessage;
                this.eventHandlers.onRoomCreate?.(sessionId, msg);
                break;
            }

            case 'room_join': {
                const msg = data as RoomJoinMessage;
                this.eventHandlers.onRoomJoin?.(sessionId, msg.roomId);
                break;
            }

            case 'room_leave': {
                this.eventHandlers.onRoomLeave?.(sessionId);
                break;
            }

            case 'room_ready': {
                const msg = data as RoomReadyMessage;
                connection.isReady = msg.ready;
                this.eventHandlers.onRoomReady?.(sessionId, msg.ready);
                break;
            }

            case 'room_start': {
                this.eventHandlers.onRoomStart?.(sessionId);
                break;
            }

            default: {
                // Treat as prompt response
                const promptData = data as PromptResponseMessage;
                const resolver = this.promptResolvers.get(sessionId);
                if (resolver) {
                    this.promptResolvers.delete(sessionId);
                    resolver({
                        value: promptData.value,
                        cancel: promptData.cancel ?? false,
                    });
                }
                break;
            }
        }
    }

    // ========================================================================
    // Connection Management
    // ========================================================================

    getConnection(sessionId: SessionId): ClientConnection | undefined {
        return this.connections.get(sessionId);
    }

    getConnectionByPlayerId(playerId: PlayerId): ClientConnection | undefined {
        for (const connection of this.connections.values()) {
            if (connection.playerId === playerId) {
                return connection;
            }
        }
        return undefined;
    }

    getConnectionsInRoom(roomId: RoomId): ClientConnection[] {
        const result: ClientConnection[] = [];
        for (const connection of this.connections.values()) {
            if (connection.roomId === roomId) {
                result.push(connection);
            }
        }
        return result;
    }

    setConnectionRoom(sessionId: SessionId, roomId: RoomId | undefined): void {
        const connection = this.connections.get(sessionId);
        if (connection) {
            connection.roomId = roomId;
            connection.isReady = false;
        }
    }

    setConnectionReady(sessionId: SessionId, ready: boolean): void {
        const connection = this.connections.get(sessionId);
        if (connection) {
            connection.isReady = ready;
        }
    }

    // ========================================================================
    // Sending Messages
    // ========================================================================

    sendTo(sessionId: SessionId, message: ServerMessage): void {
        const connection = this.connections.get(sessionId);
        if (connection?.ws) {
            connection.ws.send(JSON.stringify(message));
        }
    }

    sendToPlayer(playerId: PlayerId, message: ServerMessage): void {
        const connection = this.getConnectionByPlayerId(playerId);
        if (connection) {
            this.sendTo(connection.sessionId, message);
        }
    }

    broadcastToRoom(roomId: RoomId, message: ServerMessage): void {
        const connections = this.getConnectionsInRoom(roomId);
        const json = JSON.stringify(message);
        for (const connection of connections) {
            connection.ws.send(json);
        }
    }

    broadcastToAll(message: ServerMessage): void {
        const json = JSON.stringify(message);
        for (const connection of this.connections.values()) {
            connection.ws.send(json);
        }
    }

    // ========================================================================
    // Room Info Helpers
    // ========================================================================

    sendRoomList(sessionId: SessionId, rooms: RoomInfo[]): void {
        this.sendTo(sessionId, {
            type: 'room_list',
            rooms,
        });
    }

    sendRoomJoined(sessionId: SessionId, room: RoomInfo, isHost: boolean): void {
        this.sendTo(sessionId, {
            type: 'room_joined',
            room,
            isHost,
        });
    }

    sendRoomPlayers(roomId: RoomId, players: RoomPlayerInfo[]): void {
        this.broadcastToRoom(roomId, {
            type: 'room_players',
            players,
        });
    }

    sendRoomError(sessionId: SessionId, error: string): void {
        this.sendTo(sessionId, {
            type: 'room_error',
            error,
        });
    }

    sendGameStarting(roomId: RoomId): void {
        this.broadcastToRoom(roomId, {
            type: 'game_starting',
        });
    }

    // ========================================================================
    // Game-Specific Methods (for room adapters)
    // ========================================================================

    /**
     * Create a room-specific IOAdapter for game interactions
     */
    createRoomAdapter(roomId: RoomId): RoomIOAdapter {
        return new RoomIOAdapter(this, roomId);
    }

    /**
     * Send a prompt to a specific player and wait for response
     */
    async promptPlayer<T>(
        playerId: PlayerId,
        promptMessage: ServerMessage
    ): Promise<{ value?: T; cancelled: boolean }> {
        const connection = this.getConnectionByPlayerId(playerId);
        if (!connection) {
            return { cancelled: true };
        }

        this.sendTo(connection.sessionId, promptMessage);

        return new Promise((resolve) => {
            this.promptResolvers.set(connection.sessionId, (input) => {
                resolve({
                    value: input.value as T,
                    cancelled: input.cancel ?? false,
                });
            });
        });
    }
}

// ============================================================================
// Room-Specific IO Adapter
// ============================================================================

/**
 * An IOAdapter that sends prompts to specific players in a room
 * and broadcasts game state to all room members.
 */
export class RoomIOAdapter implements IOAdapter {
    readonly name = 'room';
    private adapter: MultiplayerAdapter;
    private roomId: RoomId;
    private currentPlayerId?: PlayerId;

    constructor(adapter: MultiplayerAdapter, roomId: RoomId) {
        this.adapter = adapter;
        this.roomId = roomId;
    }

    /**
     * Set the current player who will receive prompts
     */
    setCurrentPlayer(playerId: PlayerId): void {
        this.currentPlayerId = playerId;
    }

    // Lifecycle (no-op for room adapter)
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}

    // ========================================================================
    // Output - Messages (broadcast to room)
    // ========================================================================

    async intro(message: string): Promise<void> {
        this.adapter.broadcastToRoom(this.roomId, { type: 'intro', message });
    }

    async outro(message: string): Promise<void> {
        this.adapter.broadcastToRoom(this.roomId, { type: 'outro', message });
    }

    async log(level: LogLevel, message: string): Promise<void> {
        this.adapter.broadcastToRoom(this.roomId, { type: 'log', level, message });
    }

    async note(content: string, title?: string): Promise<void> {
        this.adapter.broadcastToRoom(this.roomId, { type: 'note', title, content });
    }

    async gameState(state: GameState): Promise<void> {
        this.adapter.broadcastToRoom(this.roomId, { type: 'game_state', ...state });
    }

    // ========================================================================
    // Output - Spinner (broadcast to room)
    // ========================================================================

    spinner(): SpinnerController {
        const adapter = this.adapter;
        const roomId = this.roomId;

        return {
            start(message?: string) {
                adapter.broadcastToRoom(roomId, { type: 'spinner', action: 'start', message });
            },
            stop(message?: string) {
                adapter.broadcastToRoom(roomId, { type: 'spinner', action: 'stop', message });
            },
            message(message: string) {
                adapter.broadcastToRoom(roomId, { type: 'spinner', action: 'message', message });
            },
        };
    }

    // ========================================================================
    // Input - Prompts (to current player only)
    // ========================================================================

    async text(options: TextPromptOptions): Promise<PromptResult<string>> {
        if (!this.currentPlayerId) {
            return { cancelled: true };
        }

        const result = await this.adapter.promptPlayer<string>(this.currentPlayerId, {
            type: 'prompt',
            promptType: 'text',
            message: options.message,
            placeholder: options.placeholder,
            defaultValue: options.defaultValue,
        });

        if (result.cancelled) {
            return { cancelled: true };
        }

        const value = String(result.value ?? options.defaultValue ?? '');
        return { cancelled: false, value };
    }

    async select<T = string>(options: SelectPromptOptions<T>): Promise<PromptResult<T>> {
        if (!this.currentPlayerId) {
            return { cancelled: true };
        }

        const result = await this.adapter.promptPlayer<T>(this.currentPlayerId, {
            type: 'prompt',
            promptType: 'select',
            message: options.message,
            options: options.options,
        });

        if (result.cancelled) {
            return { cancelled: true };
        }

        // Find matching option
        const selectedValue = result.value;
        const option = options.options.find(opt => opt.value === selectedValue);
        
        if (option) {
            return { cancelled: false, value: option.value };
        }

        // Default to first option
        if (options.options.length > 0) {
            return { cancelled: false, value: options.options[0]!.value };
        }

        return { cancelled: true };
    }

    async confirm(options: ConfirmPromptOptions): Promise<PromptResult<boolean>> {
        if (!this.currentPlayerId) {
            return { cancelled: true };
        }

        const result = await this.adapter.promptPlayer<unknown>(this.currentPlayerId, {
            type: 'prompt',
            promptType: 'confirm',
            message: options.message,
            initialValue: options.initialValue,
        });

        if (result.cancelled) {
            return { cancelled: true };
        }

        // Parse boolean from various formats
        const value = result.value;
        let boolValue: boolean;

        if (typeof value === 'boolean') {
            boolValue = value;
        } else if (typeof value === 'string') {
            boolValue = ['true', 'yes', 'y', '1'].includes(value.toLowerCase());
        } else {
            boolValue = options.initialValue ?? false;
        }

        return { cancelled: false, value: boolValue };
    }
}

