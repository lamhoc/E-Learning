DROP FUNCTION IF EXISTS public.find_student_for_class(uuid, text);
DROP FUNCTION IF EXISTS public.list_class_roster(uuid);

CREATE FUNCTION public.find_student_for_class(
  p_class_id uuid,
  p_email text
)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  student_email text,
  already_enrolled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can look up students' USING ERRCODE = '42501';
  END IF;

  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id,
      COALESCE(NULLIF(p.full_name, ''), u.email::text),
      u.email::text,
         EXISTS (
           SELECT 1
           FROM public.class_memberships AS membership
           WHERE membership.class_id = p_class_id
             AND membership.student_id = u.id
         )
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  JOIN public.user_roles AS role_record ON role_record.user_id = u.id
  WHERE role_record.role = 'student'
    AND lower(u.email) = v_email
    AND NOT EXISTS (
      SELECT 1
      FROM public.teacher_applications AS application
      WHERE application.user_id = u.id
    )
  LIMIT 1;
END;
$$;

CREATE FUNCTION public.list_class_roster(p_class_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  student_email text,
  enrolled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can view the roster' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, u.email::text, membership.enrolled_at
  FROM public.class_memberships AS membership
  JOIN public.profiles AS p ON p.id = membership.student_id
  JOIN auth.users AS u ON u.id = membership.student_id
  WHERE membership.class_id = p_class_id
  ORDER BY p.full_name, u.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_student_in_class(
  p_class_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can enroll students' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS role_record
    WHERE role_record.user_id = p_student_id
      AND role_record.role = 'student'
      AND NOT EXISTS (
        SELECT 1
        FROM public.teacher_applications AS application
        WHERE application.user_id = role_record.user_id
      )
  ) THEN
    RAISE EXCEPTION 'Only student accounts can be enrolled' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.class_memberships (class_id, student_id)
  VALUES (p_class_id, p_student_id)
  ON CONFLICT (class_id, student_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.unenroll_student_from_class(
  p_class_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can remove students' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.class_memberships
  WHERE class_id = p_class_id AND student_id = p_student_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_student_for_class(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_class_roster(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enroll_student_in_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unenroll_student_from_class(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_student_for_class(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_class_roster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_in_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unenroll_student_from_class(uuid, uuid) TO authenticated;