import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Dice5, Wine, PartyPopper } from 'lucide-react';
import type { GameMetadata, GameCategory, GameType } from '@/types';
import { GameCard } from './GameCard';

const CATEGORY_CONFIG: Record<GameCategory, { 
    label: string; 
    icon: React.ReactNode; 
    description: string;
    color: string;
}> = {
    casino: { 
        label: 'Casino', 
        icon: <Dice5 className="size-4" />, 
        description: 'Classic casino card games',
        color: 'text-amber-400'
    },
    drinking: { 
        label: 'Drinking', 
        icon: <Wine className="size-4" />, 
        description: 'Games best enjoyed with drinks',
        color: 'text-rose-400'
    },
    party: { 
        label: 'Party', 
        icon: <PartyPopper className="size-4" />, 
        description: 'Fun games for groups',
        color: 'text-violet-400'
    },
};

interface GameBrowserProps {
    games: GameMetadata[];
    selectedGame?: GameType;
    onSelectGame: (gameType: GameType) => void;
    className?: string;
}

export function GameBrowser({ 
    games, 
    selectedGame, 
    onSelectGame,
    className 
}: GameBrowserProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<GameCategory | 'all'>('all');

    // Filter games based on search and category
    const filteredGames = useMemo(() => {
        return games.filter(game => {
            const matchesSearch = searchQuery === '' || 
                game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                game.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [games, searchQuery, activeCategory]);

    // Group filtered games by category
    const gamesByCategory = useMemo(() => {
        return filteredGames.reduce((acc, game) => {
            if (!acc[game.category]) {
                acc[game.category] = [];
            }
            acc[game.category].push(game);
            return acc;
        }, {} as Record<GameCategory, GameMetadata[]>);
    }, [filteredGames]);

    // Available categories (only ones that have games)
    const availableCategories = useMemo(() => {
        const categories = new Set(games.map(g => g.category));
        return Array.from(categories) as GameCategory[];
    }, [games]);

    return (
        <Card className={cn('bg-slate-900/60 border-white/10 backdrop-blur-sm', className)}>
            <CardHeader className="border-b border-white/10 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="size-5 text-amber-400" />
                            Choose a Game
                        </CardTitle>
                        <CardDescription>
                            {games.length} game{games.length !== 1 ? 's' : ''} available to play
                        </CardDescription>
                    </div>
                    
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search games..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-black/30 border-white/20"
                        />
                    </div>
                </div>

                {/* Category filters */}
                {availableCategories.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('all')}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                                activeCategory === 'all'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800 text-muted-foreground border border-white/10 hover:border-white/20'
                            )}
                        >
                            All Games
                        </button>
                        {availableCategories.map((category) => {
                            const config = CATEGORY_CONFIG[category];
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveCategory(category)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                                        activeCategory === category
                                            ? 'bg-white/10 border border-white/20'
                                            : 'bg-slate-800 text-muted-foreground border border-white/10 hover:border-white/20',
                                        activeCategory === category && config.color
                                    )}
                                >
                                    {config.icon}
                                    {config.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-4">
                {filteredGames.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3 opacity-40">🔍</div>
                        <p className="text-muted-foreground">
                            No games found
                        </p>
                        <p className="text-muted-foreground/60 text-sm mt-1">
                            Try adjusting your search or filters
                        </p>
                    </div>
                ) : activeCategory === 'all' ? (
                    // Grouped view
                    <div className="space-y-6">
                        {Object.entries(gamesByCategory).map(([category, categoryGames]) => {
                            const config = CATEGORY_CONFIG[category as GameCategory];
                            return (
                                <div key={category}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={config.color}>{config.icon}</span>
                                        <h4 className="text-sm font-medium text-white">
                                            {config.label}
                                        </h4>
                                        <span className="text-xs text-muted-foreground">
                                            ({categoryGames.length})
                                        </span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {categoryGames.map((game) => (
                                            <GameCard
                                                key={game.type}
                                                game={game}
                                                isSelected={selectedGame === game.type}
                                                onClick={() => onSelectGame(game.type)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Flat view for single category
                    <div className="grid gap-3 sm:grid-cols-2">
                        {filteredGames.map((game) => (
                            <GameCard
                                key={game.type}
                                game={game}
                                isSelected={selectedGame === game.type}
                                onClick={() => onSelectGame(game.type)}
                                size="lg"
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

