import { useCallback, useRef, useState } from 'react';
import type { GameLogEntry } from '@/types';

export interface UseGameLogReturn {
    gameLog: GameLogEntry[];
    addLogEntry: (
        type: GameLogEntry['type'],
        message: string,
        options?: { level?: GameLogEntry['level']; title?: string }
    ) => void;
    clearLog: () => void;
}

export function useGameLog(): UseGameLogReturn {
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
    const logIdRef = useRef(0);

    const addLogEntry = useCallback((
        type: GameLogEntry['type'],
        message: string,
        options?: { level?: GameLogEntry['level']; title?: string }
    ) => {
        const entry: GameLogEntry = {
            id: `log-${++logIdRef.current}`,
            timestamp: new Date(),
            type,
            message,
            level: options?.level,
            title: options?.title,
        };
        setGameLog(prev => [...prev, entry]);
    }, []);

    const clearLog = useCallback(() => {
        setGameLog([]);
    }, []);

    return {
        gameLog,
        addLogEntry,
        clearLog,
    };
}

