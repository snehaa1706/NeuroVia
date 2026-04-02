-- ============================================
-- PHASE 1 — STEP B: MAIN MIGRATION
-- ============================================
-- Run this AFTER step_a_enum_update.sql has been executed.
-- This file is safe to run inside a transaction block.
-- ============================================


-- ============================================
-- 1. ALTER consult_requests — Add new columns
-- ============================================

ALTER TABLE consult_requests
    ADD COLUMN IF NOT EXISTS risk_level       TEXT,
    ADD COLUMN IF NOT EXISTS key_concerns     JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS suggested_actions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;


-- ============================================
-- 2. CREATE consult_responses table
-- ============================================

CREATE TABLE IF NOT EXISTS consult_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL REFERENCES consult_requests(id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    diagnosis       TEXT,
    notes           TEXT,
    prescription    JSONB DEFAULT '[]'::jsonb,
    follow_up_date  DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 3. INDEXES — Compound (keep existing ones)
-- ============================================

-- consult_requests compound indexes
CREATE INDEX IF NOT EXISTS idx_consult_req_patient_status
    ON consult_requests(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_consult_req_doctor_status
    ON consult_requests(doctor_id, status);

CREATE INDEX IF NOT EXISTS idx_consult_req_status
    ON consult_requests(status);

-- consult_responses indexes
CREATE INDEX IF NOT EXISTS idx_consult_resp_request
    ON consult_responses(request_id);

CREATE INDEX IF NOT EXISTS idx_consult_resp_doctor
    ON consult_responses(doctor_id);


-- ============================================
-- 4. RLS — consult_responses
-- ============================================

ALTER TABLE consult_responses ENABLE ROW LEVEL SECURITY;

-- Service role full access (matches existing pattern)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'consult_responses'
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON consult_responses
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;


-- ============================================
-- 5. TRIGGER — Auto-update updated_at
-- ============================================

-- Idempotent trigger function
CREATE OR REPLACE FUNCTION update_consult_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe trigger creation (drop if exists, then create)
DROP TRIGGER IF EXISTS trg_consult_requests_updated_at ON consult_requests;

CREATE TRIGGER trg_consult_requests_updated_at
    BEFORE UPDATE ON consult_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_consult_requests_updated_at();


-- ============================================
-- MIGRATION COMPLETE
-- ============================================
