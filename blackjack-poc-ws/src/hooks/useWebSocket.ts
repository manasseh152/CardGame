import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Message Types from Server
// ============================================================================

export interface ServerMessage {
    type: string;
    [key: string]: unknown;
}

export interface ConnectedMessage extends ServerMessage {
    type: 'connected';
    sessionId: string;
}

export interface IdentifiedMessage extends ServerMessage {
    type: 'identified';
    playerId: string;
    name: string;
}

export interface DisconnectedMessage extends ServerMessage {
    type: 'disconnected';
}

export interface IntroMessage extends ServerMessage {
    type: 'intro';
    message: string;
}

export interface OutroMessage extends ServerMessage {
    type: 'outro';
    message: string;
}

export interface LogMessage extends ServerMessage {
    type: 'log';
    level: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'message';
    message: string;
}

export interface NoteMessage extends ServerMessage {
    type: 'note';
    title?: string;
    content: string;
}

export interface SpinnerMessage extends ServerMessage {
    type: 'spinner';
    action: 'start' | 'stop' | 'message';
    message?: string;
}

export interface TextPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'text';
    message: string;
    placeholder?: string;
    defaultValue?: string;
}

export interface SelectPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'select';
    message: string;
    options: Array<{
        value: string;
        label: string;
        hint?: string;
    }>;
}

export interface ConfirmPromptMessage extends ServerMessage {
    type: 'prompt';
    promptType: 'confirm';
    message: string;
    initialValue?: boolean;
}

export interface ValidationErrorMessage extends ServerMessage {
    type: 'validation_error';
    message: string;
}

export interface WarningMessage extends ServerMessage {
    type: 'warning';
    message: string;
}

// ============================================================================
// Room Types
// ============================================================================

export interface RoomInfo {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    isPrivate: boolean;
    isPlaying: boolean;
}

export interface RoomPlayerInfo {
    playerId: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
}

export interface RoomListMessage extends ServerMessage {
    type: 'room_list';
    rooms: RoomInfo[];
}

export interface RoomJoinedMessage extends ServerMessage {
    type: 'room_joined';
    room: RoomInfo;
    isHost: boolean;
}

export interface RoomPlayersMessage extends ServerMessage {
    type: 'room_players';
    players: RoomPlayerInfo[];
}

export interface RoomLeftMessage extends ServerMessage {
    type: 'room_left';
}

export interface RoomErrorMessage extends ServerMessage {
    type: 'room_error';
    error: string;
}

export interface PlayerLeftMessage extends ServerMessage {
    type: 'player_left';
    playerId: string;
    playerName: string;
}

export interface RoomReadyToStartMessage extends ServerMessage {
    type: 'room_ready_to_start';
}

export interface GameStartingMessage extends ServerMessage {
    type: 'game_starting';
}

export interface GameEndedMessage extends ServerMessage {
    type: 'game_ended';
}

// ============================================================================
// Game State Types
// ============================================================================

export interface CardState {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
    hidden?: boolean;
}

export interface PlayerState {
    id: string;
    handId: string;
    name: string;
    hand: CardState[];
    handValue: number;
    bet: number;
    chips: number;
    status: 'playing' | 'stay' | 'bust' | 'blackjack';
    isDealer: boolean;
    isCurrent: boolean;
    splitHand?: PlayerState;
    parentPlayerId?: string;
}

export interface GameState {
    phase: 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'round-over';
    dealer: PlayerState;
    players: PlayerState[];
    message: string;
}

export interface GameStateMessage extends ServerMessage {
    type: 'game_state';
    phase: GameState['phase'];
    dealer: PlayerState;
    players: PlayerState[];
    message: string;
}

// ============================================================================
// Combined Types
// ============================================================================

export type PromptMessage = TextPromptMessage | SelectPromptMessage | ConfirmPromptMessage;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export type AppView = 'connecting' | 'identify' | 'lobby' | 'waiting-room' | 'playing';

export interface GameLogEntry {
    id: string;
    timestamp: Date;
    type: 'intro' | 'outro' | 'log' | 'note' | 'warning' | 'validation_error';
    level?: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'message';
    message: string;
    title?: string;
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseWebSocketReturn {
    // Connection state
    connectionState: ConnectionState;
    connect: (url: string) => void;
    disconnect: () => void;
    
    // Player identity
    sessionId: string | null;
    playerId: string | null;
    playerName: string | null;
    identify: (name: string) => void;
    
    // Room state
    currentRoom: RoomInfo | null;
    roomPlayers: RoomPlayerInfo[];
    isHost: boolean;
    isReady: boolean;
    availableRooms: RoomInfo[];
    
    // Room actions
    requestRoomList: () => void;
    createRoom: (options?: {
        name?: string;
        isPrivate?: boolean;
        maxPlayers?: number;
    }) => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    startGame: () => void;
    
    // Game state
    gameState: GameState | null;
    currentPrompt: PromptMessage | null;
    spinner: { active: boolean; message?: string };
    gameLog: GameLogEntry[];
    
    // Game actions
    sendResponse: (value: unknown) => void;
    sendCancel: () => void;
    clearLog: () => void;
    
    // Computed view state
    currentView: AppView;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebSocket(): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    
    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    
    // Identity state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);
    
    // Room state
    const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
    const [roomPlayers, setRoomPlayers] = useState<RoomPlayerInfo[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
    
    // Game state
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<PromptMessage | null>(null);
    const [spinner, setSpinner] = useState<{ active: boolean; message?: string }>({ active: false });
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const logIdRef = useRef(0);

    // ========================================================================
    // Logging
    // ========================================================================

    const addLogEntry = useCallback((
        type: GameLogEntry['type'],
        message: string,
        options?: { level?: GameLogEntry['level']; title?: string }
    ) => {
        const entry: GameLogEntry = {
            id: `log-${++logIdRef.current}`,
            timestamp: new Date(),
            type,
            message,
            level: options?.level,
            title: options?.title,
        };
        setGameLog(prev => [...prev, entry]);
    }, []);

    // ========================================================================
    // Message Handling
    // ========================================================================

    const handleMessage = useCallback((data: ServerMessage) => {
        switch (data.type) {
            case 'connected': {
                const msg = data as ConnectedMessage;
                setSessionId(msg.sessionId);
                addLogEntry('log', 'Connected to game server', { level: 'success' });
                break;
            }

            case 'identified': {
                const msg = data as IdentifiedMessage;
                setPlayerId(msg.playerId);
                setPlayerName(msg.name);
                addLogEntry('log', `Identified as ${msg.name}`, { level: 'success' });
                break;
            }

            case 'disconnected':
                addLogEntry('log', 'Disconnected from game server', { level: 'info' });
                break;

            case 'room_list': {
                const msg = data as RoomListMessage;
                setAvailableRooms(msg.rooms);
                break;
            }

            case 'room_joined': {
                const msg = data as RoomJoinedMessage;
                setCurrentRoom(msg.room);
                setIsHost(msg.isHost);
                setIsReady(false);
                addLogEntry('log', `Joined room: ${msg.room.name}`, { level: 'success' });
                break;
            }

            case 'room_players': {
                const msg = data as RoomPlayersMessage;
                setRoomPlayers(msg.players);
                // Update our ready state from the list
                const me = msg.players.find(p => p.playerId === playerId);
                if (me) {
                    setIsReady(me.isReady);
                    setIsHost(me.isHost);
                }
                break;
            }

            case 'room_left':
                setCurrentRoom(null);
                setRoomPlayers([]);
                setIsHost(false);
                setIsReady(false);
                setIsPlaying(false);
                setGameState(null);
                addLogEntry('log', 'Left room', { level: 'info' });
                break;

            case 'room_error': {
                const msg = data as RoomErrorMessage;
                addLogEntry('log', msg.error, { level: 'error' });
                break;
            }

            case 'player_left': {
                const msg = data as PlayerLeftMessage;
                addLogEntry('log', `${msg.playerName} has left the game`, { level: 'warn' });
                break;
            }

            case 'room_ready_to_start':
                addLogEntry('log', 'All players ready! Host can start the game.', { level: 'info' });
                break;

            case 'game_starting':
                setIsPlaying(true);
                addLogEntry('log', 'Game is starting!', { level: 'success' });
                break;

            case 'game_ended':
                setIsPlaying(false);
                setGameState(null);
                setCurrentPrompt(null);
                addLogEntry('log', 'Game ended', { level: 'info' });
                break;

            case 'intro':
                addLogEntry('intro', (data as IntroMessage).message);
                break;

            case 'outro':
                addLogEntry('outro', (data as OutroMessage).message);
                break;

            case 'log': {
                const logMsg = data as LogMessage;
                addLogEntry('log', logMsg.message, { level: logMsg.level });
                break;
            }

            case 'note': {
                const noteMsg = data as NoteMessage;
                addLogEntry('note', noteMsg.content, { title: noteMsg.title });
                break;
            }

            case 'spinner': {
                const spinnerMsg = data as SpinnerMessage;
                if (spinnerMsg.action === 'start') {
                    setSpinner({ active: true, message: spinnerMsg.message });
                } else if (spinnerMsg.action === 'stop') {
                    setSpinner({ active: false, message: spinnerMsg.message });
                } else if (spinnerMsg.action === 'message') {
                    setSpinner(prev => ({ ...prev, message: spinnerMsg.message }));
                }
                break;
            }

            case 'prompt':
                setCurrentPrompt(data as PromptMessage);
                break;

            case 'validation_error':
                addLogEntry('validation_error', (data as ValidationErrorMessage).message);
                break;

            case 'warning':
                addLogEntry('warning', (data as WarningMessage).message);
                break;

            case 'game_state': {
                const stateMsg = data as GameStateMessage;
                setGameState({
                    phase: stateMsg.phase,
                    dealer: stateMsg.dealer,
                    players: stateMsg.players,
                    message: stateMsg.message,
                });
                break;
            }

            default:
                console.log('Unknown message type:', data);
        }
    }, [addLogEntry, playerId]);

    // ========================================================================
    // Connection Management
    // ========================================================================

    const connect = useCallback((url: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Reset state
        setSessionId(null);
        setPlayerId(null);
        setPlayerName(null);
        setCurrentRoom(null);
        setRoomPlayers([]);
        setIsHost(false);
        setIsReady(false);
        setAvailableRooms([]);
        setGameState(null);
        setCurrentPrompt(null);
        setIsPlaying(false);

        setConnectionState('connecting');

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionState('connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ServerMessage;
                handleMessage(data);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        };

        ws.onclose = () => {
            setConnectionState('disconnected');
            wsRef.current = null;
            setSessionId(null);
            setPlayerId(null);
            setPlayerName(null);
            setCurrentRoom(null);
            setRoomPlayers([]);
            setIsHost(false);
            setIsReady(false);
            setAvailableRooms([]);
            setGameState(null);
            setCurrentPrompt(null);
            setSpinner({ active: false });
            setIsPlaying(false);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            addLogEntry('log', 'Connection error occurred', { level: 'error' });
        };
    }, [handleMessage, addLogEntry]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // ========================================================================
    // Send Helpers
    // ========================================================================

    const send = useCallback((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    // ========================================================================
    // Identity Actions
    // ========================================================================

    const identify = useCallback((name: string) => {
        send({ type: 'identify', name });
    }, [send]);

    // ========================================================================
    // Room Actions
    // ========================================================================

    const requestRoomList = useCallback(() => {
        send({ type: 'room_list' });
    }, [send]);

    const createRoom = useCallback((options?: {
        name?: string;
        isPrivate?: boolean;
        maxPlayers?: number;
    }) => {
        send({ 
            type: 'room_create',
            ...options,
        });
    }, [send]);

    const joinRoom = useCallback((roomId: string) => {
        send({ type: 'room_join', roomId });
    }, [send]);

    const leaveRoom = useCallback(() => {
        send({ type: 'room_leave' });
    }, [send]);

    const setReady = useCallback((ready: boolean) => {
        send({ type: 'room_ready', ready });
        setIsReady(ready);
    }, [send]);

    const startGame = useCallback(() => {
        send({ type: 'room_start' });
    }, [send]);

    // ========================================================================
    // Game Actions
    // ========================================================================

    const sendResponse = useCallback((value: unknown) => {
        send({ value });
        setCurrentPrompt(null);
    }, [send]);

    const sendCancel = useCallback(() => {
        send({ cancel: true });
        setCurrentPrompt(null);
    }, [send]);

    const clearLog = useCallback(() => {
        setGameLog([]);
    }, []);

    // ========================================================================
    // Cleanup
    // ========================================================================

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // ========================================================================
    // Computed View State
    // ========================================================================

    const currentView: AppView = (() => {
        if (connectionState !== 'connected') {
            return 'connecting';
        }
        if (!playerName) {
            return 'identify';
        }
        if (!currentRoom) {
            return 'lobby';
        }
        if (isPlaying) {
            return 'playing';
        }
        return 'waiting-room';
    })();

    // ========================================================================
    // Return
    // ========================================================================

    return {
        // Connection
        connectionState,
        connect,
        disconnect,
        
        // Identity
        sessionId,
        playerId,
        playerName,
        identify,
        
        // Room
        currentRoom,
        roomPlayers,
        isHost,
        isReady,
        availableRooms,
        
        // Room actions
        requestRoomList,
        createRoom,
        joinRoom,
        leaveRoom,
        setReady,
        startGame,
        
        // Game
        gameState,
        currentPrompt,
        spinner,
        gameLog,
        
        // Game actions
        sendResponse,
        sendCancel,
        clearLog,
        
        // View
        currentView,
    };
}
