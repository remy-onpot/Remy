-- ============================================
-- PRE-MIGRATION VERIFICATION
-- Run this BEFORE the migration to see current state
-- ============================================

-- Check current exam_sessions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'exam_sessions'
ORDER BY ordinal_position;

-- Check current constraint on status column
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'exam_sessions'
AND con.conname LIKE '%status%';

-- Check security_logs columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'security_logs'
ORDER BY ordinal_position;

-- List current indexes on exam_sessions
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'exam_sessions'
ORDER BY indexname;

-- ============================================
-- POST-MIGRATION VERIFICATION  
-- Run this AFTER the migration to confirm success
-- ============================================

-- Verify new columns exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_sessions' AND column_name = 'user_agent'
  ) THEN '✅ user_agent column exists'
  ELSE '❌ user_agent column MISSING' END AS user_agent_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_sessions' AND column_name = 'security_flags'
  ) THEN '✅ security_flags column exists'
  ELSE '❌ security_flags column MISSING' END AS security_flags_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_logs' AND column_name = 'metadata'
  ) THEN '✅ metadata column exists'
  ELSE '❌ metadata column MISSING' END AS metadata_check;

-- Verify status constraint includes 'terminated'
SELECT 
  CASE WHEN pg_get_constraintdef(con.oid) LIKE '%terminated%'
  THEN '✅ Status constraint includes terminated'
  ELSE '❌ Status constraint MISSING terminated' END AS status_constraint_check
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'exam_sessions'
AND con.conname LIKE '%status%';

-- Verify new indexes exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'exam_sessions' AND indexname = 'idx_sessions_user_agent'
  ) THEN '✅ idx_sessions_user_agent exists'
  ELSE '❌ idx_sessions_user_agent MISSING' END AS ua_index_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'exam_sessions' AND indexname = 'idx_sessions_security_flags'
  ) THEN '✅ idx_sessions_security_flags exists'
  ELSE '❌ idx_sessions_security_flags MISSING' END AS flags_index_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'exam_sessions' AND indexname = 'idx_sessions_index_status'
  ) THEN '✅ idx_sessions_index_status exists'
  ELSE '❌ idx_sessions_index_status MISSING' END AS index_status_check;

-- Verify functions exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'log_security_event'
  ) THEN '✅ log_security_event() exists'
  ELSE '❌ log_security_event() MISSING' END AS log_event_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'add_security_flag'
  ) THEN '✅ add_security_flag() exists'
  ELSE '❌ add_security_flag() MISSING' END AS add_flag_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_strikes_on_violation'
  ) THEN '✅ increment_strikes_on_violation() exists'
  ELSE '❌ increment_strikes_on_violation() MISSING' END AS increment_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auto_flag_on_strikes'
  ) THEN '✅ auto_flag_on_strikes() exists'
  ELSE '❌ auto_flag_on_strikes() MISSING' END AS auto_flag_check;

-- Verify triggers exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_increment_strikes'
  ) THEN '✅ trigger_increment_strikes exists'
  ELSE '❌ trigger_increment_strikes MISSING' END AS increment_trigger_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_flag'
  ) THEN '✅ trigger_auto_flag exists'
  ELSE '❌ trigger_auto_flag MISSING' END AS auto_flag_trigger_check;

-- Verify security view exists
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'session_security_summary'
  ) THEN '✅ session_security_summary view exists'
  ELSE '❌ session_security_summary view MISSING' END AS view_check;

-- SUMMARY: All Features Check
SELECT 
  COUNT(*) FILTER (WHERE column_name IN ('user_agent', 'security_flags')) as new_session_columns,
  COUNT(*) FILTER (WHERE column_name = 'metadata') as new_log_columns
FROM information_schema.columns 
WHERE table_name IN ('exam_sessions', 'security_logs');
-- Should return: new_session_columns=2, new_log_columns=1

-- ============================================
-- TEST QUERIES (After Migration)
-- ============================================

-- Test 1: Insert a test session with new fields
-- INSERT INTO exam_sessions (quiz_id, index_number, device_fingerprint, user_agent)
-- VALUES (
--   (SELECT id FROM quizzes LIMIT 1),
--   'TEST001',
--   'test_fingerprint_123',
--   'Mozilla/5.0 (Test Browser)'
-- );

-- Test 2: Test the log_security_event function
-- SELECT log_security_event(
--   (SELECT id FROM exam_sessions LIMIT 1),
--   'user_agent_mismatch',
--   '{"original": "Chrome", "current": "Firefox"}'::jsonb
-- );

-- Test 3: Query the security summary view
-- SELECT * FROM session_security_summary LIMIT 5;

-- ============================================
-- ROLLBACK (Emergency Only)
-- ============================================

-- CAUTION: Only run if you need to undo the migration

-- Remove new columns (THIS WILL DELETE DATA!)
-- ALTER TABLE exam_sessions DROP COLUMN IF EXISTS user_agent;
-- ALTER TABLE exam_sessions DROP COLUMN IF EXISTS security_flags;
-- ALTER TABLE security_logs DROP COLUMN IF EXISTS metadata;

-- Remove new indexes
-- DROP INDEX IF EXISTS idx_sessions_user_agent;
-- DROP INDEX IF EXISTS idx_sessions_security_flags;
-- DROP INDEX IF EXISTS idx_sessions_index_status;

-- Remove functions
-- DROP FUNCTION IF EXISTS log_security_event;
-- DROP FUNCTION IF EXISTS add_security_flag;
-- DROP FUNCTION IF EXISTS increment_strikes_on_violation CASCADE;
-- DROP FUNCTION IF EXISTS auto_flag_on_strikes CASCADE;

-- Remove view
-- DROP VIEW IF EXISTS session_security_summary;

-- Restore old constraint
-- ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_status_check;
-- ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_status_check 
--   CHECK (status IN ('in_progress', 'submitted', 'flagged'));
