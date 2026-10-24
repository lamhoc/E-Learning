-- Migration: Create exam_proctoring_logs table to record student tab switches and anti-cheat violations

CREATE TABLE IF NOT EXISTS public.exam_proctoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_type text NOT NULL DEFAULT 'tab_switch',
  switch_count integer NOT NULL DEFAULT 1 CHECK (switch_count > 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by attempt_id
CREATE INDEX IF NOT EXISTS idx_exam_proctoring_logs_attempt_id
  ON public.exam_proctoring_logs(attempt_id);

CREATE INDEX IF NOT EXISTS idx_exam_proctoring_logs_student_id
  ON public.exam_proctoring_logs(student_id);

-- Enable Row Level Security
ALTER TABLE public.exam_proctoring_logs ENABLE ROW LEVEL SECURITY;

-- Students can read their own logs
DROP POLICY IF EXISTS exam_proctoring_logs_student_select ON public.exam_proctoring_logs;
CREATE POLICY exam_proctoring_logs_student_select ON public.exam_proctoring_logs
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert logs during their attempts
DROP POLICY IF EXISTS exam_proctoring_logs_student_insert ON public.exam_proctoring_logs;
CREATE POLICY exam_proctoring_logs_student_insert ON public.exam_proctoring_logs
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers and admins can view all proctoring logs
DROP POLICY IF EXISTS exam_proctoring_logs_teacher_select ON public.exam_proctoring_logs;
CREATE POLICY exam_proctoring_logs_teacher_select ON public.exam_proctoring_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

