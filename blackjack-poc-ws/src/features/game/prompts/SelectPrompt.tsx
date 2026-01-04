import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ChevronRight } from 'lucide-react';
import type { SelectPromptMessage } from '@/types';

interface SelectPromptProps {
    prompt: SelectPromptMessage;
    onSubmit: (value: string) => void;
    onCancel: () => void;
    className?: string;
}

export function SelectPrompt({ prompt, onSubmit, onCancel, className }: SelectPromptProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Focus the first option
        const firstButton = containerRef.current?.querySelector('button[data-option]');
        (firstButton as HTMLButtonElement)?.focus();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    }, [onCancel]);

    const handleOptionKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
        const buttons = containerRef.current?.querySelectorAll('button[data-option]');
        if (!buttons) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next = buttons[index + 1] || buttons[0];
            (next as HTMLButtonElement)?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = buttons[index - 1] || buttons[buttons.length - 1];
            (prev as HTMLButtonElement)?.focus();
        }
    }, []);

    return (
        <div 
            ref={containerRef}
            onKeyDown={handleKeyDown}
            className={cn("space-y-4", className)}
        >
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground/90">
                    {prompt.message}
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <X className="size-4" />
                </Button>
            </div>
            <div className="grid gap-2">
                {prompt.options.map((option, index) => (
                    <button
                        key={option.value}
                        data-option
                        onClick={() => onSubmit(option.value)}
                        onKeyDown={(e) => handleOptionKeyDown(e, index)}
                        className={cn(
                            "group flex items-center justify-between gap-3 w-full",
                            "px-4 py-3 rounded-lg text-left",
                            "bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/40",
                            "transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                        )}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground/90 group-hover:text-emerald-100 transition-colors">
                                {option.label}
                            </div>
                            {option.hint && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {option.hint}
                                </div>
                            )}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    );
}

