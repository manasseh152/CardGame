import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import type { ConfirmPromptMessage } from '@/types';

interface ConfirmPromptProps {
    prompt: ConfirmPromptMessage;
    onSubmit: (value: boolean) => void;
    onCancel: () => void;
    className?: string;
    compact?: boolean;
}

export function ConfirmPrompt({ prompt, onSubmit, onCancel, className, compact = false }: ConfirmPromptProps) {
    const yesRef = useRef<HTMLButtonElement>(null);
    const noRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Focus based on initial value
        if (prompt.initialValue) {
            yesRef.current?.focus();
        } else {
            noRef.current?.focus();
        }
    }, [prompt.initialValue]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'y' || e.key === 'Y') {
            onSubmit(true);
        } else if (e.key === 'n' || e.key === 'N') {
            onSubmit(false);
        }
    }, [onCancel, onSubmit]);

    return (
        <div onKeyDown={handleKeyDown} className={cn(compact ? "space-y-2" : "space-y-4", className)}>
            <div className="flex items-center justify-between gap-2">
                <label className={cn(
                    "font-medium text-foreground/90",
                    compact ? "text-xs" : "text-sm"
                )}>
                    {prompt.message}
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                >
                    <X className="size-4" />
                </Button>
            </div>
            <div className="flex gap-2">
                <Button
                    ref={yesRef}
                    onClick={() => onSubmit(true)}
                    size={compact ? "sm" : "default"}
                    className={cn(
                        "flex-1 gap-2",
                        "bg-emerald-600 hover:bg-emerald-500 text-white",
                        "focus:ring-2 focus:ring-emerald-500/40"
                    )}
                >
                    <Check className={cn(compact ? "size-3" : "size-4")} />
                    Yes
                </Button>
                <Button
                    ref={noRef}
                    onClick={() => onSubmit(false)}
                    variant="outline"
                    size={compact ? "sm" : "default"}
                    className={cn(
                        "flex-1 gap-2",
                        "border-white/20 hover:bg-white/10",
                        "focus:ring-2 focus:ring-white/20"
                    )}
                >
                    <X className={cn(compact ? "size-3" : "size-4")} />
                    No
                </Button>
            </div>
            {!compact && (
                <p className="text-xs text-muted-foreground text-center">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Y</kbd> for yes or{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">N</kbd> for no
                </p>
            )}
        </div>
    );
}

