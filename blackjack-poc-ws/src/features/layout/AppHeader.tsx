import { Spade } from 'lucide-react';
import { ConnectionPanel } from '@/features/connection';
import type { ConnectionState, RoomInfo, AppView } from '@/types';

interface AppHeaderProps {
    currentView: AppView;
    currentRoom: RoomInfo | null;
    connectionState: ConnectionState;
    onConnect: (url: string) => void;
    onDisconnect: () => void;
}

export function AppHeader({
    currentView,
    currentRoom,
    connectionState,
    onConnect,
    onDisconnect,
}: AppHeaderProps) {
    return (
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
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            </div>
        </header>
    );
}

