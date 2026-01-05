import { cn } from '@/lib/utils';
import type { PromptMessage } from '@/types';
import { TextPrompt } from './TextPrompt';
import { SelectPrompt } from './SelectPrompt';
import { ConfirmPrompt } from './ConfirmPrompt';

interface PromptPanelProps {
    prompt: PromptMessage | null;
    onSubmit: (value: unknown) => void;
    onCancel: () => void;
    className?: string;
    compact?: boolean;
}

export function PromptPanel({ prompt, onSubmit, onCancel, className, compact = false }: PromptPanelProps) {
    if (!prompt) {
        return (
            <div className={cn(
                "flex items-center justify-center text-muted-foreground/50",
                compact ? "py-4" : "py-8",
                className
            )}>
                <p className={cn("text-sm", compact && "text-xs")}>Waiting for game input...</p>
            </div>
        );
    }

    const commonProps = {
        onCancel,
        compact,
        className: "animate-in fade-in slide-in-from-bottom-2 duration-300",
    };

    switch (prompt.promptType) {
        case 'text':
            return (
                <TextPrompt
                    prompt={prompt}
                    onSubmit={(v) => onSubmit(v)}
                    {...commonProps}
                />
            );
        case 'select':
            return (
                <SelectPrompt
                    prompt={prompt}
                    onSubmit={(v) => onSubmit(v)}
                    {...commonProps}
                />
            );
        case 'confirm':
            return (
                <ConfirmPrompt
                    prompt={prompt}
                    onSubmit={(v) => onSubmit(v)}
                    {...commonProps}
                />
            );
        default:
            return null;
    }
}

export { TextPrompt, SelectPrompt, ConfirmPrompt };

