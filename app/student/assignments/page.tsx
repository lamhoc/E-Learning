import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getStudentDashboardData } from '@/lib/student-dashboard';
import { StudentSidebar } from '@/components/student/student-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';
import { StudentAssignments } from '@/components/student/student-assignments';

export const metadata = {
  title: 'Bài tập về nhà | Mầm Học',
  description: 'Nộp bài tập tự luận, bài tập nhóm, đồ án và theo dõi kết quả chấm điểm',
};

export default async function StudentAssignmentsPage() {
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

  const pendingCount = data.assignments.filter((a) => !a.submission).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <StudentSidebar studentName={data.studentName} activeRoute="assignments" />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="lg:hidden">
              <BrandLogo size="sm" />
            </div>

            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">{today}</p>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.studentId} initialNotifications={data.notifications} />
              <ThemeToggle />
              {pendingCount > 0 ? (
                <Badge variant="destructive" className="hidden sm:inline-flex">
                  {pendingCount} bài cần nộp
                </Badge>
              ) : (
                <Badge variant="outline" className="hidden gap-1.5 border-primary/20 bg-primary/10 text-primary sm:inline-flex">
                  <CheckCircle2 data-icon="inline-start" /> Đã hoàn thành tất cả
                </Badge>
              )}
              <span
                className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/30"
                aria-label={`Tài khoản ${data.studentName}`}
              >
                {initials || 'SV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Nhiệm vụ học tập
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Bài tập về nhà
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Tải đề bài, nộp file bài làm (.zip, .pdf, .docx) và theo dõi phản hồi chấm điểm của giảng viên.
              </p>
            </div>
            <Link
              href="/student/dashboard"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              <ArrowLeft className="size-4" /> Về Tổng quan
            </Link>
          </section>

          <StudentAssignments assignments={data.assignments} />
        </div>
      </div>
    </main>
  );
}

