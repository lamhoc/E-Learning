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

// ─── Dữ liệu tĩnh ───────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Sinh câu hỏi tự động',
    description:
      'Tải lên file DOCX hoặc PPTX, AI Groq sẽ phân tích và tạo ra hàng chục câu hỏi trắc nghiệm, tự luận chỉ trong vài giây.',
    color: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-100',
    wide: true,
  },
  {
    icon: BookOpen,
    title: 'Ngân hàng câu hỏi',
    description:
      'Lưu trữ, tìm kiếm và tái sử dụng câu hỏi theo môn học, chương và mức độ khó.',
    color: 'bg-teal-50 text-teal-700',
    border: 'border-teal-100',
  },
  {
    icon: Users,
    title: 'Quản lý lớp học',
    description:
      'Theo dõi danh sách sinh viên, phân nhóm và thống kê kết quả học tập theo từng lớp.',
    color: 'bg-sky-50 text-sky-700',
    border: 'border-sky-100',
  },
  {
    icon: Brain,
    title: 'Render công thức LaTeX',
    description: 'Hiển thị chính xác mọi ký hiệu toán học, vật lý với KaTeX — ngay trong câu hỏi và đáp án.',
    color: 'bg-violet-50 text-violet-700',
    border: 'border-violet-100',
  },
  {
    icon: GraduationCap,
    title: 'Phân quyền vai trò',
    description: 'Hệ thống tách biệt rõ ràng: Admin → Giảng viên → Sinh viên với dữ liệu độc lập.',
    color: 'bg-amber-50 text-amber-700',
    border: 'border-amber-100',
  },
  {
    icon: FileText,
    title: 'Tạo đề thi nhanh',
    description: 'Chọn câu hỏi từ ngân hàng hoặc để AI tự động lắp ghép thành đề thi hoàn chỉnh.',
    color: 'bg-rose-50 text-rose-700',
    border: 'border-rose-100',
  },
];

const STATS = [
  { value: '50+', label: 'Môn học' },
  { value: '1,200+', label: 'Câu hỏi' },
  { value: '300+', label: 'Sinh viên' },
  { value: '98%', label: 'Hài lòng' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Tải lên tài liệu',
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
    title: 'Xem xét & lưu vào ngân hàng',
    desc: 'Giảng viên duyệt, chỉnh sửa và lưu câu hỏi vào hệ thống.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <BookOpen className="size-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Mầm<span className="text-emerald-600">Học</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Tính năng
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Cách hoạt động
            </Link>
            <Link
              href="/chat"
              className="text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Gia sư AI
            </Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register/student"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-100/60 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
              <Sparkles className="size-3.5" />
              Powered by Groq AI — Nhanh. Chính xác. Miễn phí.
            </span>

            {/* Headline */}
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Nền tảng học tập{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                thông minh
              </span>{' '}
              cho giáo dục hiện đại
            </h1>

            {/* Sub */}
            <p className="mt-5 text-lg text-slate-600 sm:text-xl">
              Giảng viên tạo câu hỏi tự động từ tài liệu bài giảng.
              Sinh viên học tập hiệu quả với Gia sư AI 24/7.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register/student"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
              >
                Bắt đầu học ngay
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <LayoutDashboard className="size-4" />
                Dành cho giảng viên
              </Link>
            </div>
          </div>

          {/* Bento preview cards (decorative) */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mx-auto lg:max-w-4xl lg:gap-4">
            {[
              { label: 'AI sinh 20 câu hỏi', sub: 'từ file PPTX • 8 giây', color: 'border-emerald-200 bg-emerald-50' },
              { label: 'Công thức LaTeX', sub: 'E = mc² · ∫ f(x)dx', color: 'border-teal-200 bg-teal-50', hidden: 'hidden sm:flex' },
              { label: '1,200+ câu hỏi', sub: 'trong ngân hàng', color: 'border-sky-200 bg-sky-50' },
            ].map((card) => (
              <div
                key={card.label}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm ${card.color} ${card.hidden ?? ''}`}
              >
                <Sparkles className="size-5 text-emerald-600" />
                <div className="mt-8">
                  <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-3xl font-extrabold text-emerald-600">{s.value}</dt>
                <dd className="mt-1 text-sm text-slate-500">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features (Bento Grid) ── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Tính năng nổi bật
            </h2>
            <p className="mt-3 text-slate-500">
              Mọi công cụ giảng viên và sinh viên cần — trong một nền tảng duy nhất.
            </p>
          </div>

          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${f.border} ${f.wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                >
                  <span
                    className={`inline-grid size-10 place-items-center rounded-xl ${f.color}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
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
        className="bg-gradient-to-b from-white to-slate-50 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Chỉ 3 bước để có ngân hàng câu hỏi
            </h2>
            <p className="mt-3 text-slate-500">
              Từ tài liệu bài giảng → Ngân hàng câu hỏi chất lượng cao, chỉ trong vài phút.
            </p>
          </div>

          <div className="relative grid gap-6 sm:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              className="absolute left-[16.67%] right-[16.67%] top-10 hidden h-px bg-slate-200 sm:block"
            />

            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative flex flex-col items-center text-center">
                  <div className="relative grid size-20 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
                    <Icon className="size-7 text-emerald-600" />
                    <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[220px] text-sm text-slate-500">
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-14 text-center text-white shadow-xl sm:px-12">
            {/* bg blobs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 size-64 rounded-full bg-black/10 blur-3xl"
            />

            <Bot className="mx-auto mb-4 size-12 opacity-90" />
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Trải nghiệm Gia sư AI ngay hôm nay
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-emerald-100">
              Đặt câu hỏi về bất kỳ chủ đề nào, nhận giải thích chi tiết và đề xuất bài tập phù hợp với trình độ.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                <Sparkles className="size-4" />
                Chat với Gia sư AI
              </Link>
              <Link
                href="/register/student"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Đăng ký miễn phí
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-emerald-600 text-white">
                <BookOpen className="size-3.5" />
              </span>
              <span className="text-sm font-bold text-slate-900">
                Mầm<span className="text-emerald-600">Học</span>
              </span>
            </Link>

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
                  className="text-sm text-slate-500 transition hover:text-emerald-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Copyright */}
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} MầmHọc. Đồ án tốt nghiệp.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
