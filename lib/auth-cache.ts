import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sanitizeVietnameseText } from '@/lib/utils';

/**
 * Trả về Supabase user hiện tại, cached trong cùng 1 request.
 * Dùng `React.cache()` để đảm bảo dù layout, page, và server component
 * đều gọi hàm này, chỉ có 1 request duy nhất tới Supabase Auth.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error, supabase };
});

/**
 * Trả về user + role, cached trong cùng 1 request.
 * Gộp 2 truy vấn (getUser + user_roles) thành 1 hàm cached duy nhất.
 */
export const getCurrentUserWithRole = cache(async () => {
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    return { user: null, role: null as string | null, supabase };
  }

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    user,
    role: (roleRecord?.role as string) ?? null,
    supabase,
  };
});

/**
 * Yêu cầu user phải đăng nhập. Redirect về /login nếu chưa auth.
 * Trả về { user, supabase } đã xác thực.
 */
export const requireAuth = cache(async () => {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect('/login');
  return { user, supabase };
});

/**
 * Yêu cầu user phải đăng nhập + có role cụ thể.
 * Redirect nếu không đúng role.
 */
export async function requireRole(expectedRole: 'teacher' | 'student' | 'admin') {
  const { user, role, supabase } = await getCurrentUserWithRole();

  if (!user) redirect('/login');

  if (role !== expectedRole) {
    // Redirect về trang phù hợp với role hiện tại
    if (role === 'teacher') redirect('/teacher/dashboard');
    if (role === 'student') redirect('/student/dashboard');
    if (role === 'admin') redirect('/admin');
    redirect('/login');
  }

  return { user, role: expectedRole, supabase };
}

/**
 * Lấy profile cơ bản (full_name, student_code), cached theo request.
 */
export const getCurrentProfile = cache(async () => {
  const { user, supabase } = await requireAuth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, student_code')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    supabase,
    fullName: sanitizeVietnameseText(profile?.full_name || user.email || ''),
    studentCode: profile?.student_code ?? null,
  };
});

