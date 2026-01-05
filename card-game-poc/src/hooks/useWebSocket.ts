import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdentity } from './useIdentity';
import { useRoom } from './useRoom';
import { useGame } from './useGame';
import { useGameLog } from './useGameLog';
import { useConnection } from './useConnection';
import type {
    ServerMessage,
    ConnectedMessage,
    IdentifiedMessage,
    RoomListMessage,
    RoomJoinedMessage,
    RoomPlayersMessage,
    RoomLeftMessage,
    RoomErrorMessage,
    PlayerLeftMessage,
    RoomReadyToStartMessage,
    GameStartingMessage,
    GameEndedMessage,
    GameListMessage,
    IntroMessage,
    OutroMessage,
    LogMessage,
    NoteMessage,
    SpinnerMessage,
    PromptMessage,
    ValidationErrorMessage,
    WarningMessage,
    GameStateMessage,
    AppView,
} from '@/types';

export interface UseWebSocketReturn {
    // Connection
    connectionState: ReturnType<typeof useConnection>['connectionState'];
    connect: ReturnType<typeof useConnection>['connect'];
    disconnect: ReturnType<typeof useConnection>['disconnect'];
    
    // Identity
    sessionId: string | null;
    playerId: string | null;
    playerName: string | null;
    identify: (name: string) => void;
    
    // Room
    currentRoom: ReturnType<typeof useRoom>['currentRoom'];
    roomPlayers: ReturnType<typeof useRoom>['roomPlayers'];
    isHost: boolean;
    isReady: boolean;
    availableRooms: ReturnType<typeof useRoom>['availableRooms'];
    availableGames: ReturnType<typeof useRoom>['availableGames'];
    
    // Room actions
    requestRoomList: () => void;
    requestGameList: () => void;
    createRoom: ReturnType<typeof useRoom>['createRoom'];
    joinRoom: ReturnType<typeof useRoom>['joinRoom'];
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    startGame: () => void;
    
    // Game
    gameState: ReturnType<typeof useGame>['gameState'];
    currentPrompt: ReturnType<typeof useGame>['currentPrompt'];
    spinner: ReturnType<typeof useGame>['spinner'];
    gameLog: ReturnType<typeof useGameLog>['gameLog'];
    
    // Game actions
    sendResponse: ReturnType<typeof useGame>['sendResponse'];
    sendCancel: ReturnType<typeof useGame>['sendCancel'];
    clearLog: () => void;
    
    // View
    currentView: AppView;
}

export function useWebSocket(): UseWebSocketReturn {
    const [isPlaying, setIsPlaying] = useState(false);

    // Initialize feature hooks
    const gameLog = useGameLog();
    
    // Create a ref to store send function before connection is ready
    const sendRef = useRef<(message: object) => void>(() => {});
    
    // Initialize hooks that need send function
    const identity = useIdentity((msg) => sendRef.current(msg));
    const room = useRoom((msg) => sendRef.current(msg), identity.playerId);
    const game = useGame((msg) => sendRef.current(msg));

    // Create message handler that uses the hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleMessage = useCallback((data: ServerMessage) => {
        switch (data.type) {
            case 'connected': {
                const msg = data as ConnectedMessage;
                identity._setSessionId(msg.sessionId);
                gameLog.addLogEntry('log', 'Connected to game server', { level: 'success' });
                break;
            }

            case 'identified': {
                const msg = data as IdentifiedMessage;
                identity._handleIdentified(msg);
                gameLog.addLogEntry('log', `Identified as ${msg.name}`, { level: 'success' });
                break;
            }

            case 'disconnected':
                gameLog.addLogEntry('log', 'Disconnected from game server', { level: 'info' });
                break;

            case 'room_list': {
                const msg = data as RoomListMessage;
                room._setAvailableRooms(msg.rooms);
                break;
            }

            case 'game_list': {
                const msg = data as GameListMessage;
                room._setAvailableGames(msg.games);
                break;
            }

            case 'room_joined': {
                const msg = data as RoomJoinedMessage;
                room._handleRoomJoined(msg);
                gameLog.addLogEntry('log', `Joined room: ${msg.room.name}`, { level: 'success' });
                break;
            }

            case 'room_players': {
                const msg = data as RoomPlayersMessage;
                room._handleRoomPlayers(msg);
                break;
            }

            case 'room_left':
                room.reset();
                setIsPlaying(false);
                game.reset();
                gameLog.addLogEntry('log', 'Left room', { level: 'info' });
                break;

            case 'room_error': {
                const msg = data as RoomErrorMessage;
                gameLog.addLogEntry('log', msg.error, { level: 'error' });
                break;
            }

            case 'player_left': {
                const msg = data as PlayerLeftMessage;
                gameLog.addLogEntry('log', `${msg.playerName} has left the game`, { level: 'warn' });
                break;
            }

            case 'room_ready_to_start':
                gameLog.addLogEntry('log', 'All players ready! Host can start the game.', { level: 'info' });
                break;

            case 'game_starting':
                setIsPlaying(true);
                gameLog.addLogEntry('log', 'Game is starting!', { level: 'success' });
                break;

            case 'game_ended':
                setIsPlaying(false);
                game.reset();
                gameLog.addLogEntry('log', 'Game ended', { level: 'info' });
                break;

            case 'intro':
                gameLog.addLogEntry('intro', (data as IntroMessage).message);
                break;

            case 'outro':
                gameLog.addLogEntry('outro', (data as OutroMessage).message);
                break;

            case 'log': {
                const logMsg = data as LogMessage;
                gameLog.addLogEntry('log', logMsg.message, { level: logMsg.level });
                break;
            }

            case 'note': {
                const noteMsg = data as NoteMessage;
                gameLog.addLogEntry('note', noteMsg.content, { title: noteMsg.title });
                break;
            }

            case 'spinner': {
                const spinnerMsg = data as SpinnerMessage;
                if (spinnerMsg.action === 'start') {
                    game._setSpinner({ active: true, message: spinnerMsg.message });
                } else if (spinnerMsg.action === 'stop') {
                    game._setSpinner({ active: false, message: spinnerMsg.message });
                } else if (spinnerMsg.action === 'message') {
                    game._setSpinner(prev => ({ ...prev, message: spinnerMsg.message }));
                }
                break;
            }

            case 'prompt':
                game._setCurrentPrompt(data as PromptMessage);
                break;

            case 'validation_error':
                gameLog.addLogEntry('validation_error', (data as ValidationErrorMessage).message);
                break;

            case 'warning':
                gameLog.addLogEntry('warning', (data as WarningMessage).message);
                break;

            case 'game_state': {
                const stateMsg = data as GameStateMessage;
                game._handleGameState(stateMsg);
                break;
            }

            default:
                console.log('Unknown message type:', data);
        }
    }, [identity, room, game, gameLog]);

    // Create connection hook with message handler
    const connection = useConnection(handleMessage);
    
    // Update send ref when connection is ready
    useEffect(() => {
        sendRef.current = connection.send;
    }, [connection.send]);

    // Reset state on disconnect
    const identityReset = identity.reset;
    const roomReset = room.reset;
    const gameReset = game.reset;
    
    useEffect(() => {
        if (connection.connectionState === 'disconnected') {
            identityReset();
            roomReset();
            gameReset();
            setIsPlaying(false);
        }
    }, [connection.connectionState, identityReset, roomReset, gameReset]);

    // Computed view state
    const currentView: AppView = (() => {
        if (connection.connectionState !== 'connected') {
            return 'connecting';
        }
        if (!identity.playerName) {
            return 'identify';
        }
        if (!room.currentRoom) {
            return 'lobby';
        }
        if (isPlaying) {
            return 'playing';
        }
        return 'waiting-room';
    })();

    return {
        // Connection
        connectionState: connection.connectionState,
        connect: connection.connect,
        disconnect: connection.disconnect,
        
        // Identity
        sessionId: identity.sessionId,
        playerId: identity.playerId,
        playerName: identity.playerName,
        identify: identity.identify,
        
        // Room
        currentRoom: room.currentRoom,
        roomPlayers: room.roomPlayers,
        isHost: room.isHost,
        isReady: room.isReady,
        availableRooms: room.availableRooms,
        availableGames: room.availableGames,
        
        // Room actions
        requestRoomList: room.requestRoomList,
        requestGameList: room.requestGameList,
        createRoom: room.createRoom,
        joinRoom: room.joinRoom,
        leaveRoom: room.leaveRoom,
        setReady: room.setReady,
        startGame: room.startGame,
        
        // Game
        gameState: game.gameState,
        currentPrompt: game.currentPrompt,
        spinner: game.spinner,
        gameLog: gameLog.gameLog,
        
        // Game actions
        sendResponse: game.sendResponse,
        sendCancel: game.sendCancel,
        clearLog: gameLog.clearLog,
        
        // View
        currentView,
    };
}

// Re-export types for backward compatibility
export type {
    ConnectionState,
    AppView,
    RoomInfo,
    RoomPlayerInfo,
    GameState,
    PlayerState,
    CardState,
    PromptMessage,
    GameLogEntry,
    GameMetadata,
    GameCategory,
    GameType,
} from '@/types';
