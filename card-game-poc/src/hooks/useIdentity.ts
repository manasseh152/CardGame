import { useCallback, useState } from 'react';
import type { IdentifiedMessage } from '@/types';

export interface UseIdentityReturn {
    sessionId: string | null;
    playerId: string | null;
    playerName: string | null;
    identify: (name: string) => void;
    reset: () => void;
}

export function useIdentity(send: (message: object) => void): UseIdentityReturn {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);

    const identify = useCallback((name: string) => {
        send({ type: 'identify', name });
    }, [send]);

    const reset = useCallback(() => {
        setSessionId(null);
        setPlayerId(null);
        setPlayerName(null);
    }, []);

    const handleIdentified = useCallback((msg: IdentifiedMessage) => {
        setPlayerId(msg.playerId);
        setPlayerName(msg.name);
    }, []);

    return {
        sessionId,
        playerId,
        playerName,
        identify,
        reset,
        // Internal handler - exposed for use in message handler
        _handleIdentified: handleIdentified,
        _setSessionId: setSessionId,
    } as UseIdentityReturn & {
        _handleIdentified: (msg: IdentifiedMessage) => void;
        _setSessionId: (id: string | null) => void;
    };
}

