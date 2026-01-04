import { createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { AppHeader, AppFooter, CardSuitPattern } from '@/features/layout';
import { Toaster } from '@/components/ui/sonner';
import { WebSocketProvider, useWebSocketContext } from '@/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function RootLayout() {
    return (
        <WebSocketProvider>
            <RootLayoutInner />
        </WebSocketProvider>
    );
}

function RootLayoutInner() {
    const {
        connectionState,
        connect,
        disconnect,
        currentRoom,
        currentView,
    } = useWebSocketContext();

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950">
            <CardSuitPattern />
            <Toaster position="top-center" />
            
            {/* Decorative border glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            
            <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
                <AppHeader
                    currentView={currentView}
                    currentRoom={currentRoom}
                    connectionState={connectionState}
                    onConnect={connect}
                    onDisconnect={disconnect}
                />

                {/* Main Content - Route Outlet */}
                <div className="flex-1">
                    <Outlet />
                </div>

                <AppFooter />
            </div>
            
            {/* Dev tools - only in development */}
            <TanStackRouterDevtools position="bottom-right" />
        </div>
    );
}

function NotFoundComponent() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md bg-slate-900/80 border-white/10 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">🃏</div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <Link to="/connect">
                        <Button className="bg-emerald-600 hover:bg-emerald-500">
                            Go to Home
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFoundComponent,
});
