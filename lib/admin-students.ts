import 'server-only';

import { In } from 'typeorm';
import { getDataSource } from '@/lib/db/data-source';
import { ProfileSchema, UserRoleSchema, UserSchema } from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';

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
    const ds = await getDataSource();

    const studentRoles = await ds.getRepository(UserRoleSchema).find({
      select: { user_id: true },
      where: { role: 'student' },
    });

    const studentIds = studentRoles.map((r) => r.user_id);
    if (studentIds.length === 0) return [];

    const [profiles, users] = await Promise.all([
      ds.getRepository(ProfileSchema).find({
        where: { id: In(studentIds) },
        order: { created_at: 'DESC' },
      }),
      ds.getRepository(UserSchema).find({
        where: { id: In(studentIds) },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));

    return profiles.map((profile) => {
      const authUser = userMap.get(profile.id);
      const isBannedByDuration = Boolean(
        authUser?.banned_until && new Date(authUser.banned_until) > new Date(),
      );
      const isBlocked = Boolean(authUser?.is_blocked) || isBannedByDuration;

      return {
        id: profile.id,
        fullName: sanitizeVietnameseText(profile.full_name || 'Sinh viên'),
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
