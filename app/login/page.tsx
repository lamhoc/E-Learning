import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { createClient } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; claimInvite?: string; claimEmail?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    if (params.claimInvite) {
      const claimUrl = new URLSearchParams({
        invite: params.claimInvite,
        email: params.claimEmail ?? user.email ?? '',
      });
      redirect(`/register/teacher/claim?${claimUrl.toString()}`);
    }

    const [{ data: roleRecord }, { data: application }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      supabase.from('teacher_applications').select('status').eq('user_id', user.id).maybeSingle(),
    ]);

    if (roleRecord?.role === 'teacher') redirect('/teacher/dashboard');
    if (application) redirect('/register/teacher/pending');
    redirect('/subjects');
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] px-4 py-12 text-[#202b27]">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-semibold text-[#5d766a] hover:text-[#285845]">
          E-Learning
        </Link>
        <section className="mt-5 rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">
            Tài khoản học tập
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Đăng nhập</h1>
          <p className="mt-2 mb-6 text-sm leading-6 text-[#68776e]">
            Đăng nhập bằng mật khẩu hoặc yêu cầu link để thiết lập lại mật khẩu từ email.
          </p>
          {params.registered && (
            <p role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              {params.registered === 'teacher'
                ? 'Tài khoản đã được tạo, không cần xác nhận email. Đăng nhập để tiếp tục; hồ sơ không có mã mời sẽ chờ admin duyệt.'
                : params.registered === 'student'
                  ? 'Đăng ký sinh viên thành công. Không cần xác nhận email; bạn có thể đăng nhập.'
                  : params.registered === 'student-confirmation'
                    ? 'Đã nhận đăng ký. Hãy xác nhận email qua liên kết Supabase gửi trước khi đăng nhập.'
                  : 'Tài khoản đã được tạo.'}
            </p>
          )}
          <LoginForm />
          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#e7ece6] pt-4 text-sm">
            <Link href="/register/student" className="font-medium text-[#355347] hover:underline">
              Đăng ký sinh viên
            </Link>
            <Link href="/register/teacher" className="font-medium text-[#355347] hover:underline">
              Đăng ký giảng viên
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
