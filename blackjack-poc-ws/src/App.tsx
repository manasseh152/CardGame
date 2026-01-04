import { useWebSocket } from '@/hooks/useWebSocket';
import { SpinnerOverlay } from '@/components/SpinnerOverlay';
import { PromptPanel } from '@/components/prompts';
import { ConnectionPanel } from '@/components/ConnectionPanel';
import { IdentifyView } from '@/components/IdentifyView';
import { LobbyView } from '@/components/LobbyView';
import { WaitingRoom } from '@/components/WaitingRoom';
import { GameTable, EmptyTable } from '@/components/GameTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spade, Heart, Diamond, Club } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

function CardSuitPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
            <div className="absolute -top-10 -left-10 text-[400px] rotate-12">
                <Spade />
            </div>
            <div className="absolute top-1/4 -right-20 text-[300px] -rotate-12">
                <Heart />
            </div>
            <div className="absolute bottom-1/4 -left-16 text-[250px] rotate-45">
                <Diamond />
            </div>
            <div className="absolute -bottom-10 right-1/4 text-[350px] -rotate-6">
                <Club />
            </div>
        </div>
    );
}

export default function App() {
    const {
        // Connection
        connectionState,
        connect,
        disconnect,
        
        // Identity
        playerId,
        playerName,
        identify,
        
        // Room
        currentRoom,
        roomPlayers,
        isHost,
        isReady,
        availableRooms,
        
        // Room actions
        requestRoomList,
        createRoom,
        joinRoom,
        leaveRoom,
        setReady,
        startGame,
        
        // Game
        gameState,
        currentPrompt,
        spinner,
        
        // Game actions
        sendResponse,
        sendCancel,
        
        // View
        currentView,
    } = useWebSocket();

    const isConnected = connectionState === 'connected';

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950">
            <CardSuitPattern />
            <Toaster position="top-center" />
            
            {/* Decorative border glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            
            <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                                <div className="relative size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                                    <Spade className="size-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-amber-100 bg-clip-text text-transparent tracking-tight">
                                    Blackjack
                                </h1>
                                <p className="text-xs text-muted-foreground tracking-wide">
                                    {currentView === 'playing' && currentRoom 
                                        ? `Room: ${currentRoom.name}` 
                                        : 'Multiplayer Game'}
                                </p>
                            </div>
                        </div>
                        <ConnectionPanel
                            connectionState={connectionState}
                            onConnect={connect}
                            onDisconnect={disconnect}
                        />
                    </div>
                </header>

                {/* Main Content - View Routing */}
                <div className="flex-1">
                    {/* Connecting View */}
                    {currentView === 'connecting' && (
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
                    )}

                    {/* Identify View */}
                    {currentView === 'identify' && (
                        <IdentifyView onIdentify={identify} />
                    )}

                    {/* Lobby View */}
                    {currentView === 'lobby' && playerName && (
                        <LobbyView
                            playerName={playerName}
                            availableRooms={availableRooms}
                            onRequestRoomList={requestRoomList}
                            onCreateRoom={createRoom}
                            onJoinRoom={joinRoom}
                        />
                    )}

                    {/* Waiting Room View */}
                    {currentView === 'waiting-room' && currentRoom && (
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
                    )}

                    {/* Playing View */}
                    {currentView === 'playing' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Game Table Panel */}
                            <Card className="lg:col-span-3 bg-slate-900/60 border-white/10 backdrop-blur-sm overflow-hidden flex flex-col">
                                <CardHeader className="border-b border-white/10 py-4">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                                        Game Table
                                        {currentRoom && (
                                            <span className="text-muted-foreground font-normal text-sm">
                                                — {currentRoom.name}
                                            </span>
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
                                {/* Prompt Card */}
                                <Card className="bg-slate-900/60 border-white/10 backdrop-blur-sm">
                                    <CardHeader className="border-b border-white/10 py-4">
                                        <CardTitle className="text-base font-semibold">
                                            Game Actions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
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
                                {gameState && (
                                    <Card className="bg-slate-900/40 border-white/5 backdrop-blur-sm mt-auto">
                                        <CardContent className="py-4">
                                            <div className="space-y-3">
                                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                                    Player Stats
                                                </div>
                                                {gameState.players.map((player) => (
                                                    <div key={player.id} className="flex items-center justify-between">
                                                        <span className="text-sm text-white/80">{player.name}</span>
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
                                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors text-center py-2"
                                    >
                                        Leave Room
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground/50">
                        Built with React + Tailwind + shadcn/ui • 
                        <span className="mx-1">♠</span> 
                        BitBreeze CardGame
                    </p>
                </footer>
            </div>
        </div>
    );
}
