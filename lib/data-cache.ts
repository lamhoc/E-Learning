import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CachedSubject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

/**
 * Lấy danh sách tất cả các môn học đang hoạt động (không bị archived).
 * Dữ liệu môn học ít thay đổi -> Cache 300s (5 phút), tag: 'subjects'.
 */
export const getCachedAllSubjects = unstable_cache(
  async (): Promise<CachedSubject[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('subjects')
      .select('id, code, name, description')
      .is('archived_at', null)
      .order('name', { ascending: true });

    return (data ?? []) as CachedSubject[];
  },
  ['all-active-subjects'],
  {
    revalidate: 300, // 5 phút
    tags: ['subjects'],
  }
);

/**
 * Lấy danh sách ID các môn học được phân công cho một giảng viên cụ thể.
 * Cache 60s, tag: 'teacher-subjects-[teacherId]'.
 */
export const getCachedTeacherAssignedSubjectIds = (teacherId: string) =>
  unstable_cache(
    async (): Promise<string[]> => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('teacher_subject_assignments')
        .select('subject_id')
        .eq('teacher_id', teacherId);

      return (data ?? []).map((row) => row.subject_id as string);
    },
    [`teacher-assignments-${teacherId}`],
    {
      revalidate: 60, // 1 phút
      tags: ['teacher-assignments', `teacher-assignments-${teacherId}`],
    }
  )();

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

