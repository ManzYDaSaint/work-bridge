import { createSupabaseServerClient } from "@/lib/supabase-server";

const AI_EMBEDDING_URL = "https://ai.aganyu.com/embed";

export async function checkAiServerHealth() {
    const start = Date.now();
    try {
        // Ping AI Embedding service with a minimal test input payload
        const response = await fetch(`${AI_EMBEDDING_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: 'health check' }),
            signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - start;
        return {
            status: response.ok ? 'ONLINE' : 'DEGRADED',
            latency,
            timestamp: new Date().toISOString()
        };
    } catch {
        return { status: 'OFFLINE', latency: null, timestamp: new Date().toISOString() };
    }
}

export async function performIntegrityScan() {
    const supabase = await createSupabaseServerClient();

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

    return { jobsMissingCount, seekersMissingCount };
}

export async function processEmbeddingQueue() {
    // Logic to fetch PENDING jobs from ai_embedding_jobs and process them
    // This will integrate with existing sync-embeddings.ts services
    await createSupabaseServerClient();
    return { processed: 0 };
}
