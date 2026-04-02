-- ============================================
-- PHASE 1 — STEP A: ENUM UPDATE (RUN ALONE)
-- ============================================
-- ⚠️ ALTER TYPE ... ADD VALUE is non-transactional in PostgreSQL.
-- This MUST be executed as a standalone statement.
-- DO NOT combine with any other migration queries.
-- ============================================

ALTER TYPE consult_status ADD VALUE IF NOT EXISTS 'cancelled';
