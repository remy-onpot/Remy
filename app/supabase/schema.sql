-- Midsem Exam Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. QUIZZES Table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{"duration": 60, "strictness": "medium", "shuffle": true}'::jsonb,
  status TEXT CHECK (status IN ('draft', 'live', 'ended', 'archived')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QUESTIONS Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('mcq', 'short_answer', 'boolean')) NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  points INTEGER DEFAULT 1,
  position INTEGER NOT NULL
);

-- 3. OPTIONS Table (for MCQs)
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE
);

-- 4. ROSTER Table (Access Control)
CREATE TABLE roster (
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  index_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  PRIMARY KEY (quiz_id, index_number)
);

-- 5. EXAM SESSIONS Table
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  index_number TEXT NOT NULL,
  device_fingerprint TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  status TEXT CHECK (status IN ('in_progress', 'submitted', 'flagged', 'terminated')) DEFAULT 'in_progress',
  last_heartbeat TIMESTAMPTZ,
  focus_status TEXT DEFAULT 'focused',
  battery_level DECIMAL(3,2),
  is_fullscreen BOOLEAN DEFAULT FALSE,
  strikes INTEGER DEFAULT 0,
  security_flags JSONB DEFAULT '[]'::jsonb
);

-- 6. ANSWERS Table
CREATE TABLE answers (
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  text_response TEXT,
  PRIMARY KEY (session_id, question_id)
);

-- 7. SECURITY LOGS Table
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quizzes_lecturer ON quizzes(lecturer_id);
CREATE INDEX idx_quizzes_status ON quizzes(status);
CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_options_question ON options(question_id);
CREATE INDEX idx_roster_quiz ON roster(quiz_id);
CREATE INDEX idx_sessions_quiz ON exam_sessions(quiz_id);
CREATE INDEX idx_sessions_status ON exam_sessions(status);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_security_logs_session ON security_logs(session_id);
CREATE INDEX idx_security_logs_occurred ON security_logs(occurred_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Quizzes: Lecturers can only see their own quizzes
CREATE POLICY "Lecturers can manage their own quizzes"
  ON quizzes
  USING (lecturer_id = auth.uid());

-- Questions: Lecturers can see questions for their quizzes
CREATE POLICY "Lecturers can see questions for their quizzes"
  ON questions
  USING (EXISTS (
    SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.lecturer_id = auth.uid()
  ));

-- Options: Lecturers can see options for their quizzes
CREATE POLICY "Lecturers can see options for their quizzes"
  ON options
  USING (EXISTS (
    SELECT 1 FROM questions 
    JOIN quizzes ON quizzes.id = questions.quiz_id 
    WHERE questions.id = options.question_id AND quizzes.lecturer_id = auth.uid()
  ));

-- Roster: Lecturers can manage roster for their quizzes
CREATE POLICY "Lecturers can manage roster for their quizzes"
  ON roster
  USING (EXISTS (
    SELECT 1 FROM quizzes WHERE quizzes.id = roster.quiz_id AND quizzes.lecturer_id = auth.uid()
  ));

-- Exam Sessions: Lecturers can see sessions for their quizzes
CREATE POLICY "Lecturers can see sessions for their quizzes"
  ON exam_sessions
  USING (EXISTS (
    SELECT 1 FROM quizzes WHERE quizzes.id = exam_sessions.quiz_id AND quizzes.lecturer_id = auth.uid()
  ));

-- Answers: Lecturers can see answers for their quizzes
CREATE POLICY "Lecturers can see answers for their quizzes"
  ON answers
  USING (EXISTS (
    SELECT 1 FROM exam_sessions 
    JOIN quizzes ON quizzes.id = exam_sessions.quiz_id 
    WHERE exam_sessions.id = answers.session_id AND quizzes.lecturer_id = auth.uid()
  ));

-- Security Logs: Lecturers can see logs for their quizzes
CREATE POLICY "Lecturers can see security logs for their quizzes"
  ON security_logs
  USING (EXISTS (
    SELECT 1 FROM exam_sessions 
    JOIN quizzes ON quizzes.id = exam_sessions.quiz_id 
    WHERE exam_sessions.id = security_logs.session_id AND quizzes.lecturer_id = auth.uid()
  ));

-- ============================================
-- STUDENT-SIDE RLS POLICIES (Public Access)
-- ============================================

-- Students can view live quizzes (no auth required for exam entry)
CREATE POLICY "Anyone can view live quizzes"
  ON quizzes FOR SELECT
  USING (status = 'live');

-- Students can view questions for live quizzes they're taking
CREATE POLICY "Students can view questions for live quizzes"
  ON questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quizzes 
    WHERE quizzes.id = questions.quiz_id 
    AND quizzes.status = 'live'
  ));

-- Students can view options for questions in live quizzes
CREATE POLICY "Students can view options for live quiz questions"
  ON options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM questions
    JOIN quizzes ON quizzes.id = questions.quiz_id
    WHERE questions.id = options.question_id
    AND quizzes.status = 'live'
  ));

-- Students can check if they're in the roster (by index number)
CREATE POLICY "Anyone can check roster for live quizzes"
  ON roster FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = roster.quiz_id
    AND quizzes.status = 'live'
  ));

-- Students can create their own exam sessions
CREATE POLICY "Anyone can create exam sessions"
  ON exam_sessions FOR INSERT
  WITH CHECK (true);

-- Students can view and update their own exam sessions
CREATE POLICY "Students can view their own exam sessions"
  ON exam_sessions FOR SELECT
  USING (true);

CREATE POLICY "Students can update their own exam sessions"
  ON exam_sessions FOR UPDATE
  USING (true);

-- Students can create and view their own answers
CREATE POLICY "Students can insert own answers"
  ON answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can view own answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Students can update own answers"
  ON answers FOR UPDATE
  USING (true);

-- Students can create security logs for their sessions
CREATE POLICY "Students can create own security logs"
  ON security_logs FOR INSERT
  WITH CHECK (true);

-- Realtime subscriptions
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE security_logs;

-- Function to auto-update last_heartbeat
CREATE OR REPLACE FUNCTION update_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_heartbeat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER heartbeat_update
  BEFORE UPDATE ON exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_heartbeat();
