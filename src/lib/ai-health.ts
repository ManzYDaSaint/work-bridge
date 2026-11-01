import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/embedding-service";

async function getDbClient() {
    const admin = getSupabaseAdminClient();
    if (admin) return admin;
    return await createSupabaseServerClient();
}

export async function checkAiServerHealth() {
    const start = Date.now();
    try {
        // Run a lightweight embedding through the in-process pipeline
        const vector = await generateEmbedding("health check");
        const latency = Date.now() - start;
        const isValid = Array.isArray(vector) && vector.length === 384;

        return {
            status: isValid ? "ONLINE" : "DEGRADED",
            latency,
            timestamp: new Date().toISOString(),
            model: "all-MiniLM-L6-v2 (In-Process ONNX)",
            dimensions: vector.length,
        };
    } catch (error: any) {
        console.error("[AIHealth] Health check failed:", error);
        return { 
            status: "OFFLINE", 
            latency: null, 
            timestamp: new Date().toISOString(),
            error: error?.message || "Unknown error"
        };
    }
}

export async function performIntegrityScan() {
    const supabase = await getDbClient();

    // Scan for Jobs missing embeddings
    const { count: jobsMissingCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .is('embedding', null)
        .eq('status', 'ACTIVE');

    // Scan for Seekers missing embeddings
    const { count: seekersMissingCount } = await supabase
        .from('job_seekers')
        .select('*', { count: 'exact', head: true })
        .is('embedding', null)
        .neq('profile_visibility', 'HIDDEN');

    return { 
        jobsMissingCount: jobsMissingCount ?? 0, 
        seekersMissingCount: seekersMissingCount ?? 0 
    };
}

export async function processEmbeddingQueue() {
    return { processed: 0 };
}

