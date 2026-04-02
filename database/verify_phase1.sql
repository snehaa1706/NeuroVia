-- ============================================
-- PHASE 1 — VERIFICATION QUERIES
-- ============================================
-- Run these AFTER both Step A and Step B to confirm
-- the migration was successful.
-- ============================================


-- ✅ Test 1: Verify enum values include 'cancelled'
SELECT unnest(enum_range(NULL::consult_status)) AS status_value;
-- Expected: pending, accepted, completed, cancelled


-- ✅ Test 2: Verify new columns on consult_requests
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'consult_requests'
  AND column_name IN ('risk_level', 'key_concerns', 'suggested_actions', 'updated_at', 'deleted_at')
ORDER BY column_name;
-- Expected: 5 rows with correct types and defaults


-- ✅ Test 3: Verify consult_responses table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'consult_responses'
ORDER BY ordinal_position;
-- Expected: 8 columns (id, request_id, doctor_id, diagnosis, notes, prescription, follow_up_date, created_at)


-- ✅ Test 4: Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('consult_requests', 'consult_responses')
ORDER BY tablename, indexname;
-- Expected: 5 new indexes + existing ones preserved


-- ✅ Test 5: Verify enum constraint enforcement (should FAIL)
-- Uncomment to test — this INSERT should raise an error:
-- INSERT INTO consult_requests (patient_id, doctor_id, status)
--     VALUES (uuid_generate_v4(), uuid_generate_v4(), 'invalid_status');
-- Expected: ERROR — invalid input value for enum consult_status


-- ✅ Test 6: Verify trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'consult_requests'
  AND trigger_name = 'trg_consult_requests_updated_at';
-- Expected: 1 row — BEFORE UPDATE trigger


-- ✅ Test 7: Verify trigger functionality
-- (Run only if test data exists)
-- UPDATE consult_requests SET summary = 'trigger test' WHERE id = '<some_id>';
-- SELECT updated_at FROM consult_requests WHERE id = '<some_id>';
-- Expected: updated_at reflects current timestamp


-- ✅ Test 8: Verify RLS is enabled on consult_responses
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'consult_responses';
-- Expected: relrowsecurity = true


-- ✅ Test 9: Verify soft delete column behavior
-- (Run only if test data exists)
-- UPDATE consult_requests SET deleted_at = NOW() WHERE id = '<some_id>';
-- SELECT id, deleted_at FROM consult_requests WHERE id = '<some_id>';
-- Expected: deleted_at has a timestamp (service layer will filter these later)
