import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plug, Unplug, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionState } from '@/types';

interface ConnectionPanelProps {
    connectionState: ConnectionState;
    onConnect: (url: string) => void;
    onDisconnect: () => void;
    className?: string;
}

const DEFAULT_URL = 'wss://multiplayer.bitbreeze.nl';

export function ConnectionPanel({ 
    connectionState, 
    onConnect, 
    onDisconnect, 
    className 
}: ConnectionPanelProps) {
    const [url, setUrl] = useState(DEFAULT_URL);
    const [showCustomUrl, setShowCustomUrl] = useState(false);
    const hasTriedDefault = useRef(false);
    const connectionAttemptRef = useRef<string | null>(null);
    const prevConnectionState = useRef<ConnectionState>('disconnected');

    // Auto-connect to default URL on mount
    useEffect(() => {
        if (!hasTriedDefault.current && connectionState === 'disconnected') {
            hasTriedDefault.current = true;
            connectionAttemptRef.current = DEFAULT_URL;
            onConnect(DEFAULT_URL);
        }
    }, [connectionState, onConnect]);

    // Show custom URL input if default connection fails or user manually disconnects
    useEffect(() => {
        // Detect transition from 'connecting' to 'disconnected' (connection failed)
        if (
            prevConnectionState.current === 'connecting' &&
            connectionState === 'disconnected' &&
            connectionAttemptRef.current === DEFAULT_URL
        ) {
            setShowCustomUrl(true);
        } 
        // Show URL input if user manually disconnects (so they can reconnect)
        else if (
            prevConnectionState.current === 'connected' &&
            connectionState === 'disconnected'
        ) {
            setShowCustomUrl(true);
        }
        // Hide URL input when connected
        else if (connectionState === 'connected') {
            setShowCustomUrl(false);
        }
        
        prevConnectionState.current = connectionState;
    }, [connectionState]);

    const handleConnect = useCallback(() => {
        connectionAttemptRef.current = url;
        onConnect(url);
    }, [url, onConnect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && connectionState === 'disconnected') {
            handleConnect();
        }
    }, [handleConnect, connectionState]);

    const statusColor = {
        disconnected: 'text-red-400',
        connecting: 'text-amber-400',
        connected: 'text-emerald-400',
    }[connectionState];

    const StatusIcon = {
        disconnected: WifiOff,
        connecting: Loader2,
        connected: Wifi,
    }[connectionState];

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div className={cn("flex items-center gap-2", statusColor)}>
                <StatusIcon className={cn(
                    "size-4",
                    connectionState === 'connecting' && "animate-spin"
                )} />
                <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">
                    {connectionState}
                </span>
            </div>
            
            {showCustomUrl && (
                <div className="flex-1 max-w-md">
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="wss://multiplayer.bitbreeze.nl"
                        disabled={connectionState !== 'disconnected'}
                        className="h-8 text-sm bg-black/30 border-white/20 focus-visible:border-emerald-500/50 disabled:opacity-50"
                    />
                </div>
            )}

            {connectionState === 'disconnected' ? (
                <Button
                    onClick={handleConnect}
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                    <Plug className="size-4" />
                    <span className="hidden sm:inline">Connect</span>
                </Button>
            ) : (
                <Button
                    onClick={onDisconnect}
                    size="sm"
                    variant="outline"
                    disabled={connectionState === 'connecting'}
                    className="gap-2 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
                >
                    <Unplug className="size-4" />
                    <span className="hidden sm:inline">Disconnect</span>
                </Button>
            )}
        </div>
    );
}

