import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'manager' | 'sales' | 'ops' | null;

export const useRole = () => {
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setRole(null);
                setLoading(false);
                return;
            }

            const { data, error } = await (supabase
                .from("user_roles" as any) as any)
                .select("role")
                .eq("user_id", session.user.id)
                .single() as { data: any, error: any };

            if (error || !data) {
                setRole(null);
            } else {
                setRole(data.role as UserRole);
            }
            setLoading(false);
        };

        fetchRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchRole();
        });

        return () => subscription.unsubscribe();
    }, []);

    return { role, loading };
};
