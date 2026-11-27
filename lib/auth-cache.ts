import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { getDataSource } from '@/lib/db/data-source';
import { ProfileSchema, UserRoleSchema, UserSchema, type AppRole } from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';

export type AuthenticatedUser = {
  id: string;
  email: string;
  app_metadata: { role: AppRole; is_blocked?: boolean };
  user_metadata: { full_name?: string; role?: AppRole };
};

/**
 * Trả về user hiện tại đã xác thực qua JWT cookie + kiểm tra trạng thái khóa trong SQL Server,
 * cached trong cùng 1 request bằng React.cache().
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);

  if (!payload) {
    return { user: null as AuthenticatedUser | null, role: null as AppRole | null, error: null };
  }

  try {
    const ds = await getDataSource();
    const [dbUser, roleRow, profileRow] = await Promise.all([
      ds.getRepository(UserSchema).findOne({ where: { id: payload.sub } }),
      ds.getRepository(UserRoleSchema).findOne({ where: { user_id: payload.sub } }),
      ds.getRepository(ProfileSchema).findOne({ where: { id: payload.sub } }),
    ]);

    if (!dbUser) {
      return { user: null as AuthenticatedUser | null, role: null as AppRole | null, error: null };
    }

    const isBanned = Boolean(
      dbUser.is_blocked ||
        (dbUser.banned_until && new Date(dbUser.banned_until).getTime() > Date.now()),
    );

    if (isBanned) {
      return {
        user: null as AuthenticatedUser | null,
        role: null as AppRole | null,
        error: 'Tài khoản đã bị khóa.',
      };
    }

    const resolvedRole: AppRole = roleRow?.role ?? payload.role;
    const user: AuthenticatedUser = {
      id: dbUser.id,
      email: dbUser.email,
      app_metadata: { role: resolvedRole, is_blocked: false },
      user_metadata: {
        full_name: profileRow?.full_name ?? dbUser.email.split('@')[0],
        role: resolvedRole,
      },
    };

    return { user, role: resolvedRole, error: null };
  } catch (err) {
    console.error('[getCurrentUser] DB error:', err);
    return {
      user: null as AuthenticatedUser | null,
      role: null as AppRole | null,
      error: 'Không thể kết nối CSDL.',
    };
  }
});

/**
 * Bản ghi role của user hiện tại, cached theo request.
 */
export const getCurrentRoleRecord = cache(async () => {
  const { user, role } = await getCurrentUser();
  if (!user || !role) {
    return { data: null as { role: AppRole } | null, error: null };
  }
  return { data: { role }, error: null };
});

/**
 * Trả về user + role trong cùng 1 request (cached).
 */
export const getCurrentUserWithRole = cache(async () => {
  const { user, role, error } = await getCurrentUser();
  if (error || !user) {
    return { user: null as AuthenticatedUser | null, role: null as AppRole | null };
  }
  return { user, role };
});

/**
 * Yêu cầu user phải đăng nhập. Redirect về /login nếu chưa auth.
 */
export const requireAuth = cache(async () => {
  const { user, role } = await getCurrentUser();
  if (!user) redirect('/login');
  return { user, role };
});

/**
 * Yêu cầu user phải đăng nhập + có role cụ thể.
 */
export async function requireRole(expectedRole: AppRole) {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) redirect('/login');

  if (role !== expectedRole) {
    if (role === 'teacher') redirect('/teacher/dashboard');
    if (role === 'student') redirect('/student/dashboard');
    if (role === 'admin') redirect('/admin');
    redirect('/login');
  }

  return { user, role: expectedRole };
}

/**
 * Lấy profile cơ bản (full_name, student_code), cached theo request.
 */
export const getCurrentProfile = cache(async () => {
  const { user } = await requireAuth();
  const ds = await getDataSource();
  const profile = await ds.getRepository(ProfileSchema).findOne({
    where: { id: user.id },
  });

  return {
    user,
    fullName: sanitizeVietnameseText(profile?.full_name || user.email || ''),
    studentCode: profile?.student_code ?? null,
  };
});
