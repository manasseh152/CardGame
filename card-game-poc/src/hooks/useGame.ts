import { useCallback, useState } from 'react';
import type { GameState, PromptMessage, GameStateMessage } from '@/types';

export interface UseGameReturn {
    gameState: GameState | null;
    currentPrompt: PromptMessage | null;
    spinner: { active: boolean; message?: string };
    sendResponse: (value: unknown) => void;
    sendCancel: () => void;
    reset: () => void;
}

export function useGame(send: (message: object) => void): UseGameReturn {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<PromptMessage | null>(null);
    const [spinner, setSpinner] = useState<{ active: boolean; message?: string }>({ active: false });

    const sendResponse = useCallback((value: unknown) => {
        send({ value });
        setCurrentPrompt(null);
    }, [send]);

    const sendCancel = useCallback(() => {
        send({ cancel: true });
        setCurrentPrompt(null);
    }, [send]);

    const reset = useCallback(() => {
        setGameState(null);
        setCurrentPrompt(null);
        setSpinner({ active: false });
    }, []);

    const handleGameState = useCallback((msg: GameStateMessage) => {
        setGameState({
            phase: msg.phase,
            dealer: msg.dealer,
            players: msg.players,
            message: msg.message,
        });
    }, []);

    return {
        gameState,
        currentPrompt,
        spinner,
        sendResponse,
        sendCancel,
        reset,
        // Internal handlers
        _setGameState: setGameState,
        _setCurrentPrompt: setCurrentPrompt,
        _setSpinner: setSpinner,
        _handleGameState: handleGameState,
    } as UseGameReturn & {
        _setGameState: (state: GameState | null) => void;
        _setCurrentPrompt: (prompt: PromptMessage | null) => void;
        _setSpinner: (spinner: { active: boolean; message?: string }) => void;
        _handleGameState: (msg: GameStateMessage) => void;
    };
}

