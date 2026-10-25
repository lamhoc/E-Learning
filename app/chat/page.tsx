import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ChatRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role || user.app_metadata?.role;

  if (role === 'teacher' || role === 'admin') {
    redirect('/teacher/ai-tutor');
  }

  redirect('/student/ai-tutor');
}
