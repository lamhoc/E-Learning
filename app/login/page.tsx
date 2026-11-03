import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, Brain, GraduationCap, Sparkles, Users } from 'lucide-react';
import { LoginForm } from './login-form';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; claimInvite?: string; claimEmail?: string }>;
};

// ─── Điểm nổi bật hiển thị trên panel trái ────────────────────────────────
const HIGHLIGHTS = [
  { icon: Sparkles, text: 'AI sinh câu hỏi từ DOCX / PPTX tức thì' },
  { icon: Brain, text: 'Render công thức Toán LaTeX chuẩn xác mọi chế độ' },
  { icon: Users, text: 'Quản lý lớp học & sinh viên Đại học Lạc Hồng' },
  { icon: GraduationCap, text: 'Gia sư AI đồng hành ôn tập 24/7' },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { user, role, supabase } = await getCurrentUserWithRole();

  // Redirect nếu đã đăng nhập
  if (user) {
    if (params.claimInvite) {
      const claimUrl = new URLSearchParams({
        invite: params.claimInvite,
        email: params.claimEmail ?? user.email ?? '',
      });
      redirect(`/register/teacher/claim?${claimUrl.toString()}`);
    }

    const userRole = (user.app_metadata?.role as string) || role;

    if (userRole === 'admin') redirect('/admin');
    if (userRole === 'teacher') redirect('/teacher/dashboard');
    if (userRole === 'student') redirect('/student/dashboard');

    const { data: application } = await supabase
      .from('teacher_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (application) redirect('/register/teacher/pending');
    redirect('/subjects');
  }

  // ── Nội dung thông báo sau đăng ký ────────────────────────────────────────
  const registeredNotice =
    params.registered === 'teacher'
      ? 'Tài khoản đã được tạo. Hồ sơ không có mã mời sẽ chờ Ban Quản trị LHU phê duyệt.'
      : params.registered === 'student'
        ? 'Đăng ký sinh viên thành công. Bạn có thể đăng nhập ngay.'
        : params.registered === 'student-confirmation'
          ? 'Đã nhận đăng ký. Xác nhận email trước khi đăng nhập.'
          : params.registered
            ? 'Tài khoản đã được tạo.'
            : null;

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* ─── Panel trái — Brand LHU (ẩn trên mobile) ─────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0A275C] via-[#0F3D8A] to-[#071D44] px-10 py-12 lg:flex lg:w-[45%] xl:w-[42%]">
        {/* Blob trang trí */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-blue-400/15 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-amber-400/10 blur-[80px]"
        />

        {/* Logo LHU Khung bo sáng */}
        <div className="relative">
          <BrandLogo
            href="/"
            size="lg"
            variant="framed"
            subtitle="Hệ thống E-Learning LHU"
          />
        </div>

        {/* Tagline */}
        <div className="relative my-auto py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FACC15] backdrop-blur-sm">
            <Sparkles className="size-3.5 text-[#FACC15]" />
            Powered by Arizona State University
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Nền tảng học tập số{' '}
            <span className="text-[#FACC15]">thông minh</span>
            <br />
            Đại học Lạc Hồng
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Giảng viên tổ chức thi và chấm tự luận thông minh. Sinh viên học tập hiệu quả cùng Gia sư AI 24/7.
          </p>

          {/* Feature highlights */}
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[#FACC15]">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm text-white/85 font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer brand */}
        <p className="relative text-xs text-white/45">
          © {new Date().getFullYear()} Trường Đại học Lạc Hồng (LHU). All rights reserved.
        </p>
      </aside>

      {/* ─── Panel phải — Form ────────────────────────────────────────────── */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
        {/* Nút chuyển đổi Theme góc trên bên phải */}
        <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <BrandLogo href="/" size="md" variant="plain" subtitle="E-Learning LHU" />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Đăng nhập</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Nhập email và mật khẩu tài khoản LHU để tiếp tục.
            </p>
          </div>

          {/* Thông báo sau đăng ký */}
          {registeredNotice && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 p-4 text-sm text-blue-900 dark:text-blue-300 shadow-2xs"
            >
              {registeredNotice}
            </div>
          )}

          {/* Form */}
          <LoginForm />

          {/* Liên kết đăng ký */}
          <div className="mt-8 space-y-2 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            <p>
              Chưa có tài khoản?{' '}
              <Link
                href="/register/student"
                className="font-semibold text-[#154C99] hover:underline dark:text-[#60A5FA]"
              >
                Đăng ký Sinh viên
              </Link>
            </p>
            <p>
              Dành cho Giảng viên?{' '}
              <Link
                href="/register/teacher"
                className="font-semibold text-[#154C99] hover:underline dark:text-[#60A5FA]"
              >
                Đăng ký Giảng viên
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
