import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, X } from 'lucide-react';
import type { TextPromptMessage } from '@/hooks/useWebSocket';

interface TextPromptProps {
    prompt: TextPromptMessage;
    onSubmit: (value: string) => void;
    onCancel: () => void;
    className?: string;
}

export function TextPrompt({ prompt, onSubmit, onCancel, className }: TextPromptProps) {
    const [value, setValue] = useState(prompt.defaultValue || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
    }, [value, onSubmit]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    }, [onCancel]);

    return (
        <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">
                    {prompt.message}
                </label>
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={prompt.placeholder}
                        className="flex-1 bg-black/30 border-white/20 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                    >
                        <Send className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </div>
        </form>
    );
}

