-- Migration: Add class_materials table and course_materials storage bucket

-- 1. Create table class_materials
CREATE TABLE IF NOT EXISTS public.class_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  material_type text NOT NULL CHECK (material_type IN ('document', 'video', 'link')),
  file_url text NOT NULL,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  week_number integer NOT NULL DEFAULT 1 CHECK (week_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(title)) > 0),
  CHECK (length(trim(file_url)) > 0)
);

-- Index for querying materials by class and week
CREATE INDEX IF NOT EXISTS idx_class_materials_class_week
  ON public.class_materials(class_id, week_number, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers assigned to class or admins can view/manage
DROP POLICY IF EXISTS class_materials_teacher_all ON public.class_materials;
CREATE POLICY class_materials_teacher_all ON public.class_materials
  FOR ALL TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_materials.class_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_materials.class_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Students enrolled in the class can SELECT
DROP POLICY IF EXISTS class_materials_student_select ON public.class_materials;
CREATE POLICY class_materials_student_select ON public.class_materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_memberships cm
      WHERE cm.class_id = class_materials.class_id AND cm.student_id = auth.uid()
    )
  );

-- 2. Setup Storage Bucket: course_materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course_materials',
  'course_materials',
  true,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies
DROP POLICY IF EXISTS "Public or authenticated view course materials" ON storage.objects;
CREATE POLICY "Public or authenticated view course materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course_materials');

DROP POLICY IF EXISTS "Authenticated users upload course materials" ON storage.objects;
CREATE POLICY "Authenticated users upload course materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course_materials');

DROP POLICY IF EXISTS "Teachers and admins delete course materials" ON storage.objects;
CREATE POLICY "Teachers and admins delete course materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course_materials');

