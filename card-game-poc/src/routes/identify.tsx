import { createFileRoute, Navigate } from '@tanstack/react-router';
import { IdentifyView } from '@/features/identity';
import { useWebSocketContext } from '@/context';

function IdentifyRoute() {
    const { identify, connectionState, playerName } = useWebSocketContext();

    // Guard: redirect if not connected
    if (connectionState !== 'connected') {
        return <Navigate to="/connect" replace />;
    }

    // Guard: redirect if already identified
    if (playerName) {
        return <Navigate to="/rooms" replace />;
    }
    
    return <IdentifyView onIdentify={identify} />;
}

export const Route = createFileRoute('/identify')({
    component: IdentifyRoute,
});
