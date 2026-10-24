import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type AppRole = 'admin' | 'teacher' | 'student';

export default async function SubjectsRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (roleRecord?.role as AppRole) ?? 'student';

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
