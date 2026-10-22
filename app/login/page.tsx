import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, Brain, GraduationCap, Sparkles, Users } from 'lucide-react';
import { LoginForm } from './login-form';
import { createClient } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; claimInvite?: string; claimEmail?: string }>;
};

// ─── Điểm nổi bật hiển thị trên panel trái ────────────────────────────────
const HIGHLIGHTS = [
  { icon: Sparkles, text: 'AI sinh câu hỏi từ DOCX / PPTX tức thì' },
  { icon: Brain, text: 'Render công thức LaTeX chuẩn xác' },
  { icon: Users, text: 'Quản lý lớp học & sinh viên dễ dàng' },
  { icon: GraduationCap, text: 'Gia sư AI hỗ trợ học tập 24/7' },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Redirect nếu đã đăng nhập ─────────────────────────────────────────────
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
      supabase
        .from('teacher_applications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (roleRecord?.role === 'teacher') redirect('/teacher/dashboard');
    if (application) redirect('/register/teacher/pending');
    redirect('/subjects');
  }

  // ── Nội dung thông báo sau đăng ký ────────────────────────────────────────
  const registeredNotice =
    params.registered === 'teacher'
      ? 'Tài khoản đã được tạo. Hồ sơ không có mã mời sẽ chờ admin duyệt.'
      : params.registered === 'student'
        ? 'Đăng ký sinh viên thành công. Bạn có thể đăng nhập ngay.'
        : params.registered === 'student-confirmation'
          ? 'Đã nhận đăng ký. Xác nhận email trước khi đăng nhập.'
          : params.registered
            ? 'Tài khoản đã được tạo.'
            : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── Panel trái — Brand (ẩn trên mobile) ─────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#17372e] via-[#1e4a3c] to-[#0f2820] px-10 py-12 lg:flex lg:w-[45%] xl:w-[42%]">
        {/* Blob trang trí */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-emerald-500/10 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-teal-400/10 blur-[80px]"
        />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[#c9ed99] text-[#17372e]">
            <BookOpen className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Mầm<span className="text-[#c9ed99]">Học</span>
          </span>
        </Link>

        {/* Tagline */}
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Nền tảng học tập{' '}
            <span className="text-[#c9ed99]">thông minh</span>
            <br />
            cho giáo dục hiện đại
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            Giảng viên tạo câu hỏi tự động từ tài liệu. Sinh viên học hiệu quả với Gia sư AI.
          </p>

          {/* Feature highlights */}
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[#c9ed99]">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm text-white/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer brand */}
        <p className="relative text-xs text-white/35">
          © {new Date().getFullYear()} MầmHọc · Đồ án tốt nghiệp
        </p>
      </aside>

      {/* ─── Panel phải — Form ────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
        {/* Mobile logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 lg:hidden"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
            <BookOpen className="size-4" />
          </span>
          <span className="text-base font-bold text-slate-900">
            Mầm<span className="text-emerald-600">Học</span>
          </span>
        </Link>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Nhập email và mật khẩu để tiếp tục.
            </p>
          </div>

          {/* Thông báo sau đăng ký */}
          {registeredNotice && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              {registeredNotice}
            </div>
          )}

          {/* ── Form (giữ nguyên toàn bộ logic) ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <LoginForm />

            {/* Links đăng ký */}
            <div className="mt-6 border-t border-slate-100 pt-5 flex flex-wrap justify-between gap-2 text-sm">
              <Link
                href="/register/student"
                className="font-medium text-emerald-700 hover:underline"
              >
                Đăng ký sinh viên
              </Link>
              <Link
                href="/register/teacher"
                className="font-medium text-emerald-700 hover:underline"
              >
                Đăng ký giảng viên
              </Link>
            </div>
          </div>

          {/* Back to home */}
          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 hover:underline">
              ← Quay về trang chủ
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
