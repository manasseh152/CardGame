import { createFileRoute, Navigate } from '@tanstack/react-router';
import { LobbyView } from '@/features/lobby';
import { useWebSocketContext } from '@/context';

function RoomsRoute() {
    const {
        connectionState,
        playerName,
        currentRoom,
        availableRooms,
        availableGames,
        requestRoomList,
        requestGameList,
        createRoom,
        joinRoom,
    } = useWebSocketContext();

    // Guard: redirect if not connected
    if (connectionState !== 'connected') {
        return <Navigate to="/connect" replace />;
    }

    // Guard: redirect if not identified
    if (!playerName) {
        return <Navigate to="/identify" replace />;
    }

    // Guard: redirect if already in a room
    if (currentRoom) {
        return <Navigate to="/rooms/$roomId" params={{ roomId: currentRoom.id }} replace />;
    }

    return (
        <LobbyView
            playerName={playerName}
            availableRooms={availableRooms}
            availableGames={availableGames}
            onRequestRoomList={requestRoomList}
            onRequestGameList={requestGameList}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
        />
    );
}

export const Route = createFileRoute('/rooms/')({
    component: RoomsRoute,
});
