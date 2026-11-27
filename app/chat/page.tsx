import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';

export default async function ChatRedirectPage() {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  const effectiveRole = role || user.app_metadata?.role;

  if (effectiveRole === 'teacher' || effectiveRole === 'admin') {
    redirect('/teacher/ai-tutor');
  }

  redirect('/student/ai-tutor');
}
