CREATE SEQUENCE IF NOT EXISTS public.student_code_seq START WITH 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_code_unique_idx
  ON public.profiles (student_code)
  WHERE student_code IS NOT NULL;

DO $$
DECLARE
  v_max_code bigint;
BEGIN
  SELECT max(substring(profile.student_code FROM 3)::bigint)
  INTO v_max_code
  FROM public.profiles AS profile
  WHERE profile.student_code ~ '^SV[0-9]+$';

  IF v_max_code IS NOT NULL THEN
    PERFORM setval('public.student_code_seq', v_max_code, true);
  END IF;
END;
$$;

WITH students_to_code AS MATERIALIZED (
  SELECT profile.id, nextval('public.student_code_seq') AS code_number
  FROM public.profiles AS profile
  JOIN public.user_roles AS role_record ON role_record.user_id = profile.id
  WHERE role_record.role = 'student'
    AND profile.student_code IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.teacher_applications AS application
      WHERE application.user_id = profile.id
    )
)
UPDATE public.profiles AS profile
SET student_code = 'SV' || CASE
  WHEN students_to_code.code_number < 1000000
    THEN lpad(students_to_code.code_number::text, 6, '0')
  ELSE students_to_code.code_number::text
END
FROM students_to_code
WHERE profile.id = students_to_code.id;

CREATE OR REPLACE FUNCTION public.protect_student_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.student_code IS DISTINCT FROM OLD.student_code
     AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Student code is managed by the system' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_student_code ON public.profiles;
CREATE TRIGGER protect_student_code
BEFORE UPDATE OF student_code ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_student_code();

CREATE OR REPLACE FUNCTION public.sync_student_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code_number bigint;
BEGIN
  IF NEW.role = 'student' AND NOT EXISTS (
    SELECT 1
    FROM public.teacher_applications AS application
    WHERE application.user_id = NEW.user_id
  ) THEN
    v_code_number := nextval('public.student_code_seq');
    UPDATE public.profiles
    SET student_code = COALESCE(
      student_code,
      'SV' || CASE
        WHEN v_code_number < 1000000 THEN lpad(v_code_number::text, 6, '0')
        ELSE v_code_number::text
      END
    )
    WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET student_code = NULL
    WHERE id = NEW.user_id AND student_code IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON SEQUENCE public.student_code_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_student_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_student_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_sync_student_code ON public.user_roles;
CREATE TRIGGER user_roles_sync_student_code
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_student_code();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_email text;
  v_role public.app_role := 'student';
  v_registration_source text;
BEGIN
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Student'
  );
  v_email := lower(trim(COALESCE(NEW.email, '')));
  v_registration_source := NEW.raw_app_meta_data ->> 'registration_source';

  IF v_registration_source = 'teacher_invitation' THEN
    v_role := 'teacher';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (id) DO NOTHING;

  IF v_registration_source = 'teacher_application' THEN
    INSERT INTO public.teacher_applications (user_id, email)
    VALUES (NEW.id, v_email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

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
  student_code text,
  already_enrolled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lookup text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can look up students' USING ERRCODE = '42501';
  END IF;

  IF v_lookup !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     AND v_lookup !~ '^sv[0-9]{6,}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id,
         COALESCE(NULLIF(profile.full_name, ''), u.email::text),
         u.email::text,
         profile.student_code,
         EXISTS (
           SELECT 1
           FROM public.class_memberships AS membership
           WHERE membership.class_id = p_class_id
             AND membership.student_id = u.id
         )
  FROM auth.users AS u
  JOIN public.profiles AS profile ON profile.id = u.id
  JOIN public.user_roles AS role_record ON role_record.user_id = u.id
  WHERE role_record.role = 'student'
    AND (lower(u.email) = v_lookup OR lower(profile.student_code) = v_lookup)
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
  student_code text,
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
  SELECT profile.id, profile.full_name, user_record.email::text,
         profile.student_code, membership.enrolled_at
  FROM public.class_memberships AS membership
  JOIN public.profiles AS profile ON profile.id = membership.student_id
  JOIN auth.users AS user_record ON user_record.id = membership.student_id
  WHERE membership.class_id = p_class_id
  ORDER BY profile.full_name, user_record.email;
END;
$$;

REVOKE ALL ON FUNCTION public.find_student_for_class(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_class_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_student_for_class(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_class_roster(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';