import { useCallback, useState } from 'react';
import type { RoomInfo, RoomPlayerInfo, RoomJoinedMessage, RoomPlayersMessage, GameMetadata, GameType } from '@/types';

export interface UseRoomReturn {
    currentRoom: RoomInfo | null;
    roomPlayers: RoomPlayerInfo[];
    isHost: boolean;
    isReady: boolean;
    availableRooms: RoomInfo[];
    availableGames: GameMetadata[];
    requestRoomList: () => void;
    requestGameList: () => void;
    createRoom: (options?: {
        name?: string;
        isPrivate?: boolean;
        maxPlayers?: number;
        gameType?: GameType;
    }) => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    startGame: () => void;
    reset: () => void;
}

export function useRoom(
    send: (message: object) => void,
    playerId: string | null
): UseRoomReturn {
    const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
    const [roomPlayers, setRoomPlayers] = useState<RoomPlayerInfo[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
    const [availableGames, setAvailableGames] = useState<GameMetadata[]>([]);

    const requestRoomList = useCallback(() => {
        send({ type: 'room_list' });
    }, [send]);

    const requestGameList = useCallback(() => {
        send({ type: 'game_list' });
    }, [send]);

    const createRoom = useCallback((options?: {
        name?: string;
        isPrivate?: boolean;
        maxPlayers?: number;
        gameType?: GameType;
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

    const reset = useCallback(() => {
        setCurrentRoom(null);
        setRoomPlayers([]);
        setIsHost(false);
        setIsReady(false);
        setAvailableRooms([]);
        // Note: we don't reset availableGames as they're static
    }, []);

    const handleRoomJoined = useCallback((msg: RoomJoinedMessage) => {
        setCurrentRoom(msg.room);
        setIsHost(msg.isHost);
        setIsReady(false);
    }, []);

    const handleRoomPlayers = useCallback((msg: RoomPlayersMessage) => {
        setRoomPlayers(msg.players);
        const me = msg.players.find(p => p.playerId === playerId);
        if (me) {
            setIsReady(me.isReady);
            setIsHost(me.isHost);
        }
    }, [playerId]);

    return {
        currentRoom,
        roomPlayers,
        isHost,
        isReady,
        availableRooms,
        availableGames,
        requestRoomList,
        requestGameList,
        createRoom,
        joinRoom,
        leaveRoom,
        setReady,
        startGame,
        reset,
        // Internal handlers
        _handleRoomJoined: handleRoomJoined,
        _handleRoomPlayers: handleRoomPlayers,
        _setAvailableRooms: setAvailableRooms,
        _setAvailableGames: setAvailableGames,
    } as UseRoomReturn & {
        _handleRoomJoined: (msg: RoomJoinedMessage) => void;
        _handleRoomPlayers: (msg: RoomPlayersMessage) => void;
        _setAvailableRooms: (rooms: RoomInfo[]) => void;
        _setAvailableGames: (games: GameMetadata[]) => void;
    };
}

