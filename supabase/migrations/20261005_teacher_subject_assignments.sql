CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS teacher_subject_assignments_subject_idx
  ON public.teacher_subject_assignments (subject_id, teacher_id);

INSERT INTO public.teacher_subject_assignments (teacher_id, subject_id)
SELECT DISTINCT c.teacher_id, c.subject_id
FROM public.classes AS c
JOIN public.user_roles AS ur ON ur.user_id = c.teacher_id AND ur.role = 'teacher'
WHERE c.archived_at IS NULL
ON CONFLICT (teacher_id, subject_id) DO NOTHING;

ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.teacher_subject_assignments FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.teacher_subject_assignments TO authenticated;

DROP POLICY IF EXISTS teacher_subject_assignments_read ON public.teacher_subject_assignments;
CREATE POLICY teacher_subject_assignments_read ON public.teacher_subject_assignments
  FOR SELECT TO authenticated
  USING (public.has_role('admin') OR teacher_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS teacher_subject_assignments_admin_insert ON public.teacher_subject_assignments;
CREATE POLICY teacher_subject_assignments_admin_insert ON public.teacher_subject_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS ur
      WHERE ur.user_id = teacher_id AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS teacher_subject_assignments_admin_delete ON public.teacher_subject_assignments;
CREATE POLICY teacher_subject_assignments_admin_delete ON public.teacher_subject_assignments
  FOR DELETE TO authenticated
  USING (public.has_role('admin'));

CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_subject(
  p_subject_id uuid,
  p_teacher_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (p_teacher_id = (SELECT auth.uid()) OR public.has_role('admin'))
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS role_record
      WHERE role_record.user_id = p_teacher_id
        AND role_record.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1
      FROM public.teacher_subject_assignments AS assignment
      WHERE assignment.teacher_id = p_teacher_id
        AND assignment.subject_id = p_subject_id
    );
$$;

REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_subject(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_subject(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_subject(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1
    FROM public.subjects AS s
    WHERE s.id = p_subject_id
      AND s.archived_at IS NULL
      AND (
        public.is_teacher_assigned_to_subject(s.id)
        OR (
          public.has_role('student')
          AND EXISTS (
            SELECT 1
            FROM public.classes AS c
            JOIN public.class_memberships AS cm ON cm.class_id = c.id
            WHERE c.subject_id = s.id
              AND c.archived_at IS NULL
              AND cm.student_id = (SELECT auth.uid())
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_staff(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1
    FROM public.classes AS c
    WHERE c.id = p_class_id
      AND c.teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(c.subject_id)
  );
$$;

DROP POLICY IF EXISTS subjects_insert_staff ON public.subjects;
DROP POLICY IF EXISTS subjects_insert_admin ON public.subjects;
CREATE POLICY subjects_insert_admin ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS classes_insert_teacher ON public.classes;
CREATE POLICY classes_insert_teacher ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  );

DROP POLICY IF EXISTS classes_update_staff ON public.classes;
CREATE POLICY classes_update_staff ON public.classes
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  )
  WITH CHECK (
    public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  );