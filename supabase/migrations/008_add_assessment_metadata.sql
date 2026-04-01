-- Phase 8: Add metadata column to assessments for session-specific context
-- Stores structured JSONB data like digit_span expected sequences.
-- Structure contract:
-- {
--   "digit_span": {
--     "expected": "7392",
--     "generated_at": "2026-03-29T16:00:00Z"
--   }
-- }

ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
