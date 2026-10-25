import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
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
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
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
      return { label: 'Hoàn thành', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
    case 'voided':
      return { label: 'Đã hủy', className: 'border-rose-200 bg-rose-50 text-rose-800' };
    default:
      return { label: 'Không rõ', className: 'border-slate-200 bg-slate-50 text-slate-700' };
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
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
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
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200">
      <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${styles[tone].value}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
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
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-5 py-6 text-center">
      <p className="max-w-md text-sm leading-6 text-slate-500">{children}</p>
    </div>
  );
}

function ClassCard({ classItem }: { classItem: StudentClass }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <BookOpen aria-hidden="true" className="size-5" />
        </span>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 text-xs">
          {classItem.class_code}
        </Badge>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900 line-clamp-1">{classItem.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{getRelatedName(classItem.subject) || 'Môn học'}</p>
      <p className="mt-3 text-xs text-slate-400">Năm học {classItem.academic_year}</p>
    </article>
  );
}

function ExamCard({ exam }: { exam: StudentExam }) {
  return (
    <article className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 text-xs">
          Đang mở
        </Badge>
        {exam.available_until && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Đóng {formatDate(exam.available_until, { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900 line-clamp-1">{exam.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{getRelatedName(exam.subject) || 'Đề thi'}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {exam.duration_minutes} phút
        </span>
        <span>Tối đa {exam.max_attempts} lượt</span>
      </div>
      <Link
        href={`/student/exams/${exam.id}`}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#17372e] px-3 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-[#20493e]"
      >
        <span>Vào làm bài</span>
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

function NotificationItem({ notification }: { notification: StudentNotification }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${notification.read_at ? 'bg-slate-300' : 'bg-emerald-500'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-800">{notification.title}</h3>
          <time className="text-xs text-slate-400" dateTime={notification.created_at}>
            {formatDate(notification.created_at)}
          </time>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
      </div>
    </li>
  );
}

export default async function StudentDashboardPage() {
  const data = await getStudentDashboardData();
  const shortName = data.studentName.split(/\s+/).at(-1) ?? data.studentName;
  const initials = data.studentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const latestReleasedAttempt = data.attempts.find((attempt) => {
    const result = getRelatedResult(attempt.result);
    return Boolean(result?.released_at);
  });
  const latestScore = latestReleasedAttempt
    ? Number(getRelatedResult(latestReleasedAttempt.result)?.total_score)
    : null;

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <StudentSidebar studentName={data.studentName} activeRoute="dashboard" />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-bold text-slate-900">Mầm Học</span>
            </div>

            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">{today}</p>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell
                userId={data.studentId}
                initialNotifications={data.notifications}
              />
              {!data.hasDataError ? (
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
                aria-label={`Tài khoản ${data.studentName}`}
              >
                {initials || 'SV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Không gian học tập
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Chào {shortName}! 👋
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Chúc bạn một ngày học tập hiệu quả. Dưới đây là tổng quan các lớp và nhiệm vụ của bạn.
              </p>
            </div>
          </section>

          {data.hasDataError && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="min-w-0">
                <p className="font-semibold">Một số thông tin tạm thời chưa thể tải đầy đủ</p>
                <p className="mt-1 text-amber-900/80">
                  Kiểm tra kết nối Supabase và chính sách RLS, sau đó tải lại trang.
                </p>
              </div>
            </div>
          )}

          {/* Metric Cards Bento Grid */}
          <section aria-label="Thống kê học tập" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Lớp đang tham gia"
              value={data.classes.length.toLocaleString('vi-VN')}
              detail="Các lớp chưa lưu trữ"
              icon={BookOpen}
              tone="green"
            />
            <MetricCard
              label="Đề thi đang mở"
              value={data.openExams.length.toLocaleString('vi-VN')}
              detail="Có thể vào thi ngay"
              icon={CalendarClock}
              tone="blue"
            />
            <MetricCard
              label="Bài thi đã nộp"
              value={data.submittedAttemptCount.toLocaleString('vi-VN')}
              detail="Đã hoàn thành hoặc chờ chấm"
              icon={ClipboardList}
              tone="orange"
            />
            <MetricCard
              label="Điểm gần nhất"
              value={latestScore !== null && Number.isFinite(latestScore) ? latestScore.toLocaleString('vi-VN') : '—'}
              detail="Chỉ hiển thị điểm đã công bố"
              icon={Trophy}
              tone="violet"
            />
          </section>

          {/* Thao tác nhanh (Quick actions to independent pages) */}
          <section
            aria-label="Thao tác nhanh"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Link
              href="/student/classes"
              className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white">
                <BookOpen aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Lớp học của tôi</span>
                <span className="mt-0.5 block text-xs text-emerald-800/70">Xem môn và lớp đã ghi danh</span>
              </span>
            </Link>
            <Link
              href="/student/materials"
              className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sky-900 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-sky-600 text-white">
                <FileText aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Tài liệu học tập</span>
                <span className="mt-0.5 block text-xs text-sky-800/70">Slide bài giảng, PDF & Video</span>
              </span>
            </Link>
            <Link
              href="/student/assignments"
              className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4 text-teal-900 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white">
                <FileCheck2 aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Bài tập về nhà</span>
                <span className="mt-0.5 block text-xs text-teal-800/70">Nộp file & xem điểm chấm</span>
              </span>
            </Link>
            <Link
              href="/student/exams"
              className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-violet-900 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-violet-600 text-white">
                <CalendarClock aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Đề thi & Kết quả</span>
                <span className="mt-0.5 block text-xs text-violet-800/70">Làm đề và xem lịch sử thi</span>
              </span>
            </Link>
          </section>

          {/* Tóm tắt Lớp học gần đây */}
          <section className="space-y-4">
            <SectionHeading
              eyebrow="Lớp học"
              title="Lớp học gần đây"
              detail={`${data.classes.length} lớp đang tham gia`}
              action={{ label: 'Xem tất cả lớp học', href: '/student/classes' }}
            />
            {data.classes.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.classes.slice(0, 3).map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            ) : (
              <EmptyState>
                Bạn chưa được ghi danh vào lớp nào. Hãy liên hệ giảng viên để nhận mã lớp.
              </EmptyState>
            )}
          </section>

          {/* Grid 2 cột: Đề thi mở & Thông báo */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Đề thi"
                title="Đề thi đang mở"
                detail="Các đề trong lớp của bạn đang còn thời gian làm bài"
                action={{ label: 'Xem tất cả đề thi', href: '/student/exams' }}
              />
              {data.openExams.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.openExams.slice(0, 2).map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              ) : (
                <EmptyState>Hiện chưa có đề thi nào đang mở cho các lớp của bạn.</EmptyState>
              )}
            </section>

            <section className="space-y-4">
              <SectionHeading
                eyebrow="Cập nhật"
                title="Thông báo mới"
                detail="Thông tin mới nhất từ hệ thống đào tạo"
              />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Hộp thư thông báo</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.notifications.length ? (
                    <ul className="divide-y divide-slate-100">
                      {data.notifications.slice(0, 4).map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))}
                    </ul>
                  ) : (
                    <EmptyState>Bạn chưa có thông báo mới.</EmptyState>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Lịch sử thi tóm tắt */}
          <section className="space-y-4">
            <SectionHeading
              eyebrow="Kết quả"
              title="Lịch sử thi gần nhất"
              detail="Điểm số chỉ xuất hiện sau khi giảng viên công bố kết quả"
              action={{ label: 'Xem toàn bộ hồ sơ thi', href: '/student/exams' }}
            />
            <Card>
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
                                  className="block font-medium text-slate-800 transition hover:text-emerald-700 hover:underline"
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

          <Separator />
          <footer className="pb-2 text-center text-xs text-slate-400">
            Mầm Học · Cùng bạn học tốt hơn mỗi ngày
          </footer>
        </div>
      </div>
    </main>
  );
}
