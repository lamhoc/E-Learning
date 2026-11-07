-- ==============================================================================
-- Migration: 20261108_auth_otps.sql
-- Mục tiêu: Quản lý mã OTP 6 số bảo mật cho Quên mật khẩu & Xác thực email đăng ký
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('reset_password', 'register_verify', 'login_2fa')),
  metadata jsonb DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index phục vụ tìm kiếm OTP theo email & mục đích
CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup
  ON public.auth_otps(email, purpose, created_at DESC);

-- Kích hoạt RLS bảo mật tuyệt đối (Chỉ Server-side Service Role mới được truy cập)
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_otps_deny_all" ON public.auth_otps;
CREATE POLICY "auth_otps_deny_all"
  ON public.auth_otps
  FOR ALL
  TO public
  USING (false);
