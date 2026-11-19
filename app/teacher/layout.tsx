import { ReactNode } from 'react';
import { requireRole } from '@/lib/auth-cache';
import { TeacherShell } from '@/components/teacher/teacher-shell';

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const { user } = await requireRole('teacher');
  const teacherName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Giảng viên';

  return (
    <TeacherShell teacherName={teacherName}>
      {children}
    </TeacherShell>
  );
}
