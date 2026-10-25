import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  type StudentExam,
} from '@/lib/student-dashboard';
import { StudentSidebar } from '@/components/student/student-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';

export const metadata = {
  title: 'Đề thi & Kết quả | Mầm Học',
  description: 'Danh sách đề thi trực tuyến đang mở và lịch sử thi của sinh viên',
};

function getRelatedName(relation: { name: string } | { name: string }[] | null | undefined): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name ?? '';
  return relation.name;
}

function getRelatedExam(relation: { title: string; subject: { name: string } | { name: string }[] | null } | { title: string; subject: { name: string } | { name: string }[] | null }[] | null | undefined) {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

function getRelatedResult(relation: { total_score: number | string; released_at: string | null } | { total_score: number | string; released_at: string | null }[] | null | undefined) {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
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
      return {
        label: 'Đang làm bài',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    case 'pending_grading':
      return {
        label: 'Chờ chấm tự luận',
        className: 'border-sky-200 bg-sky-50 text-sky-800',
      };
    case 'completed':
      return {
        label: 'Đã hoàn thành',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      };
    case 'voided':
      return {
        label: 'Đã hủy',
        className: 'border-rose-200 bg-rose-50 text-rose-800',
      };
    default:
      return {
        label: 'Không xác định',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      };
  }
}

function ExamCard({ exam }: { exam: StudentExam }) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-emerald-200">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
          Đang mở thi
        </Badge>
        {exam.available_until && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Đóng {formatDate(exam.available_until, { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{exam.title}</h3>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          {getRelatedName(exam.subject) || 'Môn học'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {exam.duration_minutes} phút
          </span>
          <span>Tối đa {exam.max_attempts} lượt</span>
        </div>
        <Link
          href={`/student/exams/${exam.id}`}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#17372e] px-3 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-[#20493e]"
        >
          <span>Vào phòng thi</span>
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function StudentExamsPage() {
  const data = await getStudentDashboardData();
  const initials = data.studentName
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <StudentSidebar studentName={data.studentName} activeRoute="exams" />

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
              <NotificationBell userId={data.studentId} initialNotifications={data.notifications} />
              <Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex">
                <CheckCircle2 data-icon="inline-start" /> {data.openExams.length} Đề thi đang mở
              </Badge>
              <span
                className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]"
                aria-label={`Tài khoản ${data.studentName}`}
              >
                {initials || 'SV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-9 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Khảo thí & Đánh giá
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Đề thi & Kết quả thi
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Làm bài thi trực tuyến và xem kết quả sau khi được giảng viên công bố.
              </p>
            </div>
            <Link
              href="/student/dashboard"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              <ArrowLeft className="size-4" /> Về Tổng quan
            </Link>
          </section>

          {/* Section 1: Đề thi đang mở */}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Đề thi hiện có</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Đề thi đang mở</h2>
              <p className="mt-0.5 text-sm text-slate-500">Các đề thi trong lớp của bạn đang còn thời gian làm bài</p>
            </div>
            {data.openExams.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.openExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-slate-50 text-slate-400">
                  <CalendarClock className="size-5" />
                </span>
                <p className="mt-2 text-sm text-slate-500">Hiện chưa có đề thi nào đang mở cho các lớp của bạn.</p>
              </div>
            )}
          </section>

          {/* Section 2: Lịch sử làm bài */}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hồ sơ thi</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Lịch sử làm bài thi</h2>
              <p className="mt-0.5 text-sm text-slate-500">Điểm số sẽ tự động hiển thị sau khi giảng viên công bố kết quả</p>
            </div>
            <Card>
              <CardContent className="p-0">
                {data.attempts.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Đề thi</TableHead>
                          <TableHead className="hidden sm:table-cell">Ngày làm bài</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">Điểm số</TableHead>
                          <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.attempts.map((attempt) => {
                          const exam = getRelatedExam(attempt.exam);
                          const result = getRelatedResult(attempt.result);
                          const status = getAttemptStatus(attempt);
                          const score = result?.released_at ? Number(result.total_score) : null;
                          return (
                            <TableRow key={attempt.id}>
                              <TableCell className="min-w-48">
                                <span className="block font-medium text-slate-800">
                                  {exam?.title || 'Đề thi'}
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                  Lượt thi thứ {attempt.attempt_no}
                                </span>
                              </TableCell>
                              <TableCell className="hidden text-slate-500 sm:table-cell">
                                {formatDate(attempt.started_at, { hour: '2-digit', minute: '2-digit' })}
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
                              <TableCell className="text-right">
                                <Link
                                  href={`/student/exams/${attempt.exam_id}`}
                                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs' })}
                                >
                                  Chi tiết
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400">
                    Bạn chưa tham gia lượt thi nào.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

