import { ReactNode } from 'react';
import { requireRole } from '@/lib/auth-cache';
import { StudentShell } from '@/components/student/student-shell';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { user } = await requireRole('student');
  const studentName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Sinh viên';

  return (
    <StudentShell studentName={studentName}>
      {children}
    </StudentShell>
  );
}
