import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { useWebSocketContext } from '@/context';

function ConnectView() {
    const { connectionState, playerName, currentRoom } = useWebSocketContext();

    // Redirect if already connected
    if (connectionState === 'connected') {
        if (currentRoom) {
            return <Navigate to="/rooms/$roomId" params={{ roomId: currentRoom.id }} replace />;
        }
        if (playerName) {
            return <Navigate to="/rooms" replace />;
        }
        return <Navigate to="/identify" replace />;
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md bg-slate-900/80 border-white/10 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">🎰</div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Connect to Server
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        Enter the server URL and click Connect to join a game
                    </p>
                    {connectionState === 'connecting' && (
                        <p className="text-amber-400 animate-pulse">
                            Connecting...
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute('/connect')({
    component: ConnectView,
});
