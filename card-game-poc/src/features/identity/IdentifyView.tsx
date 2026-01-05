import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, ArrowRight, Sparkles } from 'lucide-react';

interface IdentifyViewProps {
    onIdentify: (name: string) => void;
}

export function IdentifyView({ onIdentify }: IdentifyViewProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter your name');
            return;
        }
        if (trimmedName.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }
        if (trimmedName.toLowerCase() === 'dealer') {
            setError('Name cannot be "Dealer"');
            return;
        }
        
        setError(null);
        onIdentify(trimmedName);
    }, [name, onIdentify]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md bg-slate-900/80 border-white/10 backdrop-blur-sm overflow-hidden">
                {/* Decorative header */}
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg border border-white/10 relative">
                        <User className="size-8 text-emerald-400" />
                        <div className="absolute -top-1 -right-1 size-5 rounded-full bg-amber-500 flex items-center justify-center">
                            <Sparkles className="size-3 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                        Welcome to Card Games
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Enter your name to start playing
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Enter your name..."
                                className="h-12 text-lg bg-black/30 border-white/20 focus-visible:border-emerald-500/50 text-center"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-400 text-center">{error}</p>
                            )}
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20"
                        >
                            Let's Play
                            <ArrowRight className="size-5" />
                        </Button>
                    </form>
                    
                    {/* Fun tip */}
                    <p className="text-xs text-center text-muted-foreground/60 mt-4">
                        ♠ ♥ ♦ ♣ Play Blackjack, Ride the Bus, and more!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

