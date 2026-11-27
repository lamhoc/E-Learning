import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const response = NextResponse.next({ request });

  if (token) {
    const session = await verifySessionToken(token);
    if (!session) {
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/login',
    '/subjects/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/admin/:path*',
    '/register/teacher/pending',
  ],
};
