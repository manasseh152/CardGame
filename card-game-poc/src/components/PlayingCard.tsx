import { cn } from '@/lib/utils';
import type { CardState } from '@/hooks/useWebSocket';

const SUIT_SYMBOLS: Record<CardState['suit'], string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

const SUIT_COLORS: Record<CardState['suit'], string> = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-slate-900',
    spades: 'text-slate-900',
};

interface PlayingCardProps {
    card: CardState;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
    style?: React.CSSProperties;
}

export function PlayingCard({ card, className, size = 'md', animate = false, style }: PlayingCardProps) {
    const sizeClasses = {
        sm: 'w-12 h-[4.5rem] text-sm',
        md: 'w-16 h-24 text-base',
        lg: 'w-20 h-[7.5rem] text-lg',
    };

    const suitSize = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-3xl',
    };

    if (card.hidden) {
        return (
            <div
                className={cn(
                    sizeClasses[size],
                    'rounded-lg shadow-lg flex items-center justify-center',
                    'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900',
                    'border-2 border-blue-400/50',
                    'relative overflow-hidden',
                    animate && 'animate-in fade-in slide-in-from-top-4 duration-300',
                    className
                )}
                style={style}
            >
                {/* Card back pattern */}
                <div className="absolute inset-1 rounded border border-blue-400/30">
                    <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                            backgroundImage: `repeating-linear-gradient(
                                45deg,
                                transparent,
                                transparent 4px,
                                rgba(255,255,255,0.1) 4px,
                                rgba(255,255,255,0.1) 8px
                            )`
                        }} />
                    </div>
                </div>
                <span className="text-blue-200/60 text-2xl font-bold">?</span>
            </div>
        );
    }

    const symbol = SUIT_SYMBOLS[card.suit];
    const colorClass = SUIT_COLORS[card.suit];

    return (
        <div
            className={cn(
                sizeClasses[size],
                'rounded-lg shadow-lg flex flex-col',
                'bg-gradient-to-br from-white via-gray-50 to-gray-100',
                'border border-gray-200',
                'relative overflow-hidden',
                animate && 'animate-in fade-in slide-in-from-top-4 duration-300',
                className
            )}
            style={style}
        >
            {/* Top left corner */}
            <div className={cn('absolute top-1 left-1.5 flex flex-col items-center leading-none', colorClass)}>
                <span className="font-bold">{card.rank}</span>
                <span className={cn(suitSize[size], '-mt-1')}>{symbol}</span>
            </div>

            {/* Center suit */}
            <div className={cn('flex-1 flex items-center justify-center', colorClass)}>
                <span className={cn(
                    size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : 'text-5xl'
                )}>
                    {symbol}
                </span>
            </div>

            {/* Bottom right corner (rotated) */}
            <div className={cn('absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180', colorClass)}>
                <span className="font-bold">{card.rank}</span>
                <span className={cn(suitSize[size], '-mt-1')}>{symbol}</span>
            </div>
        </div>
    );
}

interface CardHandProps {
    cards: CardState[];
    overlap?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

export function CardHand({ cards, overlap = true, className, size = 'md', animate = false }: CardHandProps) {
    const overlapSize = {
        sm: '-ml-8',
        md: '-ml-10',
        lg: '-ml-12',
    };

    return (
        <div className={cn('flex items-center', className)}>
            {cards.map((card, index) => (
                <PlayingCard
                    key={`${card.suit}-${card.rank}-${index}`}
                    card={card}
                    size={size}
                    animate={animate}
                    className={cn(
                        overlap && index > 0 && overlapSize[size],
                        'hover:z-10 hover:-translate-y-1 transition-transform'
                    )}
                    style={animate ? { animationDelay: `${index * 100}ms` } : undefined}
                />
            ))}
        </div>
    );
}

