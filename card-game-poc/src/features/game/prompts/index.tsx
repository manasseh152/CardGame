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
}

export function PromptPanel({ prompt, onSubmit, onCancel, className }: PromptPanelProps) {
    if (!prompt) {
        return (
            <div className={cn("flex items-center justify-center py-8 text-muted-foreground/50", className)}>
                <p className="text-sm">Waiting for game input...</p>
            </div>
        );
    }

    const commonProps = {
        onCancel,
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

