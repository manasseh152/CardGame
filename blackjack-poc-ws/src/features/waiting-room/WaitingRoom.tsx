import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Crown, 
    Check, 
    Clock, 
    Copy, 
    LogOut, 
    Play,
    Users,
    Lock,
    Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomInfo, RoomPlayerInfo } from '@/types';
import { toast } from 'sonner';

interface WaitingRoomProps {
    room: RoomInfo;
    players: RoomPlayerInfo[];
    currentPlayerId: string | null;
    isHost: boolean;
    isReady: boolean;
    onSetReady: (ready: boolean) => void;
    onStartGame: () => void;
    onLeaveRoom: () => void;
}

export function WaitingRoom({
    room,
    players,
    currentPlayerId,
    isHost,
    isReady,
    onSetReady,
    onStartGame,
    onLeaveRoom,
}: WaitingRoomProps) {
    const allPlayersReady = players.length > 0 && players.every(p => p.isReady);
    const canStart = isHost && allPlayersReady && players.length >= 1;

    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(room.id);
        toast.success('Room code copied to clipboard!');
    }, [room.id]);

    const handleToggleReady = useCallback(() => {
        onSetReady(!isReady);
    }, [isReady, onSetReady]);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Room Header */}
            <Card className="bg-slate-900/80 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {room.isPrivate ? (
                                    <Lock className="size-4 text-amber-400" />
                                ) : (
                                    <Unlock className="size-4 text-emerald-400" />
                                )}
                                <CardTitle className="text-xl text-white">
                                    {room.name}
                                </CardTitle>
                            </div>
                            <CardDescription className="flex items-center gap-2">
                                <Users className="size-3" />
                                {players.length}/{room.maxPlayers} players
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Room Code</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyCode}
                                className="gap-2 font-mono text-lg tracking-widest border-white/20 hover:bg-white/10"
                            >
                                {room.id}
                                <Copy className="size-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Players List */}
            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-sm">
                <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-base font-semibold">
                        Players
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {players.map((player) => {
                            const isMe = player.playerId === currentPlayerId;
                            
                            return (
                                <div
                                    key={player.playerId}
                                    className={cn(
                                        'flex items-center justify-between p-4 transition-colors',
                                        isMe && 'bg-emerald-500/5'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'size-10 rounded-full flex items-center justify-center text-lg font-bold',
                                            player.isReady 
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-slate-700 text-white/60'
                                        )}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'font-medium',
                                                    isMe ? 'text-emerald-400' : 'text-white'
                                                )}>
                                                    {player.name}
                                                    {isMe && <span className="text-muted-foreground ml-1">(you)</span>}
                                                </span>
                                                {player.isHost && (
                                                    <Badge className="gap-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                                                        <Crown className="size-3" />
                                                        Host
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {player.isReady ? (
                                            <Badge className="gap-1 bg-emerald-500/20 text-emerald-400">
                                                <Check className="size-3" />
                                                Ready
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 text-muted-foreground border-white/20">
                                                <Clock className="size-3" />
                                                Waiting
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    variant="outline"
                    onClick={onLeaveRoom}
                    className="gap-2 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
                >
                    <LogOut className="size-4" />
                    Leave Room
                </Button>
                
                <div className="flex-1" />
                
                <Button
                    onClick={handleToggleReady}
                    variant={isReady ? "outline" : "default"}
                    className={cn(
                        "gap-2",
                        isReady 
                            ? "border-amber-500/30 hover:bg-amber-500/20 text-amber-400"
                            : "bg-emerald-600 hover:bg-emerald-500"
                    )}
                >
                    {isReady ? (
                        <>
                            <Clock className="size-4" />
                            Cancel Ready
                        </>
                    ) : (
                        <>
                            <Check className="size-4" />
                            Ready
                        </>
                    )}
                </Button>

                {isHost && (
                    <Button
                        onClick={onStartGame}
                        disabled={!canStart}
                        className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
                    >
                        <Play className="size-4" />
                        Start Game
                    </Button>
                )}
            </div>

            {/* Status Message */}
            {!allPlayersReady && (
                <div className="text-center text-muted-foreground text-sm">
                    Waiting for all players to ready up...
                </div>
            )}
            {allPlayersReady && !isHost && (
                <div className="text-center text-emerald-400 text-sm">
                    All players ready! Waiting for host to start the game...
                </div>
            )}
            {allPlayersReady && isHost && (
                <div className="text-center text-amber-400 text-sm">
                    All players ready! You can start the game now.
                </div>
            )}
        </div>
    );
}

