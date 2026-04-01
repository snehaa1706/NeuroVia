-- Resolves table naming discrepancy
ALTER TABLE IF EXISTS screenings RENAME TO assessments;
ALTER TABLE IF EXISTS screening_results RENAME TO assessment_results;
ALTER TYPE IF EXISTS screening_status RENAME TO assessment_status;
ALTER TYPE IF EXISTS screening_level RENAME TO assessment_level;

ALTER TABLE assessments RENAME CONSTRAINT screenings_user_id_fkey TO assessments_user_id_fkey;
ALTER TABLE IF EXISTS assessment_results RENAME COLUMN screening_id TO assessment_id;
ALTER TABLE IF EXISTS ai_analyses RENAME COLUMN screening_id TO assessment_id;
ALTER TABLE IF EXISTS consult_requests RENAME COLUMN screening_id TO assessment_id;

ALTER INDEX IF EXISTS idx_screenings_user RENAME TO idx_assessments_user;
ALTER INDEX IF EXISTS idx_screening_results_screening RENAME TO idx_assessment_results_assessment;
ALTER INDEX IF EXISTS idx_ai_analyses_screening RENAME TO idx_ai_analyses_assessment;
