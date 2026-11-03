import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export type CachedSubject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

/**
 * Lấy danh sách tất cả các môn học đang hoạt động (không bị archived).
 * Sử dụng createAdminClient() (không dùng cookies()) để tương thích tuyệt đối với unstable_cache().
 * Dữ liệu môn học ít thay đổi -> Cache 300s (5 phút), tag: 'subjects'.
 */
export const getCachedAllSubjects = unstable_cache(
  async (): Promise<CachedSubject[]> => {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('id, code, name, description')
        .is('archived_at', null)
        .order('name', { ascending: true });

      if (error) {
        console.error('[getCachedAllSubjects] Error:', error.message);
        return [];
      }

      return (data ?? []) as CachedSubject[];
    } catch (err) {
      console.error('[getCachedAllSubjects] Exception:', err);
      return [];
    }
  },
  ['all-active-subjects'],
  {
    revalidate: 300, // 5 phút
    tags: ['subjects'],
  }
);

/**
 * Lấy danh sách ID các môn học được phân công cho một giảng viên cụ thể.
 * Nhận teacherId làm tham số truyền vào hàm và query bằng createAdminClient().
 * Tuyệt đối không dùng createClient() hay cookies() bên trong.
 * Cache 60s, tag: 'teacher-assignments'.
 */
export const getCachedTeacherAssignedSubjectIds = unstable_cache(
  async (teacherId: string): Promise<string[]> => {
    if (!teacherId) return [];

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('teacher_subject_assignments')
        .select('subject_id')
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('[getCachedTeacherAssignedSubjectIds] Error:', error.message);
        return [];
      }

      return (data ?? []).map((row) => row.subject_id as string);
    } catch (err) {
      console.error('[getCachedTeacherAssignedSubjectIds] Exception:', err);
      return [];
    }
  },
  ['teacher-assigned-subjects'],
  {
    revalidate: 60, // 1 phút
    tags: ['teacher-assignments'],
  }
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
