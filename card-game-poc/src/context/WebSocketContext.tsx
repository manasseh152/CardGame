import { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket, type UseWebSocketReturn } from '@/hooks/useWebSocket';

const WebSocketContext = createContext<UseWebSocketReturn | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const ws = useWebSocket();
    return (
        <WebSocketContext.Provider value={ws}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext(): UseWebSocketReturn {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
}

