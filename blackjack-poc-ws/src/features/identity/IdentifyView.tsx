import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, ArrowRight } from 'lucide-react';

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
            <Card className="w-full max-w-md bg-slate-900/80 border-white/10 backdrop-blur-sm">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <User className="size-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        Welcome to Blackjack
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Enter your name to get started
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
                                placeholder="Your name"
                                className="h-12 text-lg bg-black/30 border-white/20 focus-visible:border-emerald-500/50"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg gap-2 bg-emerald-600 hover:bg-emerald-500"
                        >
                            Continue
                            <ArrowRight className="size-5" />
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

