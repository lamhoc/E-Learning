-- The BEFORE INSERT auth.users trigger records NEW.id on the invitation before
-- the auth.users row exists. Defer the FK check until the transaction commits.
ALTER TABLE public.invitation_tokens
  DROP CONSTRAINT IF EXISTS invitation_tokens_used_by_fkey;

ALTER TABLE public.invitation_tokens
  ADD CONSTRAINT invitation_tokens_used_by_fkey
  FOREIGN KEY (used_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;