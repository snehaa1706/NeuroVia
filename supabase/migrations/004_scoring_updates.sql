ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS cognitive_score FLOAT DEFAULT 0;

ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS risk_score FLOAT DEFAULT 0;
