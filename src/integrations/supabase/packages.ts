import { supabase } from "./client";

export const getPackages = async () => {
    const { data, error } = await supabase
        .from("packages")
        .select("id, title, description, destination, price, duration, is_popular, inclusions")
        .eq("is_active", true)
        .order("is_popular", { ascending: false });

    if (error) throw error;
    return data;
};
