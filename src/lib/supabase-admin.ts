import { createClient } from "@supabase/supabase-js";

export const getSupabaseAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || 
                process.env.SERVICE_ROLE_KEY || 
                process.env.NEXT_SUPABASE_SERVICE_KEY;

    if (!url || !key) {
        console.error("[NOTIFICATION_DEBUG] Admin client failed: Missing URL or Key.");
        return null;
    }

    // Optimization for serverless: disable session persistence and auto-refresh
    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
    });
};
