import { useCallback, useRef, useState, type RefObject } from 'react';
import type { ConnectionState, ServerMessage } from '@/types';

export interface UseConnectionReturn {
    connectionState: ConnectionState;
    wsRef: RefObject<WebSocket | null>;
    connect: (url: string) => void;
    disconnect: () => void;
    send: (message: object) => void;
}

export function useConnection(
    onMessage: (data: ServerMessage) => void
): UseConnectionReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

    const connect = useCallback((url: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        setConnectionState('connecting');

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionState('connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ServerMessage;
                onMessage(data);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        };

        ws.onclose = () => {
            setConnectionState('disconnected');
            wsRef.current = null;
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    }, [onMessage]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const send = useCallback((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    return {
        connectionState,
        wsRef,
        connect,
        disconnect,
        send,
    };
}

