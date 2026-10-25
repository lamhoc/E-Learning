import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LibraryBig,
  PenTool,
  Plus,
  Sparkles,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getTeacherDashboardData, type TeacherExam } from '@/lib/teacher-dashboard';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ClassForm } from './class-form';

// Tối ưu UX & Bundle size: Trì hoãn tải thư viện nặng Recharts (~200KB) khỏi luồng chính
const SubmissionChart = dynamic(
  () => import('@/components/teacher/submission-chart').then((mod) => mod.SubmissionChart),
  {
    loading: () => (
      <div className="flex h-[250px] w-full items-center justify-center rounded-xl bg-slate-50/60 p-4">
        <Skeleton className="h-[210px] w-full rounded-xl" />
      </div>
    ),
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExamStatus(status: TeacherExam['status']) {
  switch (status) {
    case 'published':
      return { label: 'Đã phát hành', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
    case 'closed':
      return { label: 'Đã đóng', className: 'border-slate-200 bg-slate-100 text-slate-700' };
    case 'archived':
      return { label: 'Lưu trữ', className: 'border-amber-200 bg-amber-50 text-amber-800' };
    default:
      return { label: 'Bản nháp', className: 'border-orange-200 bg-orange-50 text-orange-800' };
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getSubjectName(subject: { name: string } | { name: string }[] | null) {
  return Array.isArray(subject) ? subject[0]?.name : subject?.name;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: 'green' | 'orange' | 'blue' | 'yellow';
}) {
  const toneClasses = {
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-sky-50 text-sky-700',
    yellow: 'bg-amber-50 text-amber-700',
  };
  const valueTone = {
    green: 'text-emerald-700',
    orange: 'text-orange-700',
    blue: 'text-sky-700',
    yellow: 'text-amber-700',
  };

  return (
    <Card className="group h-full border-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 line-clamp-1">
            {label}
          </p>
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
        </div>
        <div className="mt-3">
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${valueTone[tone]}`}>
            {value}
          </p>
          <p className="mt-1 text-xs leading-4 text-slate-400 line-clamp-2 min-h-[32px] flex items-center">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
      <Link
        href="/teacher/subjects"
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
      >
        Mở danh sách môn học <ArrowRight data-icon="inline-end" />
      </Link>
    </div>
  );
}

// ─── Quick Action data ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: PenTool,
    label: 'Chấm bài thi',
    desc: 'Chấm tự luận',
    href: '/teacher/grading',
    color: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200',
    iconBg: 'bg-amber-600 text-white',
  },
  {
    icon: Sparkles,
    label: 'Sinh câu hỏi AI',
    desc: 'Dùng Groq AI',
    href: '/teacher/questions',
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100',
    iconBg: 'bg-emerald-600 text-white',
  },
  {
    icon: Upload,
    label: 'Upload tài liệu',
    desc: 'DOCX / PPTX',
    href: '/teacher/questions',
    color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100',
    iconBg: 'bg-teal-600 text-white',
  },
  {
    icon: Plus,
    label: 'Tạo lớp học',
    desc: 'Lớp học mới',
    href: '#create-class',
    color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100',
    iconBg: 'bg-sky-600 text-white',
  },
  {
    icon: LibraryBig,
    label: 'Ngân hàng câu hỏi',
    desc: 'Xem & quản lý',
    href: '/teacher/questions',
    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100',
    iconBg: 'bg-violet-600 text-white',
  },
  {
    icon: Bot,
    label: 'Gia sư AI',
    desc: 'Hỏi bất cứ điều gì',
    href: '/teacher/ai-tutor',
    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100',
    iconBg: 'bg-orange-500 text-white',
  },
  {
    icon: FileText,
    label: 'Tạo đề thi',
    desc: 'Từ ngân hàng câu hỏi',
    href: '/teacher/exams/create',
    color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100',
    iconBg: 'bg-rose-600 text-white',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TeacherDashboardPage() {
  const data = await getTeacherDashboardData();

  const initials = data.teacherName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  // Tên ngắn gọn để chào
  const shortName = data.teacherName.split(/\s+/).at(-1) ?? data.teacherName;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="dashboard" teacherName={data.teacherName} />

      <div className="min-w-0">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-bold text-slate-900">Mầm Học</span>
            </div>

            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">
              {today}
            </p>

            {/* Mobile nav */}
            <nav aria-label="Điều hướng nhanh" className="flex items-center gap-1 lg:hidden">
              <Link
                href="/teacher/grading"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <PenTool className="size-3.5" />
                <span className="hidden sm:inline">Chấm thi</span>
              </Link>
              <Link
                href="/teacher/questions"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <HelpCircle className="size-3.5" />
                <span className="hidden sm:inline">Câu hỏi</span>
              </Link>
              <Link
                href="/teacher/subjects"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <BookOpen className="size-3.5" />
                <span className="hidden sm:inline">Môn học</span>
              </Link>
              <Link
                href="/chat"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">AI</span>
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.teacherId} />
              {!data.errorMessage ? (
                <Badge
                  variant="outline"
                  className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex"
                >
                  <CheckCircle2 data-icon="inline-start" /> Đã đồng bộ
                </Badge>
              ) : (
                <Badge variant="destructive" className="hidden sm:inline-flex">
                  Cần kiểm tra dữ liệu
                </Badge>
              )}
              <span
                className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]"
                aria-label={`Tài khoản ${data.teacherName}`}
              >
                {initials || 'GV'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">

          {/* ── Greeting ── */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Không gian giảng dạy
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Chào {shortName}! 👋
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Theo dõi lớp học, đề thi và hoạt động chấm bài tự luận tại một nơi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/teacher/grading"
                className={buttonVariants({
                  variant: 'outline',
                  className: 'gap-2 shadow-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                })}
              >
                <PenTool className="size-4 text-amber-700" />
                <span>Chấm bài thi</span>
                {data.pendingGradingCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {data.pendingGradingCount}
                  </span>
                )}
              </Link>
              <Link
                href="/teacher/questions"
                className={buttonVariants({ variant: 'outline', className: 'gap-2 shadow-xs' })}
              >
                <LibraryBig data-icon="inline-start" /> Ngân hàng câu hỏi
              </Link>
              <Link
                href="/teacher/subjects"
                className={buttonVariants({ className: 'gap-2 shadow-xs bg-[#17372e] hover:bg-[#20493e] text-white' })}
              >
                <BookOpen data-icon="inline-start" /> Môn học
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </div>
          </section>

          {/* ── Error alert ── */}
          {data.errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Một số dữ liệu chưa tải được</p>
                <p className="mt-1 text-amber-900/80">
                  {data.errorMessage} Kiểm tra các policy RLS trên Supabase rồi tải lại trang.
                </p>
              </div>
            </div>
          )}

          {/* ── Quick Actions (Bento strip) ── */}
          <section aria-label="Thao tác nhanh">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Thao tác nhanh
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`group flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${action.color}`}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-xl shadow-sm transition-transform group-hover:scale-105 ${action.iconBg}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold">{action.label}</span>
                      <span className="mt-0.5 block text-[10px] opacity-70">{action.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── Metric cards (Bento Grid) ── */}
          <section aria-label="Chỉ số giảng dạy" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 items-stretch">
            <MetricCard
              label="Lớp đang phụ trách"
              value={data.classCount.toLocaleString('vi-VN')}
              detail="Lớp chưa lưu trữ"
              icon={BookOpen}
              tone="green"
            />
            <MetricCard
              label="Lượt ghi danh"
              value={data.enrollmentCount.toLocaleString('vi-VN')}
              detail="Trên các lớp của bạn"
              icon={Users}
              tone="orange"
            />
            <Link href="/teacher/questions" className="block h-full transition hover:opacity-95">
              <MetricCard
                label="Câu hỏi trong kho"
                value={data.questionCount.toLocaleString('vi-VN')}
                detail="Bấm để xem và quản lý kho"
                icon={LibraryBig}
                tone="blue"
              />
            </Link>
            <MetricCard
              label="Đề đã phát hành"
              value={data.publishedExamCount.toLocaleString('vi-VN')}
              detail="Trong các đề bạn tạo"
              icon={ClipboardList}
              tone="yellow"
            />
            <Link href="/teacher/grading" className="block h-full transition hover:opacity-95">
              <MetricCard
                label="Bài chờ chấm"
                value={data.pendingGradingCount.toLocaleString('vi-VN')}
                detail={data.pendingGradingCount > 0 ? 'Bấm để chấm tự luận ngay' : 'Đã chấm xong tất cả'}
                icon={PenTool}
                tone={data.pendingGradingCount > 0 ? 'orange' : 'green'}
              />
            </Link>
          </section>

          {/* ── Pending Essay Grading Queue on Dashboard (nếu có bài chờ chấm) ── */}
          {data.pendingAttempts && data.pendingAttempts.length > 0 && (
            <Card id="grading" className="scroll-mt-20 overflow-hidden rounded-2xl border-amber-200 bg-amber-50/20 shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-white/90 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <PenTool className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Bài thi chờ chấm tự luận ({data.pendingGradingCount})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Các bài thi sinh viên đã nộp cần giáo viên chấm điểm tự luận và nhận xét.
                    </CardDescription>
                  </div>
                </div>
                <Link
                  href="/teacher/grading"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'gap-1.5 border-amber-300 bg-white text-amber-900 hover:bg-amber-50',
                  })}
                >
                  <span>Xem toàn bộ danh sách</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow>
                        <TableHead className="pl-6">Thí sinh</TableHead>
                        <TableHead>Đề thi & Môn học</TableHead>
                        <TableHead>Thời gian nộp</TableHead>
                        <TableHead className="pr-6 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pendingAttempts.map((attempt) => (
                        <TableRow key={attempt.id} className="hover:bg-amber-50/30 transition">
                          <TableCell className="pl-6">
                            <p className="font-semibold text-slate-900">{attempt.studentName}</p>
                            {attempt.studentCode ? (
                              <p className="font-mono text-xs text-slate-500">MSSV: {attempt.studentCode}</p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Chưa có MSSV</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800">{attempt.examTitle}</p>
                            <p className="text-xs text-slate-400">{attempt.subjectName} · Lần {attempt.attemptNo}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {attempt.submittedAt ? formatDate(attempt.submittedAt) : '—'}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Link
                              href={`/teacher/grading/${attempt.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#17372e] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#20493e]"
                            >
                              <PenTool className="size-3" />
                              <span>Chấm ngay</span>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding nudge (khi chưa có lớp) ── */}
          {data.classCount === 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
              <div className="flex items-center gap-4">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white">
                  <Zap className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">Bắt đầu với lớp học đầu tiên</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Chọn môn đã được quản trị viên phân công để tạo lớp.
                  </p>
                </div>
              </div>
              <Link
                href="/teacher/subjects"
                className={buttonVariants({
                  variant: 'outline',
                  className: 'shrink-0 gap-2 border-emerald-200 bg-white hover:bg-emerald-50',
                })}
              >
                Đi tới môn học <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
          )}

          {/* ── Create class form ── */}
          <Card id="create-class" className="scroll-mt-20 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tạo lớp học mới</CardTitle>
              <CardDescription>
                Lớp mới sẽ thuộc môn được phân công và do bạn phụ trách.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassForm subjects={data.assignedSubjects} />
            </CardContent>
          </Card>

          {/* ── Charts + Recent classes (2-col bento) ── */}
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
            {/* Submission chart */}
            <Card className="min-w-0 rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold">Hoạt động nộp bài</CardTitle>
                  <CardDescription className="mt-1">
                    Bài thi đã nộp trong 7 ngày gần nhất
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {data.submissionCount.toLocaleString('vi-VN')} tổng bài
                </span>
              </CardHeader>
              <CardContent>
                {data.submissionCount === 0 ? (
                  <div className="flex h-[250px] flex-col items-center justify-center text-center">
                    <span className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-slate-600">Chưa có bài nộp</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Biểu đồ sẽ cập nhật khi sinh viên hoàn thành bài thi.
                    </p>
                  </div>
                ) : (
                  <SubmissionChart data={data.submissionsByDay} />
                )}
              </CardContent>
            </Card>

            {/* Recent classes */}
            <Card className="min-w-0 rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold">Lớp học gần đây</CardTitle>
                  <CardDescription className="mt-1">Các lớp bạn đang phụ trách</CardDescription>
                </div>
                <Badge variant="secondary">{data.classes.length} lớp</Badge>
              </CardHeader>
              <CardContent>
                {data.classes.length === 0 ? (
                  <EmptyPanel
                    title="Chưa có lớp do bạn phụ trách"
                    description="Tạo lớp từ một môn được quản trị viên phân công để bắt đầu quản lý học tập."
                  />
                ) : (
                  <div className="space-y-1">
                    {data.classes.slice(0, 4).map((classItem) => (
                      <Link
                        href={`/teacher/classes/${classItem.id}`}
                        key={classItem.id}
                        className="group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                          <BookOpen aria-hidden="true" className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {classItem.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {getSubjectName(classItem.subject) ?? 'Môn học'} ·{' '}
                            {classItem.academic_year}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600"
                        />
                      </Link>
                    ))}
                    <Separator className="my-2" />
                    <Link
                      href="/teacher/subjects"
                      className="inline-flex items-center gap-1 px-2 py-2 text-sm font-medium text-emerald-700 hover:underline"
                    >
                      Xem môn học <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── Recent exams table ── */}
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Đề thi gần đây</CardTitle>
                <CardDescription className="mt-1">
                  Các đề bạn tạo, sắp xếp theo thời gian gần nhất
                </CardDescription>
              </div>
              <Link href="/teacher/grading">
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-amber-50 border-amber-300 text-amber-800">
                  <ArrowDownRight aria-hidden="true" className="size-3.5" />
                  {data.pendingGradingCount.toLocaleString('vi-VN')} chờ chấm
                </Badge>
              </Link>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {data.exams.length === 0 ? (
                <div className="px-5 pb-5">
                  <EmptyPanel
                    title="Chưa có đề thi"
                    description="Đề thi sẽ xuất hiện sau khi bạn tạo và lưu bản nháp đầu tiên."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="min-w-[220px] pl-5">Tên đề</TableHead>
                        <TableHead>Môn học</TableHead>
                        <TableHead className="text-center">Câu hỏi</TableHead>
                        <TableHead className="text-center">Lớp</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead className="pr-5 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.exams.map((exam) => {
                        const status = getExamStatus(exam.status);
                        return (
                          <TableRow key={exam.id} className="transition-colors hover:bg-slate-50/70">
                            <TableCell className="max-w-[300px] pl-5">
                              <Link
                                href={`/teacher/exams/${exam.id}`}
                                className="block truncate font-semibold text-slate-900 hover:text-emerald-800 hover:underline"
                              >
                                {exam.title}
                              </Link>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {exam.duration_minutes} phút
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {getSubjectName(exam.subject) ?? '—'}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {exam.exam_questions?.length ?? 0}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {exam.exam_classes?.length ?? 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={status.className}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {formatDate(exam.created_at)}
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                              <Link
                                href={`/teacher/exams/${exam.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition shadow-2xs"
                              >
                                <span>Thống kê</span>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Footer ── */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-4 text-xs text-slate-400">
            <span>Mầm Học · Hệ thống quản lý đào tạo</span>
            <Link href="/chat" className="inline-flex items-center gap-1.5 transition hover:text-slate-700">
              <Sparkles aria-hidden="true" className="size-3.5" /> Mở gia sư AI
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
