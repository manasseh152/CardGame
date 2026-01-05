import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpinnerOverlay } from '@/components/SpinnerOverlay';
import { GameTable, EmptyTable, PromptPanel } from '@/features/game';
import { useWebSocketContext } from '@/context';
import { LogOut, Users } from 'lucide-react';

function GameRoute() {
    const { roomId } = Route.useParams();
    const {
        connectionState,
        playerName,
        currentRoom,
        currentView,
        gameState,
        currentPrompt,
        spinner,
        sendResponse,
        sendCancel,
        leaveRoom,
        availableGames,
        requestGameList,
    } = useWebSocketContext();

    const isConnected = connectionState === 'connected';
    
    // Get game metadata
    const gameInfo = currentRoom?.gameType 
        ? availableGames.find(g => g.type === currentRoom.gameType) 
        : null;
    const gameIcon = gameInfo?.icon || '🎮';

    // Fetch game list if not loaded
    useEffect(() => {
        if (isConnected && availableGames.length === 0) {
            requestGameList();
        }
    }, [isConnected, availableGames.length, requestGameList]);

    // Guard: redirect if not connected
    if (connectionState !== 'connected') {
        return <Navigate to="/connect" replace />;
    }

    // Guard: redirect if not identified
    if (!playerName) {
        return <Navigate to="/identify" replace />;
    }

    // Guard: redirect if not in a room
    if (!currentRoom) {
        return <Navigate to="/rooms" replace />;
    }

    // Guard: redirect to waiting room if not playing
    if (currentView === 'waiting-room' && currentRoom.id === roomId) {
        return <Navigate to="/rooms/$roomId" params={{ roomId }} replace />;
    }

    // Guard: redirect to correct room if in different room
    if (currentRoom.id !== roomId) {
        return <Navigate to="/rooms/$roomId/game" params={{ roomId: currentRoom.id }} replace />;
    }

    // If no room or wrong room, show loading
    if (!currentRoom || currentRoom.id !== roomId) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-4xl mb-3">🎮</div>
                    <p className="text-muted-foreground">
                        Looking for game in room {roomId}...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Game Table Panel */}
            <Card className="lg:col-span-3 bg-slate-900/60 border-white/10 backdrop-blur-sm overflow-hidden flex flex-col">
                <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-3">
                        <span className={`size-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-xl">{gameIcon}</span>
                        {gameInfo ? (
                            <span className="text-white">{gameInfo.name}</span>
                        ) : (
                            <span className="text-white">Game Table</span>
                        )}
                        {currentRoom && (
                            <>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="text-muted-foreground font-normal text-sm">
                                    {currentRoom.name}
                                </span>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 min-h-[500px]">
                    {gameState ? (
                        <GameTable gameState={gameState} className="h-full" />
                    ) : (
                        <EmptyTable className="h-full" />
                    )}
                </CardContent>
            </Card>

            {/* Control Panel */}
            <div className="flex flex-col gap-4">
                {/* Room Info */}
                <Card className="bg-slate-900/60 border-white/10 backdrop-blur-sm">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-xl">
                                {gameIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-white truncate">
                                    {currentRoom.name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="size-3" />
                                    <span>{gameState?.players.length || 0} players</span>
                                    <span className="font-mono text-[10px] text-muted-foreground/60">
                                        {currentRoom.id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Prompt Card */}
                <Card className="bg-slate-900/60 border-white/10 backdrop-blur-sm">
                    <CardHeader className="border-b border-white/10 py-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Your Turn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <PromptPanel
                            prompt={currentPrompt}
                            onSubmit={sendResponse}
                            onCancel={sendCancel}
                        />
                    </CardContent>
                </Card>

                {/* Spinner Status */}
                <SpinnerOverlay 
                    active={spinner.active} 
                    message={spinner.message} 
                />

                {/* Game Stats Card */}
                {gameState && gameState.players.length > 0 && (
                    <Card className="bg-slate-900/40 border-white/5 backdrop-blur-sm mt-auto">
                        <CardContent className="py-4">
                            <div className="space-y-3">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Player Stats
                                </div>
                                {gameState.players.map((player) => (
                                    <div key={player.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-white/80">{player.name}</span>
                                            {player.isCurrent && (
                                                <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-400/30">
                                                    Playing
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-amber-400">${player.chips}</span>
                                            {player.bet > 0 && (
                                                <span className="text-xs text-emerald-400">+${player.bet}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Leave Room Button */}
                {currentRoom && (
                    <button
                        onClick={leaveRoom}
                        className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors text-center py-2"
                    >
                        <LogOut className="size-3" />
                        Leave Room
                    </button>
                )}
            </div>
        </div>
    );
}

export const Route = createFileRoute('/rooms/$roomId/game')({
    component: GameRoute,
});
