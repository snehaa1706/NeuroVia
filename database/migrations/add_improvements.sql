-- Migration: Production Improvements
-- Adds composite indexes, score_components column, and cognitive_summary_cache table.
-- Run this in Supabase SQL Editor AFTER the initial cognitive tables migration.

-- ============================================
-- 1. COMPOSITE INDEXES (patient_id, created_at DESC)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cognitive_sessions_patient_created
ON cognitive_sessions (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cognitive_results_patient_created
ON cognitive_results (patient_id, created_at DESC);

-- Partial index for summary lookups (non-null scores only)
CREATE INDEX IF NOT EXISTS idx_cognitive_results_patient_latest
ON cognitive_results (patient_id, created_at DESC)
WHERE score IS NOT NULL;

-- ============================================
-- 2. SCORE COMPONENTS COLUMN
-- ============================================

ALTER TABLE cognitive_results
ADD COLUMN IF NOT EXISTS score_components JSONB NOT NULL DEFAULT '{}';

-- ============================================
-- 3. COGNITIVE SUMMARY CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cognitive_summary_cache (
    patient_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    latest_score FLOAT,
    average_score FLOAT,
    trend_direction TEXT,
    recent_scores JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Monitoring index for staleness checks
CREATE INDEX IF NOT EXISTS idx_summary_cache_updated
ON cognitive_summary_cache (last_updated DESC);

-- ============================================
-- 4. RLS FOR CACHE TABLE
-- ============================================

ALTER TABLE cognitive_summary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON cognitive_summary_cache
    FOR ALL USING (true) WITH CHECK (true);
