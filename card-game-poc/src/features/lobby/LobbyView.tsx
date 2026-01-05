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
    Play,
    Sparkles,
    Globe,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomInfo, GameMetadata, GameType, GameCategory } from '@/types';
import { GameBrowser, GameCard } from '@/features/games';

/** Map of category names to display labels */
const CATEGORY_LABELS: Record<GameCategory, string> = {
    casino: 'Casino',
    drinking: 'Drinking',
    party: 'Party',
};

type LobbyTab = 'games' | 'rooms';

interface LobbyViewProps {
    playerName: string;
    availableRooms: RoomInfo[];
    availableGames: GameMetadata[];
    onRequestRoomList: () => void;
    onRequestGameList: () => void;
    onCreateRoom: (options: { name?: string; isPrivate?: boolean; maxPlayers?: number; gameType?: GameType }) => void;
    onJoinRoom: (roomId: string) => void;
}

export function LobbyView({
    playerName,
    availableRooms,
    availableGames,
    onRequestRoomList,
    onRequestGameList,
    onCreateRoom,
    onJoinRoom,
}: LobbyViewProps) {
    const [activeTab, setActiveTab] = useState<LobbyTab>('games');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Create room form state
    const [roomName, setRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(6);
    const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
    
    // Join room form state
    const [roomCode, setRoomCode] = useState('');
    const [joinError, setJoinError] = useState<string | null>(null);

    // Auto-refresh room list and fetch games on mount
    useEffect(() => {
        onRequestRoomList();
        onRequestGameList();
        const interval = setInterval(onRequestRoomList, 5000);
        return () => clearInterval(interval);
    }, [onRequestRoomList, onRequestGameList]);

    // Set default game when games are loaded
    useEffect(() => {
        if (availableGames.length > 0 && !selectedGameType) {
            setSelectedGameType(availableGames[0].type);
        }
    }, [availableGames, selectedGameType]);

    // Get selected game metadata
    const selectedGame = availableGames.find(g => g.type === selectedGameType);

    // Update max players when game changes
    useEffect(() => {
        if (selectedGame) {
            setMaxPlayers(selectedGame.maxPlayers);
        }
    }, [selectedGame]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        onRequestRoomList();
        setTimeout(() => setIsRefreshing(false), 500);
    }, [onRequestRoomList]);

    const handleCreateRoom = useCallback(() => {
        if (!selectedGameType) return;
        onCreateRoom({
            name: roomName || undefined,
            isPrivate,
            maxPlayers,
            gameType: selectedGameType,
        });
        setIsCreateDialogOpen(false);
        setRoomName('');
        setIsPrivate(false);
        setMaxPlayers(selectedGame?.maxPlayers ?? 6);
    }, [roomName, isPrivate, maxPlayers, selectedGameType, selectedGame, onCreateRoom]);

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

    const handleQuickPlay = useCallback((gameType: GameType) => {
        setSelectedGameType(gameType);
        setIsCreateDialogOpen(true);
    }, []);

    // Count rooms per game type
    const roomCountByGame = availableRooms.reduce((acc, room) => {
        if (room.gameType) {
            acc[room.gameType] = (acc[room.gameType] || 0) + 1;
        }
        return acc;
    }, {} as Record<GameType, number>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                            Welcome back, {playerName}!
                        </span>
                        <span className="text-2xl">👋</span>
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Choose a game to play or join an existing room
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
                        disabled={!selectedGameType}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                        <Plus className="size-4" />
                        Create Room
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-white/5">
                <button
                    onClick={() => setActiveTab('games')}
                    className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                        activeTab === 'games'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    )}
                >
                    <Sparkles className="size-4" />
                    Browse Games
                </button>
                <button
                    onClick={() => setActiveTab('rooms')}
                    className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                        activeTab === 'rooms'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    )}
                >
                    <Globe className="size-4" />
                    Public Rooms
                    {availableRooms.length > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-white/10 text-white">
                            {availableRooms.length}
                        </Badge>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'games' ? (
                <div className="space-y-6">
                    {/* Quick Start Section */}
                    {availableGames.length > 0 && (
                        <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-amber-900/20 border-emerald-500/20 backdrop-blur-sm overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <CardContent className="py-6 relative">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                                            <Play className="size-5 text-emerald-400" />
                                            Quick Start
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Jump right into a game — select one below and click Play Now
                                        </p>
                                    </div>
                                    {selectedGame && (
                                        <Button
                                            onClick={() => handleQuickPlay(selectedGame.type)}
                                            size="lg"
                                            className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/20"
                                        >
                                            Play {selectedGame.name}
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Game Browser */}
                    <GameBrowser
                        games={availableGames}
                        selectedGame={selectedGameType ?? undefined}
                        onSelectGame={(gameType) => setSelectedGameType(gameType)}
                    />

                    {/* Rooms for Selected Game */}
                    {selectedGameType && roomCountByGame[selectedGameType] && roomCountByGame[selectedGameType] > 0 && (
                        <Card className="bg-slate-900/40 border-white/5">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="text-white font-medium">{roomCountByGame[selectedGameType]}</span> public room{roomCountByGame[selectedGameType] !== 1 ? 's' : ''} playing {selectedGame?.name}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveTab('rooms')}
                                        className="gap-1 text-emerald-400 hover:text-emerald-300"
                                    >
                                        View Rooms
                                        <ArrowRight className="size-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* Room List */
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
                                <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {availableRooms.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="text-4xl mb-3">🌐</div>
                                <p className="text-muted-foreground">
                                    No public rooms available
                                </p>
                                <p className="text-muted-foreground/60 text-sm mt-1">
                                    Create a room or join with a code
                                </p>
                                <Button
                                    onClick={() => {
                                        setActiveTab('games');
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 gap-2 border-white/20"
                                >
                                    <Sparkles className="size-4" />
                                    Browse Games
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {availableRooms.map((room) => {
                                    const roomGame = availableGames.find(g => g.type === room.gameType);
                                    const roomGameIcon = roomGame?.icon || '🎮';
                                    return (
                                        <div
                                            key={room.id}
                                            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl">
                                                    {roomGameIcon}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-white">
                                                            {room.name}
                                                        </span>
                                                        {room.isPrivate && (
                                                            <Lock className="size-3 text-muted-foreground" />
                                                        )}
                                                        {room.isPlaying && (
                                                            <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                                                                In Game
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        {roomGame && (
                                                            <>
                                                                <span className="text-xs text-emerald-400">{roomGame.name}</span>
                                                                <span className="text-white/20">•</span>
                                                            </>
                                                        )}
                                                        <Users className="size-3" />
                                                        <span>{room.playerCount}/{room.maxPlayers}</span>
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
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Create Room Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="size-5 text-emerald-400" />
                            Create Room
                        </DialogTitle>
                        <DialogDescription>
                            {selectedGame 
                                ? `Set up a ${selectedGame.name} room` 
                                : 'Choose a game and set up your room'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        {/* Selected Game Display */}
                        {selectedGame && (
                            <div className="space-y-2">
                                <Label>Selected Game</Label>
                                <GameCard
                                    game={selectedGame}
                                    isSelected
                                    onClick={() => {
                                        setIsCreateDialogOpen(false);
                                        setActiveTab('games');
                                    }}
                                    size="sm"
                                    showDescription={false}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Click to change game
                                </p>
                            </div>
                        )}

                        {/* Room Settings */}
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
                                min={selectedGame?.minPlayers ?? 1}
                                max={selectedGame?.maxPlayers ?? 8}
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 6)}
                                className="bg-black/30 border-white/20"
                            />
                            {selectedGame && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedGame.name} supports {selectedGame.minPlayers}-{selectedGame.maxPlayers} players
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isPrivate"
                                checked={isPrivate}
                                onCheckedChange={(checked) => setIsPrivate(checked === true)}
                            />
                            <Label htmlFor="isPrivate" className="cursor-pointer flex items-center gap-2">
                                <Lock className="size-3" />
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
                            disabled={!selectedGameType}
                            className="bg-emerald-600 hover:bg-emerald-500 gap-2"
                        >
                            <Play className="size-4" />
                            Create Room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Join by Code Dialog */}
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Hash className="size-5 text-amber-400" />
                            Join by Code
                        </DialogTitle>
                        <DialogDescription>
                            Enter the 6-character room code to join
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
                            className="bg-emerald-600 hover:bg-emerald-500 gap-2"
                        >
                            <ArrowRight className="size-4" />
                            Join Room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
