-- Apply to projects where the initial schema has already been installed.
-- Restricts subjects to admins, assigned teachers, and enrolled students.

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
        (
          public.has_role('teacher')
          AND EXISTS (
            SELECT 1 FROM public.classes AS c
            WHERE c.subject_id = s.id
              AND c.teacher_id = (SELECT auth.uid())
              AND c.archived_at IS NULL
          )
        )
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

REVOKE ALL ON FUNCTION public.can_view_subject(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_subject(uuid) TO authenticated;

DROP POLICY IF EXISTS subjects_read_authenticated ON public.subjects;
DROP POLICY IF EXISTS subjects_read_role_scoped ON public.subjects;
CREATE POLICY subjects_read_role_scoped ON public.subjects
  FOR SELECT TO authenticated USING (public.can_view_subject(id));
