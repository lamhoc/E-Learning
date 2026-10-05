import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PasswordForm } from './password-form';

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?auth=link-error');

  return (
    <main className="min-h-screen bg-[#f4f6f1] px-4 py-12 text-[#202b27]">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-semibold text-[#5d766a] hover:text-[#285845]">
          E-Learning
        </Link>
        <section className="mt-5 rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">
            Hoàn tất tài khoản
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Đặt mật khẩu</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-[#68776e]">
            Tạo mật khẩu riêng cho tài khoản giảng viên. Mật khẩu chỉ được gửi trực tiếp tới Supabase Auth.
          </p>
          <PasswordForm />
        </section>
      </div>
    </main>
  );
}
