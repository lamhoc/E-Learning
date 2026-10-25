-- ==============================================================================
-- Migration: Create assignments and assignment_submissions tables & storage
-- ==============================================================================

-- 1. Create table assignments (Bài tập về nhà theo lớp)
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  attachment_url text,
  attachment_name text,
  due_date timestamptz NOT NULL,
  max_score numeric(5,2) NOT NULL DEFAULT 10.0 CHECK (max_score > 0),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(title)) > 0)
);

-- Index tra cứu bài tập theo lớp và hạn nộp
CREATE INDEX IF NOT EXISTS idx_assignments_class_due
  ON public.assignments(class_id, due_date DESC);

-- 2. Create table assignment_submissions (Bài nộp của sinh viên)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  is_late boolean NOT NULL DEFAULT false,
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  feedback text,
  graded_at timestamptz,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Index tra cứu bài nộp theo bài tập và sinh viên
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON public.assignment_submissions(assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student
  ON public.assignment_submissions(student_id, submitted_at DESC);

-- 3. Tạo Storage Bucket cho assignments (dung lượng tối đa 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignments',
  'assignments',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- 4.1 RLS Policies cho assignments
DROP POLICY IF EXISTS "assignments_select_policy" ON public.assignments;
CREATE POLICY "assignments_select_policy" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    -- Giảng viên sở hữu lớp hoặc Admin
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = assignments.class_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
    OR
    -- Sinh viên được ghi danh trong lớp
    EXISTS (
      SELECT 1 FROM public.class_memberships cm
      WHERE cm.class_id = assignments.class_id
        AND cm.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_modify_policy" ON public.assignments;
CREATE POLICY "assignments_modify_policy" ON public.assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = assignments.class_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = assignments.class_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
  );

-- 4.2 RLS Policies cho assignment_submissions
DROP POLICY IF EXISTS "submissions_select_policy" ON public.assignment_submissions;
CREATE POLICY "submissions_select_policy" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (
    -- Sinh viên xem bài nộp của chính mình
    student_id = auth.uid()
    OR
    -- Giảng viên sở hữu lớp hoặc Admin xem bài nộp của sinh viên
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON c.id = a.class_id
      WHERE a.id = assignment_submissions.assignment_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "submissions_insert_policy" ON public.assignment_submissions;
CREATE POLICY "submissions_insert_policy" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Sinh viên chỉ nộp bài cho chính mình và phải là thành viên của lớp
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.class_memberships cm ON cm.class_id = a.class_id
      WHERE a.id = assignment_submissions.assignment_id
        AND cm.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "submissions_update_policy" ON public.assignment_submissions;
CREATE POLICY "submissions_update_policy" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    -- Sinh viên tự sửa bài nộp nếu chưa chấm
    (student_id = auth.uid() AND score IS NULL)
    OR
    -- Giảng viên / Admin chấm điểm bài làm
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON c.id = a.class_id
      WHERE a.id = assignment_submissions.assignment_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    (student_id = auth.uid() AND score IS NULL)
    OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON c.id = a.class_id
      WHERE a.id = assignment_submissions.assignment_id
        AND (
          c.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin'
          )
        )
    )
  );

-- 5. Storage RLS Policies cho Bucket assignments
DROP POLICY IF EXISTS "assignments_storage_select" ON storage.objects;
CREATE POLICY "assignments_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assignments');

DROP POLICY IF EXISTS "assignments_storage_insert" ON storage.objects;
CREATE POLICY "assignments_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assignments');

