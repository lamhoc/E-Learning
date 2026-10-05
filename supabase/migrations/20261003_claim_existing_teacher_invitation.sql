-- Add this RPC to projects that already applied teacher_invitation_and_approval.sql.
-- An existing authenticated account can claim an unused invite bound to its own email.

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
