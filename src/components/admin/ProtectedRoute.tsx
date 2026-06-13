import { Navigate } from "react-router-dom";
import { useRole, UserRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        if (!loading && role && !allowedRoles.includes(role)) {
            toast.error("Access Denied", {
                description: "You do not have administrative clearance to access that module.",
                duration: 4000,
            });
            const timer = setTimeout(() => {
                setShouldRedirect(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [role, loading, allowedRoles]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        );
    }

    if (!role) {
        return <Navigate to="/admin/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        if (shouldRedirect) {
            return <Navigate to="/admin/bookings" replace />;
        }
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        );
    }

    return <>{children}</>;
}
