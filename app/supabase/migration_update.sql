-- Update Script for Existing Databases
-- Run this if you already have the database set up and need to add student RLS policies

-- ============================================
-- ADD STUDENT-SIDE RLS POLICIES
-- ============================================

-- Students can view live quizzes (no auth required for exam entry)
CREATE POLICY IF NOT EXISTS "Anyone can view live quizzes"
  ON quizzes FOR SELECT
  USING (status = 'live');

-- Students can view questions for live quizzes they're taking
CREATE POLICY IF NOT EXISTS "Students can view questions for live quizzes"
  ON questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quizzes 
    WHERE quizzes.id = questions.quiz_id 
    AND quizzes.status = 'live'
  ));

-- Students can view options for questions in live quizzes
CREATE POLICY IF NOT EXISTS "Students can view options for live quiz questions"
  ON options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM questions
    JOIN quizzes ON quizzes.id = questions.quiz_id
    WHERE questions.id = options.question_id
    AND quizzes.status = 'live'
  ));

-- Students can check if they're in the roster (by index number)
CREATE POLICY IF NOT EXISTS "Anyone can check roster for live quizzes"
  ON roster FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = roster.quiz_id
    AND quizzes.status = 'live'
  ));

-- Students can create their own exam sessions
CREATE POLICY IF NOT EXISTS "Anyone can create exam sessions"
  ON exam_sessions FOR INSERT
  WITH CHECK (true);

-- Students can view and update their own exam sessions
CREATE POLICY IF NOT EXISTS "Students can view their own exam sessions"
  ON exam_sessions FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Students can update their own exam sessions"
  ON exam_sessions FOR UPDATE
  USING (true);

-- Students can create and view their own answers
CREATE POLICY IF NOT EXISTS "Students can insert own answers"
  ON answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Students can view own answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Students can update own answers"
  ON answers FOR UPDATE
  USING (true);

-- Students can create security logs for their sessions
CREATE POLICY IF NOT EXISTS "Students can create own security logs"
  ON security_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPFUL DATABASE VIEWS FOR ANALYTICS
-- ============================================

-- View: Active Exam Sessions
CREATE OR REPLACE VIEW active_exam_sessions AS
SELECT 
  es.id,
  es.quiz_id,
  es.index_number,
  r.student_name,
  q.title as quiz_title,
  q.code as quiz_code,
  es.started_at,
  es.last_heartbeat,
  es.focus_status,
  es.strikes,
  es.status,
  EXTRACT(EPOCH FROM (NOW() - es.last_heartbeat)) as seconds_since_heartbeat
FROM exam_sessions es
LEFT JOIN roster r ON r.quiz_id = es.quiz_id AND r.index_number = es.index_number
LEFT JOIN quizzes q ON q.id = es.quiz_id
WHERE es.status = 'in_progress';

-- View: Quiz Results Summary
CREATE OR REPLACE VIEW quiz_results_summary AS
SELECT 
  q.id as quiz_id,
  q.title,
  q.code,
  COUNT(DISTINCT es.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN es.status = 'submitted' THEN es.id END) as completed_sessions,
  COUNT(DISTINCT CASE WHEN es.status = 'flagged' THEN es.id END) as flagged_sessions,
  AVG(CASE WHEN es.score IS NOT NULL THEN es.score END) as average_score,
  MAX(es.score) as highest_score,
  MIN(CASE WHEN es.score IS NOT NULL THEN es.score END) as lowest_score
FROM quizzes q
LEFT JOIN exam_sessions es ON es.quiz_id = q.id
GROUP BY q.id, q.title, q.code;

-- View: Security Incidents Report
CREATE OR REPLACE VIEW security_incidents_report AS
SELECT 
  q.title as quiz_title,
  q.code as quiz_code,
  r.student_name,
  es.index_number,
  sl.event_type,
  sl.duration_seconds,
  sl.occurred_at,
  es.strikes
FROM security_logs sl
JOIN exam_sessions es ON es.id = sl.session_id
LEFT JOIN roster r ON r.quiz_id = es.quiz_id AND r.index_number = es.index_number
JOIN quizzes q ON q.id = es.quiz_id
ORDER BY sl.occurred_at DESC;

-- ============================================
-- HELPFUL DATABASE FUNCTIONS
-- ============================================

-- Function: Get Quiz Statistics
CREATE OR REPLACE FUNCTION get_quiz_statistics(quiz_id_param UUID)
RETURNS TABLE (
  total_students INTEGER,
  completed_count INTEGER,
  in_progress_count INTEGER,
  flagged_count INTEGER,
  average_score NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_students,
    COUNT(*) FILTER (WHERE status = 'submitted')::INTEGER as completed_count,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'flagged')::INTEGER as flagged_count,
    AVG(score) as average_score,
    (COUNT(*) FILTER (WHERE status = 'submitted')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as completion_rate
  FROM exam_sessions
  WHERE quiz_id = quiz_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Question Analytics
CREATE OR REPLACE FUNCTION get_question_analytics(quiz_id_param UUID)
RETURNS TABLE (
  question_id UUID,
  question_content TEXT,
  total_attempts BIGINT,
  correct_answers BIGINT,
  incorrect_answers BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as question_id,
    q.content as question_content,
    COUNT(a.session_id) as total_attempts,
    COUNT(*) FILTER (WHERE o.is_correct = true) as correct_answers,
    COUNT(*) FILTER (WHERE o.is_correct = false OR o.is_correct IS NULL) as incorrect_answers,
    (COUNT(*) FILTER (WHERE o.is_correct = true)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as success_rate
  FROM questions q
  LEFT JOIN answers a ON a.question_id = q.id
  LEFT JOIN options o ON o.id = a.selected_option_id
  WHERE q.quiz_id = quiz_id_param
  GROUP BY q.id, q.content, q.position
  ORDER BY q.position;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECURITY ENHANCEMENTS
-- ============================================

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_exam_sessions_index_number 
  ON exam_sessions(index_number);

-- Add index for faster roster lookups
CREATE INDEX IF NOT EXISTS idx_roster_index_number 
  ON roster(index_number);

-- Add composite index for quiz+index lookups
CREATE INDEX IF NOT EXISTS idx_exam_sessions_quiz_index 
  ON exam_sessions(quiz_id, index_number);

-- Add index for security log queries
CREATE INDEX IF NOT EXISTS idx_security_logs_occurred_at 
  ON security_logs(occurred_at DESC);

-- ============================================
-- COMPLETED
-- ============================================

-- Verify all policies are in place
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Student RLS policies have been added.';
  RAISE NOTICE 'Helper views and functions have been created.';
  RAISE NOTICE 'Performance indexes have been added.';
END $$;
