-- ============================================
-- MIGRATION: Caregiver Platform Tables
-- Run manually in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TRIGGER FUNCTION (updated_at auto-update)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TABLE: caregiver_assignments
-- ============================================

CREATE TABLE caregiver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_caregiver_patient UNIQUE (caregiver_id, patient_id)
);

-- Indexes
CREATE INDEX idx_caregiver_assignments_caregiver_id
    ON caregiver_assignments(caregiver_id);

CREATE INDEX idx_caregiver_assignments_patient_id
    ON caregiver_assignments(patient_id);

CREATE INDEX idx_caregiver_assignments_pair
    ON caregiver_assignments(caregiver_id, patient_id);

-- Auto-update trigger
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON caregiver_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. TABLE: caregiver_incidents
-- ============================================

CREATE TABLE caregiver_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX idx_incidents_caregiver_id
    ON caregiver_incidents(caregiver_id);

CREATE INDEX idx_incidents_patient_id
    ON caregiver_incidents(patient_id);

CREATE INDEX idx_incidents_patient_time
    ON caregiver_incidents(patient_id, created_at DESC);

-- Auto-update trigger
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON caregiver_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. TABLE: caregiver_guidance (AI cache)
-- ============================================

CREATE TABLE caregiver_guidance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guidance JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);

-- Unique partial index: only one active (non-deleted) guidance per patient
CREATE UNIQUE INDEX idx_unique_active_guidance
    ON caregiver_guidance(patient_id)
    WHERE deleted_at IS NULL;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE caregiver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_guidance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON caregiver_assignments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON caregiver_incidents
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON caregiver_guidance
    FOR ALL USING (true) WITH CHECK (true);
