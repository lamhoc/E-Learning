import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { StudentSidebar } from '@/components/student/student-sidebar';
import { getCurrentProfile } from '@/lib/auth-cache';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import {
  getStudentDashboardData,
  type StudentAttempt,
  type StudentClass,
  type StudentExam,
  type StudentNotification,
} from '@/lib/student-dashboard';

export const metadata = {
  title: 'Tổng quan học tập | Mầm Học',
  description: 'Bảng điều khiển học tập cá nhân của sinh viên',
};

function getRelatedName(value: { name: string } | { name: string }[] | null) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name;
}

function getRelatedExam(value: { title: string; subject: { name: string } | { name: string }[] | null } | { title: string; subject: { name: string } | { name: string }[] | null }[] | null) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getRelatedResult(value: { total_score: number | string; released_at: string | null } | { total_score: number | string; released_at: string | null }[] | null) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date);
}

function getAttemptStatus(attempt: StudentAttempt): { label: string; className: string } {
  switch (attempt.status) {
    case 'in_progress':
      return { label: 'Đang làm', className: 'border-amber-200 bg-amber-50 text-amber-800' };
    case 'pending_grading':
      return { label: 'Chờ chấm', className: 'border-sky-200 bg-sky-50 text-sky-800' };
    case 'completed':
      return { label: 'Hoàn thành', className: 'border-primary/20 bg-primary/10 text-primary' };
    case 'voided':
      return { label: 'Đã hủy', className: 'border-rose-200 bg-rose-50 text-rose-800' };
    default:
      return { label: 'Không rõ', className: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] bg-slate-50 text-slate-700' };
  }
}

function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{detail}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 transition hover:text-emerald-950 hover:underline"
        >
          <span>{action.label}</span>
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

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
  icon: typeof BookOpen;
  tone: 'green' | 'blue' | 'orange' | 'violet';
}) {
  const styles = {
    green: { icon: 'bg-emerald-50 text-emerald-700', value: 'text-emerald-700' },
    blue: { icon: 'bg-sky-50 text-sky-700', value: 'text-sky-700' },
    orange: { icon: 'bg-orange-50 text-orange-700', value: 'text-orange-700' },
    violet: { icon: 'bg-violet-50 text-violet-700', value: 'text-violet-700' },
  };

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
      <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200 leading-snug">{label}</p>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${styles[tone].value}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{detail}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${styles[tone].icon}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <p className="max-w-md text-sm leading-6 text-slate-500">{children}</p>
    </div>
  );
}

function StudentDashboardContentSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

async function StudentDashboardDataContent() {
  const data = await getStudentDashboardData();
  const activeAssignmentsCount = data.assignments.filter((a) => a.status === 'published').length;

  return (
    <>
      {data.hasDataError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Một số dữ liệu chưa tải được</p>
            <p className="mt-1 text-amber-900/80">
              Kiểm tra các chính sách RLS cho tài khoản sinh viên trên Supabase rồi tải lại trang.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <section aria-label="Chỉ số học tập" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/student/classes" className="block transition hover:opacity-95">
          <MetricCard
            label="Lớp đang tham gia"
            value={data.classes.length.toLocaleString('vi-VN')}
            detail="Bấm để xem danh sách lớp"
            icon={BookOpen}
            tone="green"
          />
        </Link>
        <Link href="/student/assignments" className="block transition hover:opacity-95">
          <MetricCard
            label="Bài tập đang mở"
            value={activeAssignmentsCount.toLocaleString('vi-VN')}
            detail="Cần hoàn thành đúng hạn"
            icon={FileCheck2}
            tone="orange"
          />
        </Link>
        <Link href="/student/exams" className="block transition hover:opacity-95">
          <MetricCard
            label="Đề thi đang mở"
            value={data.openExams.length.toLocaleString('vi-VN')}
            detail="Bấm để vào phòng thi"
            icon={ClipboardList}
            tone="blue"
          />
        </Link>
        <MetricCard
          label="Thông báo mới"
          value={data.notifications.filter((n) => !n.read_at).length.toLocaleString('vi-VN')}
          detail="Chưa đọc từ hệ thống"
          icon={CalendarClock}
          tone="violet"
        />
      </section>

      {/* Quick Navigation Cards */}
      <section aria-label="Khu vực học tập" className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Khu vực học tập
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/student/classes"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#154C99]/50 hover:shadow-md"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <BookOpen className="size-5" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#60A5FA]">
                Lớp học của tôi
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Xem toàn bộ các lớp bạn đang theo học, thông tin giảng viên và năm học.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-emerald-800">
              <span>{data.classes.length} lớp học</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/student/materials"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#154C99]/50 hover:shadow-md"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                <FileText className="size-5" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#60A5FA]">
                Kho tài liệu học tập
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Tải slide bài giảng, giáo trình PDF, file DOCX và tài liệu theo tuần học.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-sky-800">
              <span>{data.materials.length} tài liệu</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/student/assignments"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#154C99]/50 hover:shadow-md"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                <FileCheck2 className="size-5" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#60A5FA]">
                Bài tập & Đồ án
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Nộp bài tập tự luận, báo cáo thực hành và xem điểm số, nhận xét của giảng viên.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-orange-800">
              <span>{activeAssignmentsCount} bài cần nộp</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/student/exams"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#154C99]/50 hover:shadow-md"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <ClipboardList className="size-5" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#60A5FA]">
                Phòng thi trực tuyến
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Làm bài thi trắc nghiệm & tự luận trực tuyến, theo dõi thời gian và lịch sử điểm thi.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-amber-800">
              <span>{data.openExams.length} đề đang mở</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/student/results"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#154C99]/50 hover:shadow-md"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                <Trophy className="size-5" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#60A5FA]">
                Kết quả học tập
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Bảng điểm tổng hợp, lịch sử làm bài thi, điểm trung bình và bài tập đã nộp.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-amber-800 dark:text-amber-400">
              <span>{data.attempts.length} bài đã nộp</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* Active Exams Preview */}
      {data.openExams.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            eyebrow="Cần làm ngay"
            title="Đề thi đang trong khung giờ mở"
            detail="Hãy hoàn thành trước thời hạn đóng bài"
            action={{ label: 'Vào trang đề thi', href: '/student/exams' }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.openExams.slice(0, 3).map((exam) => (
              <Card key={exam.id} className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="border-primary/20 bg-primary/10 text-primary text-[10px]">
                        Đang mở
                      </Badge>
                      {exam.require_camera ? (
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] font-semibold gap-1 px-1.5 py-0.5">
                          <Camera className="size-2.5" />
                          <span>Camera</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[9px] px-1.5 py-0.5">
                          Không Camera
                        </Badge>
                      )}
                    </div>
                    {exam.available_until && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock3 className="size-3" />
                        Đóng {formatDate(exam.available_until, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {exam.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    {getRelatedName(exam.subject) || 'Môn học'} · {exam.duration_minutes} phút
                  </p>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Link
                    href={`/student/exams/${exam.id}`}
                    className={buttonVariants({
                      size: 'sm',
                      className: 'w-full gap-1.5 bg-[#154C99] hover:bg-[#0F3D8A] text-white text-xs h-8 shadow-xs',
                    })}
                  >
                    <span>Bắt đầu làm bài</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Exam History */}
      <section className="space-y-3">
        <SectionHeading
          eyebrow="Kết quả"
          title="Lượt thi gần nhất"
          detail="Điểm số chỉ xuất hiện sau khi giảng viên công bố kết quả"
          action={{ label: 'Xem toàn bộ hồ sơ thi', href: '/student/exams' }}
        />
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="p-0">
            {data.attempts.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Đề thi</TableHead>
                      <TableHead className="hidden sm:table-cell">Ngày làm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Điểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attempts.slice(0, 5).map((attempt) => {
                      const exam = getRelatedExam(attempt.exam);
                      const result = getRelatedResult(attempt.result);
                      const status = getAttemptStatus(attempt);
                      const score = result?.released_at ? Number(result.total_score) : null;
                      return (
                        <TableRow key={attempt.id}>
                          <TableCell className="min-w-48">
                            <Link
                              href={`/student/exams/${attempt.exam_id}`}
                              className="block font-medium text-slate-800 dark:text-slate-200 transition hover:text-[#154C99] dark:hover:text-[#60A5FA] hover:underline"
                            >
                              {exam?.title || 'Đề thi'}
                            </Link>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              Lượt {attempt.attempt_no}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-slate-500 sm:table-cell">
                            {formatDate(attempt.started_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {score !== null && Number.isFinite(score)
                              ? `${score.toLocaleString('vi-VN')} / 10`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState>Bài thi bạn đã nộp sẽ xuất hiện tại đây.</EmptyState>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* AI Tutor Promotion Banner */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#17372e] via-[#20493e] to-[#286353] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-[#d7f5b2]">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Trợ lý học tập AI
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
              Cần ôn lại một kiến thức?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Hỏi gia sư AI để được giải thích từng bước và luyện tập theo tốc độ của bạn.
            </p>
          </div>
          <Link
            href="/student/ai-tutor"
            className={buttonVariants({
              variant: 'secondary',
              className: 'shrink-0 gap-2 bg-[#c9ed99] text-[#17372e] hover:bg-[#d7f5b2]',
            })}
          >
            Bắt đầu ôn tập <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </>
  );
}

export default async function StudentDashboardPage() {
  const { user, fullName, studentCode } = await getCurrentProfile();
  const shortName = (fullName || 'Sinh viên').split(/\s+/).at(-1) ?? 'Sinh viên';
  const initials = (fullName || 'SV')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toLocaleUpperCase())
    .join('');

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <StudentSidebar studentName={fullName || 'Sinh viên'} activeRoute="dashboard" />

      <div className="min-w-0">
        {/* Topbar: Static Shell 0ms */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="lg:hidden">
              <BrandLogo size="sm" />
            </div>
            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">{today}</p>
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={user.id} />
              <ThemeToggle />
              <Badge
                variant="outline"
                className="hidden gap-1.5 border-primary/20 bg-primary/10 text-primary sm:inline-flex"
              >
                <CheckCircle2 data-icon="inline-start" /> Sinh viên
              </Badge>
              <span
                className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/30"
                aria-label={`Tài khoản ${fullName}`}
              >
                {initials || 'SV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          {/* Greeting: Static Shell 0ms */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Không gian học tập
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                Chào {shortName}! 👋
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Theo dõi lớp học, đề thi và tiến độ học tập của bạn tại một nơi.
              </p>
              {studentCode && (
                <p className="mt-1 text-xs text-slate-400">
                  Mã sinh viên: <span className="font-mono">{studentCode}</span>
                </p>
              )}
            </div>
            <Link
              href="/student/ai-tutor"
              className={buttonVariants({
                className: 'gap-2 bg-[#17372e] text-white shadow-xs hover:bg-[#20493e]',
              })}
            >
              <Sparkles data-icon="inline-start" /> Ôn tập cùng gia sư AI
              <ArrowRight data-icon="inline-end" />
            </Link>
          </section>

          {/* Granular Suspense Streaming */}
          <Suspense fallback={<StudentDashboardContentSkeleton />}>
            <StudentDashboardDataContent />
          </Suspense>

          <Separator />
          <footer className="pb-2 text-center text-xs text-slate-400">
            Mầm Học · Cùng bạn học tốt hơn mỗi ngày
          </footer>
        </div>
      </div>
    </main>
  );
}
