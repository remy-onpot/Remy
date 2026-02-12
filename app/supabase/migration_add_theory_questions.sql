-- Migration: Add support for long_answer and comprehension question types
-- Date: 2026-02-12
-- Description: Adds context and sample_answer columns, updates type constraint

BEGIN;

-- 1. Add new columns to support theory and comprehension questions
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS context TEXT,
ADD COLUMN IF NOT EXISTS sample_answer TEXT;

-- 2. Update the type constraint to include new question types
ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE questions 
ADD CONSTRAINT questions_type_check 
CHECK (type IN ('mcq', 'boolean', 'short_answer', 'long_answer', 'comprehension'));

-- 3. Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions'
AND column_name IN ('context', 'sample_answer', 'type');

COMMIT;
