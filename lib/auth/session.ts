import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const SESSION_COOKIE_NAME = 'autobank_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 ngày

export type SessionPayload = {
  sub: string; // user_id
  email: string;
  role: 'admin' | 'teacher' | 'student';
};

function getJwtSecretBytes(): Uint8Array {
  const secret =
    process.env.JWT_SECRET?.trim() ||
    'autobank_dev_fallback_secret_please_set_jwt_secret_in_env_local';
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecretBytes());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
      algorithms: ['HS256'],
    });
    const sub = typeof payload.sub === 'string' ? payload.sub.toLowerCase() : '';
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const role = payload.role;
    if (!sub || !email || (role !== 'admin' && role !== 'teacher' && role !== 'student')) {
      return null;
    }
    return { sub, email, role };
  } catch {
    return null;
  }
}

export function buildSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowHttpCookie = process.env.ALLOW_INSECURE_COOKIE === 'true';
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd && !allowHttpCookie,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export type VerifiedJwtPayload = JWTPayload & SessionPayload;
