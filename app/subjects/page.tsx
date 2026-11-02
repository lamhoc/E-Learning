import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';

type AppRole = 'admin' | 'teacher' | 'student';

export default async function SubjectsRedirectPage() {
  const { user, role: userRole, supabase } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  const role = (userRole as AppRole) ?? 'student';

  if (role === 'teacher' || role === 'admin') {
    redirect('/teacher/subjects');
  }

  if (role === 'student') {
    const { data: application } = await supabase
      .from('teacher_applications')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (application) {
      redirect('/register/teacher/pending');
    }
    redirect('/student/dashboard');
  }

  redirect('/login');
}
