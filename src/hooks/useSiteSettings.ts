import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSiteSettings = (key: string) => {
    return useQuery({
        queryKey: ["site_settings", key],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("site_settings" as any)
                .select("value")
                .eq("key", key)
                .maybeSingle();

            if (error) {
                console.error(`Error fetching site setting for key ${key}:`, error);
                return null;
            }

            return data?.value || null;
        },
        staleTime: 1000 * 60 * 60, // 1 hour caching
    });
};
