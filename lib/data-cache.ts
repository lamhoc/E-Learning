import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';
import { IsNull } from 'typeorm';
import { getDataSource } from '@/lib/db/data-source';
import { SubjectSchema, TeacherSubjectAssignmentSchema } from '@/lib/db/entities';

export type CachedSubject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

/**
 * Lấy danh sách tất cả các môn học đang hoạt động (không bị archived) từ SQL Server.
 * Cache 300s (5 phút), tag: 'subjects'.
 */
export const getCachedAllSubjects = unstable_cache(
  async (): Promise<CachedSubject[]> => {
    try {
      const ds = await getDataSource();
      const rows = await ds.getRepository(SubjectSchema).find({
        select: { id: true, code: true, name: true, description: true },
        where: { archived_at: IsNull() },
        order: { name: 'ASC' },
      });

      return rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? null,
      }));
    } catch (err) {
      console.error('[getCachedAllSubjects] Exception:', err);
      return [];
    }
  },
  ['all-active-subjects'],
  {
    revalidate: 300,
    tags: ['subjects'],
  },
);

/**
 * Lấy danh sách ID các môn học được phân công cho một giảng viên cụ thể.
 * Cache 60s, tag: 'teacher-assignments'.
 */
export const getCachedTeacherAssignedSubjectIds = unstable_cache(
  async (teacherId: string): Promise<string[]> => {
    if (!teacherId) return [];

    try {
      const ds = await getDataSource();
      const rows = await ds.getRepository(TeacherSubjectAssignmentSchema).find({
        select: { subject_id: true },
        where: { teacher_id: teacherId },
      });

      return rows.map((row) => row.subject_id);
    } catch (err) {
      console.error('[getCachedTeacherAssignedSubjectIds] Exception:', err);
      return [];
    }
  },
  ['teacher-assigned-subjects'],
  {
    revalidate: 60,
    tags: ['teacher-assignments'],
  },
);

/**
 * Helper revalidate cache môn học khi Admin/Giảng viên thêm môn hoặc thay đổi phân công
 */
export async function revalidateSubjectsCache(teacherId?: string) {
  try {
    revalidateTag('subjects', 'max');
    revalidateTag('teacher-assignments', 'max');
    if (teacherId) {
      revalidateTag(`teacher-assignments-${teacherId}`, 'max');
    }
  } catch {
    // Next.js fallback nếu gọi ngoài request context
  }
}
