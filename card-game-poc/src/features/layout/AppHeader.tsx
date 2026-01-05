import { Layers, Spade, Heart, Diamond, Club } from 'lucide-react';
import { ConnectionPanel } from '@/features/connection';
import type { ConnectionState, RoomInfo, AppView, GameMetadata } from '@/types';

interface AppHeaderProps {
    currentView: AppView;
    currentRoom: RoomInfo | null;
    connectionState: ConnectionState;
    currentGame?: GameMetadata | null;
    onConnect: (url: string) => void;
    onDisconnect: () => void;
}

export function AppHeader({
    currentView,
    currentRoom,
    connectionState,
    currentGame,
    onConnect,
    onDisconnect,
}: AppHeaderProps) {
    // Get subtitle based on current state
    const getSubtitle = () => {
        if (currentView === 'playing' && currentRoom) {
            return currentGame ? `${currentGame.name} — ${currentRoom.name}` : `Room: ${currentRoom.name}`;
        }
        if (currentView === 'waiting-room' && currentRoom && currentGame) {
            return `${currentGame.name} — Waiting Room`;
        }
        if (currentRoom) {
            return `Room: ${currentRoom.name}`;
        }
        return 'Multiplayer Card Games';
    };

    return (
        <header className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        {/* Animated glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-amber-500/20 to-rose-500/30 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Icon container with stacked cards effect */}
                        <div className="relative size-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-white/10 overflow-hidden">
                            {/* Background card suits */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <Spade className="absolute size-4 top-1 left-1 text-white" />
                                <Heart className="absolute size-4 top-1 right-1 text-rose-400" />
                                <Diamond className="absolute size-4 bottom-1 left-1 text-rose-400" />
                                <Club className="absolute size-4 bottom-1 right-1 text-white" />
                            </div>
                            
                            {/* Main icon */}
                            <Layers className="relative size-6 text-emerald-400" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-amber-100 bg-clip-text text-transparent tracking-tight">
                            Card Games
                        </h1>
                        <p className="text-xs text-muted-foreground tracking-wide">
                            {getSubtitle()}
                        </p>
                    </div>
                </div>
                <ConnectionPanel
                    connectionState={connectionState}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            </div>
        </header>
    );
}

