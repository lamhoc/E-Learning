-- Teacher self-registration with email-bound invitation or pending approval.
-- Auth user creation, invitation consumption, and role assignment share one DB transaction
-- through the auth.users trigger below.

DO $$
BEGIN
  CREATE TYPE public.teacher_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  CHECK (email = lower(trim(email))),
  CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CHECK (expires_at > created_at),
  CHECK ((used_at IS NULL) = (used_by IS NULL))
);

CREATE TABLE IF NOT EXISTS public.teacher_applications (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status public.teacher_application_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  CHECK (review_note IS NULL OR length(review_note) <= 500),
  CHECK (
    (status = 'pending' AND reviewed_at IS NULL)
    OR (status <> 'pending' AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS teacher_applications_pending_idx
  ON public.teacher_applications (requested_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS invitation_tokens_creator_idx
  ON public.invitation_tokens (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS invitation_tokens_expiry_idx
  ON public.invitation_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitation_tokens_admin_read ON public.invitation_tokens;
CREATE POLICY invitation_tokens_admin_read ON public.invitation_tokens
  FOR SELECT TO authenticated
  USING (public.has_role('admin'));
DROP POLICY IF EXISTS invitation_tokens_admin_insert ON public.invitation_tokens;
CREATE POLICY invitation_tokens_admin_insert ON public.invitation_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS teacher_applications_read_owner_admin ON public.teacher_applications;
CREATE POLICY teacher_applications_read_owner_admin ON public.teacher_applications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role('admin'));
DROP POLICY IF EXISTS teacher_applications_insert_owner ON public.teacher_applications;
CREATE POLICY teacher_applications_insert_owner ON public.teacher_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

REVOKE ALL ON TABLE public.invitation_tokens FROM anon, authenticated;
GRANT SELECT (id, email, created_by, created_at, expires_at, used_at, used_by)
  ON public.invitation_tokens TO authenticated;
GRANT INSERT (email, token_hash, created_by, expires_at)
  ON public.invitation_tokens TO authenticated;

REVOKE ALL ON TABLE public.teacher_applications FROM anon, authenticated;
GRANT SELECT ON public.teacher_applications TO authenticated;
GRANT INSERT (user_id) ON public.teacher_applications TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_auth_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_invitation_hash text;
  v_invitation_id uuid;
  v_app_metadata jsonb := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
BEGIN
  v_email := lower(trim(COALESCE(NEW.email, '')));
  v_invitation_hash := NEW.raw_user_meta_data ->> 'teacher_invitation_hash';

  IF NULLIF(v_invitation_hash, '') IS NOT NULL THEN
    SELECT invitation.id INTO v_invitation_id
    FROM public.invitation_tokens AS invitation
    WHERE invitation.token_hash = v_invitation_hash
      AND invitation.email = v_email
      AND invitation.used_at IS NULL
      AND invitation.expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Teacher invitation is invalid, expired, already used, or bound to another email'
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.invitation_tokens
    SET used_at = now(), used_by = NEW.id
    WHERE id = v_invitation_id;
    v_app_metadata := v_app_metadata || jsonb_build_object('registration_source', 'teacher_invitation');
  ELSIF NEW.raw_user_meta_data ->> 'requested_role' = 'teacher' THEN
    v_app_metadata := v_app_metadata || jsonb_build_object('registration_source', 'teacher_application');
  END IF;

  NEW.raw_app_meta_data := v_app_metadata;
  NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    - 'teacher_invitation_hash' - 'requested_role';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_auth_user_registration ON auth.users;
CREATE TRIGGER prepare_auth_user_registration
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.prepare_auth_user_registration();

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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_registration_source = 'teacher_application' THEN
    INSERT INTO public.teacher_applications (user_id, email)
    VALUES (NEW.id, v_email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_teacher_invitation(p_token_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_email text;
  v_role public.app_role;
  v_invitation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before claiming an invitation' USING ERRCODE = '42501';
  END IF;
  IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invitation is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users AS u
  WHERE u.id = v_user_id;

  SELECT ur.role INTO v_role
  FROM public.user_roles AS ur
  WHERE ur.user_id = v_user_id;

  IF v_role = 'teacher' THEN
    RETURN;
  END IF;

  SELECT invitation.id INTO v_invitation_id
  FROM public.invitation_tokens AS invitation
  WHERE invitation.token_hash = p_token_hash
    AND invitation.email = v_email
    AND invitation.used_at IS NULL
    AND invitation.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid, expired, already used, or belongs to another email'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.invitation_tokens
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_invitation_id;

  UPDATE public.user_roles
  SET role = 'teacher'
  WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User role record not found' USING ERRCODE = '23503';
  END IF;

  UPDATE public.teacher_applications
  SET status = 'approved', reviewed_at = now(), review_note = 'Approved by email-bound invitation'
  WHERE user_id = v_user_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_teacher_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_teacher_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_teacher_application(
  p_user_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS public.teacher_application_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status public.teacher_application_status;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can review teacher applications' USING ERRCODE = '42501';
  END IF;

  SELECT application.status INTO v_status
  FROM public.teacher_applications AS application
  WHERE application.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'pending' THEN
    RAISE EXCEPTION 'Teacher application is not pending' USING ERRCODE = '22023';
  END IF;

  UPDATE public.teacher_applications
  SET status = CASE WHEN p_approve THEN 'approved'::public.teacher_application_status
                    ELSE 'rejected'::public.teacher_application_status END,
      reviewed_by = (SELECT auth.uid()),
      reviewed_at = now(),
      review_note = NULLIF(left(trim(COALESCE(p_note, '')), 500), '')
  WHERE user_id = p_user_id;

  IF p_approve THEN
    UPDATE public.user_roles
    SET role = 'teacher'
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User role record not found' USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN CASE WHEN p_approve THEN 'approved'::public.teacher_application_status
              ELSE 'rejected'::public.teacher_application_status END;
END;
$$;

REVOKE ALL ON FUNCTION public.review_teacher_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_teacher_application(uuid, boolean, text) TO authenticated;
