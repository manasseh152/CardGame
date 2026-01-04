import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { AppView, RoomInfo } from '@/types';

/**
 * Hook that provides navigation helpers based on application state.
 * Use this to navigate to the appropriate route based on the current view state.
 */
export function useNavigateByState() {
    const navigate = useNavigate();

    /**
     * Navigate to the route corresponding to the given app view.
     */
    const navigateToView = useCallback((view: AppView, room?: RoomInfo | null) => {
        switch (view) {
            case 'connecting':
                navigate({ to: '/connect' });
                break;
            case 'identify':
                navigate({ to: '/identify' });
                break;
            case 'lobby':
                navigate({ to: '/rooms' });
                break;
            case 'waiting-room':
                if (room) {
                    navigate({ to: '/rooms/$roomId', params: { roomId: room.id } });
                } else {
                    navigate({ to: '/rooms' });
                }
                break;
            case 'playing':
                if (room) {
                    navigate({ to: '/rooms/$roomId/game', params: { roomId: room.id } });
                } else {
                    navigate({ to: '/rooms' });
                }
                break;
        }
    }, [navigate]);

    /**
     * Navigate to the lobby/rooms list.
     */
    const navigateToLobby = useCallback(() => {
        navigate({ to: '/rooms' });
    }, [navigate]);

    /**
     * Navigate to a specific room's waiting room.
     */
    const navigateToRoom = useCallback((roomId: string) => {
        navigate({ to: '/rooms/$roomId', params: { roomId } });
    }, [navigate]);

    /**
     * Navigate to a specific room's game.
     */
    const navigateToGame = useCallback((roomId: string) => {
        navigate({ to: '/rooms/$roomId/game', params: { roomId } });
    }, [navigate]);

    /**
     * Navigate to the connect page.
     */
    const navigateToConnect = useCallback(() => {
        navigate({ to: '/connect' });
    }, [navigate]);

    /**
     * Navigate to the identify page.
     */
    const navigateToIdentify = useCallback(() => {
        navigate({ to: '/identify' });
    }, [navigate]);

    return {
        navigateToView,
        navigateToLobby,
        navigateToRoom,
        navigateToGame,
        navigateToConnect,
        navigateToIdentify,
    };
}

