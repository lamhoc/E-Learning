import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type StudentAccount = {
  id: string;
  fullName: string;
  studentCode: string | null;
  email: string;
  createdAt: string;
  isBlocked: boolean;
  bannedUntil: string | null;
};

export async function getAdminStudentsList(): Promise<StudentAccount[]> {
  try {
    const adminClient = createAdminClient();

    // 1. Lấy danh sách ID các tài khoản có role là 'student'
    const { data: studentRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (rolesError) {
      console.error('Failed to load student roles for admin:', rolesError);
      return [];
    }

    const studentIds = new Set((studentRoles ?? []).map((r) => r.user_id));
    if (studentIds.size === 0) return [];

    // 2. Lấy thông tin profile tương ứng
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, student_code, created_at')
      .in('id', Array.from(studentIds))
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Failed to load student profiles for admin:', profilesError);
      return [];
    }

    // 3. Lấy thông tin xác thực từ Supabase Auth Admin để lấy email và trạng thái khóa
    const { data: authData, error: authListError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authListError) {
      console.error('Failed to load auth users for admin:', authListError);
    }

    const authMap = new Map((authData?.users ?? []).map((u) => [u.id, u]));

    return (profiles ?? []).map((profile) => {
      const authUser = authMap.get(profile.id);
      const isBannedByDuration = Boolean(
        authUser?.banned_until && new Date(authUser.banned_until) > new Date(),
      );
      const isBlockedByMetadata = Boolean(
        authUser?.app_metadata?.is_blocked || authUser?.user_metadata?.is_blocked,
      );
      const isBlocked = isBannedByDuration || isBlockedByMetadata;

      return {
        id: profile.id,
        fullName:
          profile.full_name ||
          (typeof authUser?.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : 'Sinh viên'),
        studentCode: profile.student_code ?? null,
        email: authUser?.email ?? 'Chưa xác thực email',
        createdAt: profile.created_at || authUser?.created_at || new Date().toISOString(),
        isBlocked,
        bannedUntil: authUser?.banned_until ?? null,
      };
    });
  } catch (error) {
    console.error('Unexpected error loading student list:', error);
    return [];
  }
}
