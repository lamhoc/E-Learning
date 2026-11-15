-- Migration: Add auto_grade_essay boolean column to public.exams
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS auto_grade_essay BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exams.auto_grade_essay IS 'Indicates whether essay questions in this exam are auto-graded by matching student answers with model answers.';
