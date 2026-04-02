-- Migration: Add Cognitive Engine Tables
-- Run this in Supabase SQL Editor

-- 1. Cognitive Sessions
CREATE TABLE cognitive_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    test_config JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TRIGGER update_cognitive_sessions_updated_at
    BEFORE UPDATE ON cognitive_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Cognitive Results
CREATE TABLE cognitive_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cognitive_sessions(id) ON DELETE CASCADE UNIQUE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    score FLOAT NOT NULL,
    responses JSONB NOT NULL,
    metadata JSONB,
    time_taken_seconds FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX idx_cognitive_sessions_patient_status ON cognitive_sessions(patient_id, status);
CREATE INDEX idx_cognitive_results_patient_test ON cognitive_results(patient_id, test_type);
CREATE INDEX idx_cognitive_results_session_id ON cognitive_results(session_id);

-- 4. RLS
ALTER TABLE cognitive_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON cognitive_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON cognitive_results
    FOR ALL USING (true) WITH CHECK (true);
