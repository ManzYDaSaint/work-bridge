-- Migration: Add dna_hash for Embedding Caching
-- This avoids redundant generation of embeddings for content that hasn't changed.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS dna_hash TEXT;
ALTER TABLE public.job_seekers ADD COLUMN IF NOT EXISTS dna_hash TEXT;
