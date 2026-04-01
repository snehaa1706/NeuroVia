ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1;

ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
