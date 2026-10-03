import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/subjects');

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
            Dùng email và mật khẩu đã được tạo trong Supabase Authentication.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
