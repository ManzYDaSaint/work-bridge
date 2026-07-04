import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateEmbedding, constructSeekerDNA, constructJobDNA } from "./embedding-service";

/**
 * Generates a SHA-256 hash for the given string
 */
function generateHash(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Synchronizes a job seeker's professional DNA into a vector embedding in the database.
 * This should be called whenever a profile is updated.
 */
export async function syncSeekerEmbedding(userId: string, profile: any) {
    try {
        const supabase = await createSupabaseServerClient();
        const dna = constructSeekerDNA(profile);
        const newHash = generateHash(dna);

        // 1. Fetch current hash
        const { data: currentData } = await supabase
            .from("job_seekers")
            .select("dna_hash")
            .eq("id", userId)
            .single();

        // 2. If it matches, skip VPS generation
        if (currentData?.dna_hash === newHash) {
            console.log(`[SyncEmbeddings] No changes detected. Skipping VPS call for seeker: ${userId}`);
            return;
        }

        // 3. Otherwise, generate embedding and update both
        const embedding = await generateEmbedding(dna);

        const { error } = await supabase
            .from("job_seekers")
            .update({ embedding, dna_hash: newHash })
            .eq("id", userId);

        if (error) throw error;
        console.log(`[SyncEmbeddings] Successfully updated embedding for seeker: ${userId}`);
    } catch (error) {
        console.error(`[SyncEmbeddings] Error syncing seeker ${userId}:`, error);
        // We don't throw here to avoid blocking the profile save process
    }
}

/**
 * Synchronizes a job's requirement DNA into a vector embedding in the database.
 * This should be called whenever a job is created or updated.
 */
export async function syncJobEmbedding(jobId: string, job: any) {
    try {
        const supabase = await createSupabaseServerClient();
        const dna = constructJobDNA(job);
        const newHash = generateHash(dna);

        // 1. Fetch current hash
        const { data: currentData } = await supabase
            .from("jobs")
            .select("dna_hash")
            .eq("id", jobId)
            .single();

        // 2. If it matches, skip VPS generation
        if (currentData?.dna_hash === newHash) {
            console.log(`[SyncEmbeddings] No changes detected. Skipping VPS call for job: ${jobId}`);
            return;
        }

        // 3. Otherwise, generate embedding and update both
        const embedding = await generateEmbedding(dna);

        const { error } = await supabase
            .from("jobs")
            .update({ embedding, dna_hash: newHash })
            .eq("id", jobId);

        if (error) throw error;
        console.log(`[SyncEmbeddings] Successfully updated embedding for job: ${jobId}`);
    } catch (error) {
        console.error(`[SyncEmbeddings] Error syncing job ${jobId}:`, error);
    }
}
