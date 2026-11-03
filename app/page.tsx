import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  CheckCircle,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

// ─── Dữ liệu tĩnh ───────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Sinh câu hỏi tự động',
    description:
      'Tải lên file DOCX hoặc PPTX, AI Groq sẽ phân tích và tạo ra hàng chục câu hỏi trắc nghiệm, tự luận chỉ trong vài giây.',
    color: 'bg-blue-50 text-[#154C99] dark:bg-blue-950/60 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-900/40',
    wide: true,
  },
  {
    icon: BookOpen,
    title: 'Ngân hàng câu hỏi',
    description:
      'Lưu trữ, tìm kiếm và tái sử dụng câu hỏi theo môn học, chương và mức độ khó.',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-900/40',
  },
  {
    icon: Users,
    title: 'Quản lý lớp học',
    description:
      'Theo dõi danh sách sinh viên, phân nhóm và thống kê kết quả học tập theo từng lớp học.',
    color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    border: 'border-sky-100 dark:border-sky-900/40',
  },
  {
    icon: Brain,
    title: 'Render công thức LaTeX',
    description:
      'Hiển thị chính xác mọi ký hiệu toán học, vật lý với KaTeX — ngay trong câu hỏi và đáp án ở cả 2 chế độ Sáng/Tối.',
    color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    border: 'border-indigo-100 dark:border-indigo-900/40',
  },
  {
    icon: GraduationCap,
    title: 'Phân quyền chuẩn LHU',
    description:
      'Hệ thống bảo mật tách biệt 3 tầng: Ban Quản trị LHU → Giảng viên phụ trách → Sinh viên với dữ liệu độc lập.',
    color: 'bg-rose-50 text-[#8C1D40] dark:bg-rose-950/60 dark:text-rose-300',
    border: 'border-rose-100 dark:border-rose-900/40',
  },
  {
    icon: FileText,
    title: 'Tổ chức thi & Chấm tự luận',
    description:
      'Giám sát phòng thi, phát hiện chuyển tab và hỗ trợ giảng viên chấm bài tự luận trực tiếp kèm rubric điểm.',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-900/40',
  },
];

const STATS = [
  { value: '50+', label: 'Môn học đào tạo' },
  { value: '2,500+', label: 'Câu hỏi trong kho' },
  { value: '1,200+', label: 'Sinh viên & Giảng viên' },
  { value: '99%', label: 'Độ tin cậy hệ thống' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Tải lên giáo trình / slide',
    desc: 'Giảng viên upload file DOCX hoặc PPTX từ bài giảng có sẵn.',
  },
  {
    step: '02',
    icon: Zap,
    title: 'AI phân tích & sinh câu hỏi',
    desc: 'Groq AI đọc nội dung, trích xuất kiến thức và tạo câu hỏi đa dạng.',
  },
  {
    step: '03',
    icon: CheckCircle,
    title: 'Lưu ngân hàng & Tổ chức thi',
    desc: 'Giảng viên duyệt, chỉnh sửa câu hỏi và phát hành đề thi cho sinh viên.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md dark:bg-[#111C2D]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo LHU */}
          <BrandLogo href="/" size="md" variant="plain" subtitle="E-Learning LHU" />

          {/* Nav links */}
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition hover:text-[#154C99] dark:hover:text-[#3B82F6]"
            >
              Tính năng
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition hover:text-[#154C99] dark:hover:text-[#3B82F6]"
            >
              Cách hoạt động
            </Link>
            <Link
              href="/chat"
              className="text-sm font-medium text-muted-foreground transition hover:text-[#154C99] dark:hover:text-[#3B82F6]"
            >
              Gia sư AI
            </Link>
          </nav>

          {/* CTAs & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <Link
              href="/login"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register/student"
              className="rounded-xl bg-[#154C99] hover:bg-[#0A275C] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow-xs transition"
            >
              Bắt đầu học ngay
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient decoration */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* LHU & ASU Badge */}
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#154C99]/20 bg-[#154C99]/5 dark:bg-[#154C99]/20 dark:border-[#3B82F6]/30 px-4 py-1.5 text-xs font-semibold text-[#154C99] dark:text-[#60A5FA]">
              <Sparkles className="size-3.5 text-[#FACC15]" />
              Đại học Lạc Hồng · Powered by Arizona State University
            </span>

            {/* Headline */}
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Nền tảng học tập số{' '}
              <span className="bg-gradient-to-r from-[#154C99] via-[#0F3D8A] to-[#2563EB] dark:from-[#60A5FA] dark:to-[#93C5FD] bg-clip-text text-transparent">
                thông minh
              </span>{' '}
              chuẩn quốc tế
            </h1>

            {/* Sub */}
            <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
              Giảng viên tạo đề thi và chấm tự luận nhanh chóng với AI.
              Sinh viên ôn luyện tương tác 24/7 cùng Gia sư AI thông minh.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register/student"
                className="inline-flex items-center gap-2 rounded-xl bg-[#154C99] hover:bg-[#0A275C] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                Bắt đầu học ngay
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-xs transition hover:border-[#154C99]/40 hover:bg-muted"
              >
                <LayoutDashboard className="size-4 text-[#154C99] dark:text-[#60A5FA]" />
                Dành cho giảng viên
              </Link>
            </div>
          </div>

          {/* Bento preview cards */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mx-auto lg:max-w-4xl lg:gap-4">
            {[
              {
                label: 'AI sinh câu hỏi tức thì',
                sub: 'từ file DOCX / PPTX bài giảng',
                color: 'border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/30',
              },
              {
                label: 'Công thức Toán LaTeX',
                sub: 'KaTeX sắc nét mọi chế độ sáng/tối',
                color: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30',
                hidden: 'hidden sm:flex',
              },
              {
                label: '2,500+ Câu hỏi',
                sub: 'phân môn học kỳ LHU',
                color: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/30',
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs ${card.color} ${card.hidden ?? ''}`}
              >
                <Sparkles className="size-5 text-[#154C99] dark:text-[#FACC15]" />
                <div className="mt-8">
                  <p className="text-sm font-bold text-foreground">{card.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border bg-card dark:bg-[#111C2D]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-3xl font-extrabold text-[#154C99] dark:text-[#60A5FA]">{s.value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features (Bento Grid) ── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Tính năng nổi bật
            </h2>
            <p className="mt-3 text-muted-foreground">
              Mọi công cụ khảo thí, học liệu và gia sư AI — quy tụ trong một hệ thống hiện đại.
            </p>
          </div>

          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group rounded-2xl border bg-card dark:bg-[#111C2D] p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${f.border} ${f.wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                >
                  <span
                    className={`inline-grid size-10 place-items-center rounded-xl ${f.color}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id="how-it-works"
        className="border-y border-border bg-card/60 dark:bg-[#0B1628]/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Chỉ 3 bước để có ngân hàng đề thi
            </h2>
            <p className="mt-3 text-muted-foreground">
              Từ tài liệu bài giảng → Ngân hàng câu hỏi chất lượng cao, chỉ trong vài phút.
            </p>
          </div>

          <div className="relative grid gap-6 sm:grid-cols-3">
            <div
              aria-hidden
              className="absolute left-[16.67%] right-[16.67%] top-10 hidden h-px bg-border sm:block"
            />

            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative flex flex-col items-center text-center">
                  <div className="relative grid size-20 place-items-center rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 shadow-xs">
                    <Icon className="size-7 text-[#154C99] dark:text-[#60A5FA]" />
                    <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-[#154C99] dark:bg-[#2563EB] text-[11px] font-bold text-white shadow-xs">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[220px] text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A275C] via-[#154C99] to-[#0F3D8A] px-8 py-14 text-center text-white shadow-xl sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 size-64 rounded-full bg-black/20 blur-3xl"
            />

            <Bot className="mx-auto mb-4 size-12 opacity-90 text-[#FACC15]" />
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Trải nghiệm Gia sư AI Đại học Lạc Hồng
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-blue-100">
              Đặt câu hỏi về bất kỳ môn học nào, nhận giải thích chi tiết từng bước và củng cố kiến thức theo tiến độ cá nhân.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0A275C] shadow-sm transition hover:bg-slate-100"
              >
                <Sparkles className="size-4 text-[#EAB308]" />
                Hỏi đáp cùng Gia sư AI
              </Link>
              <Link
                href="/register/student"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Đăng ký tài khoản
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card dark:bg-[#0B1628]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            {/* Logo */}
            <BrandLogo href="/" size="md" variant="plain" subtitle="Hệ thống E-Learning" />

            {/* Links */}
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { label: 'Tính năng', href: '#features' },
                { label: 'Cách hoạt động', href: '#how-it-works' },
                { label: 'Gia sư AI', href: '/chat' },
                { label: 'Đăng nhập', href: '/login' },
                { label: 'Đăng ký', href: '/register/student' },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition hover:text-[#154C99] dark:hover:text-[#60A5FA]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              © {new Date().getFullYear()} Trường Đại học Lạc Hồng.<br className="sm:hidden" /> Powered by Arizona State University.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
