import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { GameMetadata, GameCategory } from '@/types';

const CATEGORY_COLORS: Record<GameCategory, { bg: string; text: string; border: string }> = {
    casino: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    drinking: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    party: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
};

const CATEGORY_LABELS: Record<GameCategory, string> = {
    casino: 'Casino',
    drinking: 'Drinking',
    party: 'Party',
};

interface GameCardProps {
    game: GameMetadata;
    isSelected?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    showDescription?: boolean;
}

export function GameCard({ 
    game, 
    isSelected = false, 
    onClick, 
    size = 'md',
    showDescription = true 
}: GameCardProps) {
    const categoryStyle = CATEGORY_COLORS[game.category];
    const icon = game.icon || '🎮';

    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
    };

    const iconSizes = {
        sm: 'size-10 text-2xl',
        md: 'size-14 text-3xl',
        lg: 'size-16 text-4xl',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative w-full text-left rounded-xl border transition-all duration-200',
                'hover:scale-[1.02] active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
                sizeClasses[size],
                isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-slate-800/70'
            )}
        >
            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 size-2 rounded-full bg-emerald-400 animate-pulse" />
            )}

            <div className="flex items-start gap-4">
                {/* Game Icon */}
                <div className={cn(
                    'shrink-0 rounded-xl flex items-center justify-center',
                    iconSizes[size],
                    categoryStyle.bg,
                    categoryStyle.border,
                    'border'
                )}>
                    {icon}
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                            'font-semibold text-white truncate',
                            size === 'lg' ? 'text-lg' : 'text-base'
                        )}>
                            {game.name}
                        </h3>
                        <Badge 
                            variant="outline" 
                            className={cn(
                                'shrink-0 text-[10px] uppercase tracking-wider',
                                categoryStyle.text,
                                categoryStyle.border
                            )}
                        >
                            {CATEGORY_LABELS[game.category]}
                        </Badge>
                    </div>

                    {showDescription && (
                        <p className={cn(
                            'text-muted-foreground line-clamp-2 mb-2',
                            size === 'sm' ? 'text-xs' : 'text-sm'
                        )}>
                            {game.description}
                        </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                        <Users className="size-3" />
                        <span>{game.minPlayers}-{game.maxPlayers} players</span>
                    </div>
                </div>
            </div>
        </button>
    );
}

