import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import { TeacherApplicationSchema } from '@/lib/db/entities';

type AppRole = 'admin' | 'teacher' | 'student';

export default async function SubjectsRedirectPage() {
  const { user, role: userRole } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  const role = (userRole as AppRole) ?? 'student';

  if (role === 'admin') {
    redirect('/admin/subjects');
  }

  if (role === 'teacher') {
    redirect('/teacher/subjects');
  }

  if (role === 'student') {
    const ds = await getDataSource();
    const application = await ds.getRepository(TeacherApplicationSchema).findOne({
      where: { user_id: user.id },
      select: { user_id: true },
    });

    if (application) {
      redirect('/register/teacher/pending');
    }
    redirect('/student/dashboard');
  }

  redirect('/login');
}
