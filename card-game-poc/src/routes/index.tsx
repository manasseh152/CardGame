import { createFileRoute, Navigate } from '@tanstack/react-router';

function IndexRoute() {
    return <Navigate to="/connect" replace />;
}

export const Route = createFileRoute('/')({
    component: IndexRoute,
});
