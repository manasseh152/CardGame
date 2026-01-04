import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface SpinnerOverlayProps {
    active: boolean;
    message?: string;
    className?: string;
}

export function SpinnerOverlay({ active, message, className }: SpinnerOverlayProps) {
    if (!active) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl",
                "bg-gradient-to-r from-emerald-900/40 to-emerald-800/20",
                "border border-emerald-500/30",
                "animate-in fade-in slide-in-from-bottom-2 duration-300",
                className
            )}
        >
            <Spinner className="size-5 text-emerald-400" />
            <span className="text-sm text-emerald-100 font-medium">
                {message || 'Processing...'}
            </span>
        </div>
    );
}

