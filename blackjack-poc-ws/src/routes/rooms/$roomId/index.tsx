import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { WaitingRoom } from '@/features/waiting-room';
import { useWebSocketContext } from '@/context';

function WaitingRoomRoute() {
    const { roomId } = Route.useParams();
    const {
        connectionState,
        playerName,
        currentRoom,
        roomPlayers,
        playerId,
        isHost,
        isReady,
        setReady,
        startGame,
        leaveRoom,
        joinRoom,
        currentView,
    } = useWebSocketContext();

    // Track if we've attempted to join
    const [joinAttempted, setJoinAttempted] = useState(false);

    // Try to join room if not already in it (deep linking support)
    useEffect(() => {
        if (connectionState === 'connected' && playerName && !currentRoom && !joinAttempted) {
            setJoinAttempted(true);
            joinRoom(roomId);
        }
    }, [connectionState, playerName, currentRoom, roomId, joinRoom, joinAttempted]);

    // Guard: redirect if not connected
    if (connectionState !== 'connected') {
        return <Navigate to="/connect" replace />;
    }

    // Guard: redirect if not identified
    if (!playerName) {
        return <Navigate to="/identify" replace />;
    }

    // Guard: redirect to game if playing
    if (currentView === 'playing' && currentRoom?.id === roomId) {
        return <Navigate to="/rooms/$roomId/game" params={{ roomId }} replace />;
    }

    // Guard: redirect to correct room if in different room
    if (currentRoom && currentRoom.id !== roomId) {
        return <Navigate to="/rooms/$roomId" params={{ roomId: currentRoom.id }} replace />;
    }

    // If no room and join attempted, show loading or go to lobby
    if (!currentRoom) {
        if (!joinAttempted) {
            return (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-muted-foreground">
                            Looking for room {roomId}...
                        </p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-muted-foreground">
                        Joining room {roomId}...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <WaitingRoom
            room={currentRoom}
            players={roomPlayers}
            currentPlayerId={playerId}
            isHost={isHost}
            isReady={isReady}
            onSetReady={setReady}
            onStartGame={startGame}
            onLeaveRoom={leaveRoom}
        />
    );
}

export const Route = createFileRoute('/rooms/$roomId/')({
    component: WaitingRoomRoute,
});
