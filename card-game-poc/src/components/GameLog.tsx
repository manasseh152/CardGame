import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GameLogEntry } from '@/hooks/useWebSocket';
import { 
    Info, 
    AlertTriangle, 
    XCircle, 
    CheckCircle2, 
    Bug, 
    Sparkles,
    MessageSquare,
    StickyNote,
    Flag
} from 'lucide-react';

interface GameLogProps {
    entries: GameLogEntry[];
    className?: string;
}

function LogIcon({ entry }: { entry: GameLogEntry }) {
    if (entry.type === 'intro') {
        return <Sparkles className="size-4 text-amber-400" />;
    }
    if (entry.type === 'outro') {
        return <Flag className="size-4 text-emerald-400" />;
    }
    if (entry.type === 'note') {
        return <StickyNote className="size-4 text-sky-400" />;
    }
    if (entry.type === 'warning' || entry.type === 'validation_error') {
        return <AlertTriangle className="size-4 text-amber-500" />;
    }

    switch (entry.level) {
        case 'error':
            return <XCircle className="size-4 text-red-400" />;
        case 'warn':
            return <AlertTriangle className="size-4 text-amber-500" />;
        case 'success':
            return <CheckCircle2 className="size-4 text-emerald-400" />;
        case 'debug':
            return <Bug className="size-4 text-violet-400" />;
        case 'info':
        default:
            return <Info className="size-4 text-sky-400" />;
    }
}

function LogEntry({ entry }: { entry: GameLogEntry }) {
    const isSpecial = entry.type === 'intro' || entry.type === 'outro';
    const isNote = entry.type === 'note';

    return (
        <div
            className={cn(
                "group flex gap-3 py-2.5 px-3 rounded-lg transition-colors",
                "hover:bg-white/5",
                isSpecial && "bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-500/50",
                isNote && "bg-sky-500/5 border-l-2 border-sky-500/50"
            )}
        >
            <div className="flex-shrink-0 mt-0.5">
                <LogIcon entry={entry} />
            </div>
            <div className="flex-1 min-w-0">
                {entry.title && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {entry.title}
                    </div>
                )}
                <div
                    className={cn(
                        "text-sm leading-relaxed break-words whitespace-pre-wrap",
                        entry.level === 'error' && "text-red-300",
                        entry.level === 'warn' && "text-amber-300",
                        entry.level === 'success' && "text-emerald-300",
                        entry.level === 'debug' && "text-violet-300",
                        entry.type === 'warning' && "text-amber-300",
                        entry.type === 'validation_error' && "text-amber-300",
                        isSpecial && "font-medium text-amber-100",
                        (!entry.level && !isSpecial) && "text-foreground/90"
                    )}
                >
                    {entry.message}
                </div>
            </div>
            <div className="flex-shrink-0 text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {entry.timestamp.toLocaleTimeString()}
            </div>
        </div>
    );
}

export function GameLog({ entries, className }: GameLogProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    // Track if user has scrolled up
    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    // Auto-scroll to bottom when new entries arrive
    useEffect(() => {
        if (shouldAutoScrollRef.current && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [entries]);

    if (entries.length === 0) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <div className="text-center text-muted-foreground/50">
                    <MessageSquare className="size-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Connect to the game server to begin</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={cn(
                "overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
                className
            )}
        >
            <div className="space-y-1 p-2">
                {entries.map((entry) => (
                    <LogEntry key={entry.id} entry={entry} />
                ))}
            </div>
        </div>
    );
}

