import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Spade, Heart, Diamond, Club, Loader2 } from 'lucide-react';
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
            <Card className="w-full max-w-md bg-slate-900/80 border-white/10 backdrop-blur-sm overflow-hidden">
                {/* Decorative header */}
                <div className="h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                
                <CardContent className="py-12 text-center relative">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5 flex items-center justify-center gap-4">
                        <Spade className="size-24 text-white" />
                        <Heart className="size-24 text-rose-500" />
                        <Diamond className="size-24 text-rose-500" />
                        <Club className="size-24 text-white" />
                    </div>
                    
                    <div className="relative">
                        {/* Animated card icons */}
                        <div className="flex justify-center gap-3 mb-6">
                            <div className="size-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center animate-bounce [animation-delay:0ms]">
                                <Spade className="size-6 text-white" />
                            </div>
                            <div className="size-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center animate-bounce [animation-delay:100ms]">
                                <Heart className="size-6 text-rose-400" />
                            </div>
                            <div className="size-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center animate-bounce [animation-delay:200ms]">
                                <Diamond className="size-6 text-rose-400" />
                            </div>
                            <div className="size-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center animate-bounce [animation-delay:300ms]">
                                <Club className="size-6 text-white" />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Card Games
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Multiplayer card games for everyone
                        </p>
                        
                        {connectionState === 'connecting' ? (
                            <div className="flex items-center justify-center gap-2 text-amber-400">
                                <Loader2 className="size-4 animate-spin" />
                                <span>Connecting to server...</span>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground/70">
                                Use the connection panel above to connect
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute('/connect')({
    component: ConnectView,
});
