/**
 * Aganyu Job Ingestion Engine — Duplicate Detection Engine
 *
 * Implements 3-tier duplicate detection:
 * Tier 1: Exact source URL hash match
 * Tier 2: DNA Hash match (MD5 of title + company + deadline)
 * Tier 3: Vector Embedding Cosine Similarity (using existing MiniLM-L6-v2 384d model)
 */

import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { constructJobDNA, generateEmbedding } from "@/lib/embedding-service";
import type { StructuredJobFields } from "./types";

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    duplicateOfJobId: string | null;
    similarityScore: number;
    matchTier: 'URL_HASH' | 'DNA_HASH' | 'VECTOR_COSINE' | 'NONE';
    dnaHash: string;
    sourceUrlHash: string | null;
    embedding: number[] | null;
}

export function computeUrlHash(url: string | null): string | null {
    if (!url) return null;
    return crypto.createHash('sha256').update(url.trim().toLowerCase()).digest('hex');
}

export function computeJobDnaHash(job: Partial<StructuredJobFields>): string {
    const raw = [
        (job.title || '').trim().toLowerCase(),
        (job.display_company_name || '').trim().toLowerCase(),
        (job.deadline || '').trim(),
    ].join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
}

export async function checkForDuplicates(
    job: Partial<StructuredJobFields>,
    sourceUrl: string | null,
    vectorSimilarityThreshold: number = 0.88
): Promise<DuplicateCheckResult> {
    const supabase = getSupabaseAdminClient();
    const dnaHash = computeJobDnaHash(job);
    const sourceUrlHash = computeUrlHash(sourceUrl);

    // ── Tier 1: URL Hash Match ──────────────────────────────────────────
    if (sourceUrlHash && supabase) {
        const { data: urlMatch } = await supabase
            .from('jobs')
            .select('id')
            .eq('source_content_hash', sourceUrlHash)
            .maybeSingle();

        if (urlMatch) {
            return {
                isDuplicate: true,
                duplicateOfJobId: urlMatch.id,
                similarityScore: 1.0,
                matchTier: 'URL_HASH',
                dnaHash,
                sourceUrlHash,
                embedding: null,
            };
        }
    }

    // ── Tier 2: DNA Hash Match ──────────────────────────────────────────
    if (supabase) {
        const { data: dnaMatch } = await supabase
            .from('jobs')
            .select('id')
            .eq('dna_hash', dnaHash)
            .maybeSingle();

        if (dnaMatch) {
            return {
                isDuplicate: true,
                duplicateOfJobId: dnaMatch.id,
                similarityScore: 1.0,
                matchTier: 'DNA_HASH',
                dnaHash,
                sourceUrlHash,
                embedding: null,
            };
        }
    }

    // ── Tier 3: Vector Embedding Cosine Similarity ──────────────────────
    let embedding: number[] | null = null;
    try {
        const dnaText = constructJobDNA({
            title: job.title || '',
            description: job.description || '',
            location: job.location || '',
            type: job.type || 'Full-time',
            skills: job.skills || [],
            must_have_skills: job.must_have_skills || [],
            nice_to_have_skills: job.nice_to_have_skills || [],
            qualification: job.qualification || undefined,
            minimum_years_experience: job.minimum_years_experience || 0,
        });

        embedding = await generateEmbedding(dnaText);

        if (embedding && supabase) {
            // Check cosine similarity against existing published jobs using pgvector
            const { data: matches, error } = await supabase.rpc('match_duplicate_jobs', {
                query_embedding: embedding,
                match_threshold: vectorSimilarityThreshold,
                match_count: 1,
            });

            if (!error && matches && matches.length > 0) {
                const topMatch = matches[0];
                return {
                    isDuplicate: true,
                    duplicateOfJobId: topMatch.id,
                    similarityScore: topMatch.similarity,
                    matchTier: 'VECTOR_COSINE',
                    dnaHash,
                    sourceUrlHash,
                    embedding,
                };
            }
        }
    } catch (err) {
        console.error('[DuplicateDetector] Vector embedding generation error:', err);
    }

    return {
        isDuplicate: false,
        duplicateOfJobId: null,
        similarityScore: 0,
        matchTier: 'NONE',
        dnaHash,
        sourceUrlHash,
        embedding,
    };
}
