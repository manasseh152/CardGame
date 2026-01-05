import { cn } from '@/lib/utils';
import type { GameState, PlayerState } from '@/hooks/useWebSocket';
import { CardHand } from './PlayingCard';
import { Badge } from './ui/badge';

const STATUS_BADGES: Record<PlayerState['status'], { label: string; variant: 'default' | 'success' | 'destructive' | 'outline' }> = {
    playing: { label: 'Playing', variant: 'default' },
    stay: { label: 'Stand', variant: 'outline' },
    bust: { label: 'Bust!', variant: 'destructive' },
    blackjack: { label: 'Blackjack!', variant: 'success' },
};

const PHASE_LABELS: Record<GameState['phase'], string> = {
    betting: 'Place Your Bets',
    dealing: 'Dealing Cards',
    'player-turn': 'Your Turn',
    'dealer-turn': 'Dealer Playing',
    'round-over': 'Round Over',
};

interface PlayerHandDisplayProps {
    player: PlayerState;
    isDealer?: boolean;
    className?: string;
}

function PlayerHandDisplay({ player, isDealer = false, className }: PlayerHandDisplayProps) {
    const statusBadge = STATUS_BADGES[player.status];

    return (
        <div className={cn(
            'flex flex-col items-center gap-3 p-4 rounded-2xl',
            player.isCurrent && !isDealer && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 bg-slate-800/50',
            className
        )}>
            {/* Player name and status */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    'font-semibold text-sm',
                    isDealer ? 'text-amber-300' : 'text-white'
                )}>
                    {player.name}
                </span>
                {player.status !== 'playing' && (
                    <Badge variant={statusBadge.variant} className="text-xs">
                        {statusBadge.label}
                    </Badge>
                )}
            </div>

            {/* Cards */}
            {player.hand.length > 0 ? (
                <CardHand 
                    cards={player.hand} 
                    size="md"
                    animate={true}
                />
            ) : (
                <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                    No cards yet
                </div>
            )}

            {/* Hand value */}
            {player.hand.length > 0 && (
                <div className={cn(
                    'px-3 py-1 rounded-full text-sm font-bold',
                    player.status === 'bust' 
                        ? 'bg-red-500/20 text-red-400' 
                        : player.status === 'blackjack'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-white'
                )}>
                    {player.hand.some(c => c.hidden) ? '?' : player.handValue}
                </div>
            )}

            {/* Chips and bet info (for non-dealers) */}
            {!isDealer && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <span className="text-amber-400">💰</span>
                        <span>${player.chips}</span>
                    </div>
                    {player.bet > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-emerald-400">🎰</span>
                            <span>Bet: ${player.bet}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Split hand */}
            {player.splitHand && (
                <div className="mt-2 pt-2 border-t border-white/10">
                    <PlayerHandDisplay player={player.splitHand} />
                </div>
            )}
        </div>
    );
}

interface GameTableProps {
    gameState: GameState;
    className?: string;
}

export function GameTable({ gameState, className }: GameTableProps) {
    const phaseLabel = PHASE_LABELS[gameState.phase];

    return (
        <div className={cn('relative flex flex-col h-full', className)}>
            {/* Table felt background */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/80 via-emerald-800/70 to-emerald-900/80" />
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 60%)`
                }} />
                {/* Felt texture */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }} />
            </div>

            {/* Phase indicator */}
            <div className="relative z-10 flex justify-center py-4">
                <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
                    <span className="text-sm font-medium text-amber-300">{phaseLabel}</span>
                </div>
            </div>

            {/* Dealer area */}
            <div className="relative z-10 flex flex-col items-center pt-2 pb-6">
                <PlayerHandDisplay player={gameState.dealer} isDealer />
            </div>

            {/* Divider */}
            <div className="relative z-10 flex items-center justify-center py-2">
                <div className="flex-1 max-w-xs h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <div className="px-4 text-xs text-amber-400/60 font-medium tracking-widest uppercase">
                    {gameState.message || 'vs'}
                </div>
                <div className="flex-1 max-w-xs h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            </div>

            {/* Players area */}
            <div className="relative z-10 flex-1 flex items-start justify-center pt-6 pb-4 gap-8 flex-wrap">
                {gameState.players.map((player) => (
                    <PlayerHandDisplay 
                        key={player.handId} 
                        player={player}
                    />
                ))}
            </div>
        </div>
    );
}

interface EmptyTableProps {
    className?: string;
}

export function EmptyTable({ className }: EmptyTableProps) {
    return (
        <div className={cn('relative flex flex-col items-center justify-center h-full min-h-[400px]', className)}>
            {/* Table felt background */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/50 via-emerald-800/40 to-emerald-900/50" />
            </div>

            <div className="relative z-10 text-center space-y-4">
                <div className="text-6xl opacity-30">🃏</div>
                <p className="text-muted-foreground text-sm">
                    Connect to start playing
                </p>
                <p className="text-muted-foreground/60 text-xs">
                    The game table will appear here once connected
                </p>
            </div>
        </div>
    );
}

