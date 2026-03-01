import { Navigate } from "react-router-dom";
import { useRole, UserRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

/**
 * ProtectedRoute wraps a component and ensures only users with an allowed role
 * can render it. Unauthorized or unauthenticated users are redirected to /admin/bookings.
 * This prevents URL-bar bypass of sidebar role filtering.
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const { role, loading } = useRole();

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        );
    }

    if (!role || !allowedRoles.includes(role)) {
        return <Navigate to="/admin/bookings" replace />;
    }

    return <>{children}</>;
}
