import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Plus, 
    Hash, 
    Users, 
    RefreshCw, 
    Lock, 
    Unlock, 
    Play,
} from 'lucide-react';
import type { RoomInfo } from '@/types';

interface LobbyViewProps {
    playerName: string;
    availableRooms: RoomInfo[];
    onRequestRoomList: () => void;
    onCreateRoom: (options: { name?: string; isPrivate?: boolean; maxPlayers?: number }) => void;
    onJoinRoom: (roomId: string) => void;
}

export function LobbyView({
    playerName,
    availableRooms,
    onRequestRoomList,
    onCreateRoom,
    onJoinRoom,
}: LobbyViewProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Create room form state
    const [roomName, setRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(6);
    
    // Join room form state
    const [roomCode, setRoomCode] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);

    // Auto-refresh room list
    useEffect(() => {
        onRequestRoomList();
        const interval = setInterval(onRequestRoomList, 5000);
        return () => clearInterval(interval);
    }, [onRequestRoomList]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        onRequestRoomList();
        setTimeout(() => setIsRefreshing(false), 500);
    }, [onRequestRoomList]);

    const handleCreateRoom = useCallback(() => {
        onCreateRoom({
            name: roomName || undefined,
            isPrivate,
            maxPlayers,
        });
        setIsCreateDialogOpen(false);
        setRoomName('');
        setIsPrivate(false);
        setMaxPlayers(6);
    }, [roomName, isPrivate, maxPlayers, onCreateRoom]);

    const handleJoinByCode = useCallback(() => {
        const code = roomCode.trim().toUpperCase();
        if (code.length !== 6) {
            setJoinError('Room code must be 6 characters');
            return;
        }
        setJoinError(null);
        onJoinRoom(code);
        setIsJoinDialogOpen(false);
        setRoomCode('');
    }, [roomCode, onJoinRoom]);

    const handleQuickJoin = useCallback((roomId: string) => {
        onJoinRoom(roomId);
    }, [onJoinRoom]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Welcome, {playerName}!
                    </h2>
                    <p className="text-muted-foreground">
                        Join a room or create your own
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsJoinDialogOpen(true)}
                        variant="outline"
                        className="gap-2 border-white/20 hover:bg-white/10"
                    >
                        <Hash className="size-4" />
                        Join by Code
                    </Button>
                    <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                        <Plus className="size-4" />
                        Create Room
                    </Button>
                </div>
            </div>

            {/* Room List */}
            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-sm">
                <CardHeader className="border-b border-white/10 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Public Rooms
                            </CardTitle>
                            <CardDescription>
                                {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="text-muted-foreground hover:text-white"
                        >
                            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {availableRooms.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="text-4xl mb-3">🃏</div>
                            <p className="text-muted-foreground">
                                No public rooms available
                            </p>
                            <p className="text-muted-foreground/60 text-sm mt-1">
                                Create a room or join with a code
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {availableRooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            {room.isPrivate ? (
                                                <Lock className="size-5 text-emerald-400" />
                                            ) : (
                                                <Unlock className="size-5 text-emerald-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">
                                                    {room.name}
                                                </span>
                                                {room.isPlaying && (
                                                    <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                                                        In Game
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="size-3" />
                                                <span>{room.playerCount}/{room.maxPlayers} players</span>
                                                <span className="text-white/20">•</span>
                                                <span className="font-mono text-xs">{room.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleQuickJoin(room.id)}
                                        disabled={room.isPlaying || room.playerCount >= room.maxPlayers}
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                                    >
                                        <Play className="size-4" />
                                        Join
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Room Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle>Create Room</DialogTitle>
                        <DialogDescription>
                            Set up your game room
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="roomName">Room Name (optional)</Label>
                            <Input
                                id="roomName"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder={`${playerName}'s Room`}
                                className="bg-black/30 border-white/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxPlayers">Max Players</Label>
                            <Input
                                id="maxPlayers"
                                type="number"
                                min={1}
                                max={8}
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 6)}
                                className="bg-black/30 border-white/20"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isPrivate"
                                checked={isPrivate}
                                onCheckedChange={(checked) => setIsPrivate(checked === true)}
                            />
                            <Label htmlFor="isPrivate" className="cursor-pointer">
                                Private room (only joinable by code)
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                            className="border-white/20"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRoom}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            Create Room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Join by Code Dialog */}
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle>Join by Code</DialogTitle>
                        <DialogDescription>
                            Enter the 6-character room code
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="roomCode">Room Code</Label>
                            <Input
                                id="roomCode"
                                value={roomCode}
                                onChange={(e) => {
                                    setRoomCode(e.target.value.toUpperCase().slice(0, 6));
                                    setJoinError(null);
                                }}
                                placeholder="ABC123"
                                className="bg-black/30 border-white/20 font-mono text-lg tracking-widest text-center uppercase"
                                maxLength={6}
                                autoFocus
                            />
                            {joinError && (
                                <p className="text-sm text-red-400">{joinError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsJoinDialogOpen(false);
                                setRoomCode('');
                                setJoinError(null);
                            }}
                            className="border-white/20"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleJoinByCode}
                            disabled={roomCode.length !== 6}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            Join Room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

