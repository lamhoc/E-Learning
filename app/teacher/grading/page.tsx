import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileCheck, GraduationCap, PenTool } from 'lucide-react';
import { getTeacherGradingQueue } from '@/lib/teacher-grading';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { GradingQueueClient } from '@/components/teacher/grading-queue-client';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Chấm thi & Đánh giá tự luận | Mầm Học',
  description: 'Danh sách các bài thi tự luận cần giảng viên chấm điểm và công bố kết quả',
};

export default async function TeacherGradingQueuePage() {
  const data = await getTeacherGradingQueue();

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="grading" teacherName={data.teacherName} />

      <div className="min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/teacher/dashboard"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5' })}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Tổng quan</span>
              </Link>
            </div>

            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">
              {today}
            </p>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.teacherId} />
              {data.totalPendingCount > 0 ? (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 text-xs">
                  {data.totalPendingCount} bài chờ chấm
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                  <CheckCircle2 className="size-3 mr-1" /> Đã hoàn tất chấm
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

        {/* Main Content */}
        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          {/* Header Title Section */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Đánh giá & Chấm điểm
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Chấm bài thi tự luận ✍️
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Theo dõi các bài thi sinh viên đã nộp, chấm câu hỏi tự luận theo rubric đáp án mẫu và công bố điểm số.
              </p>
            </div>
          </section>

          {/* Interactive Client Component */}
          <GradingQueueClient data={data} />
        </div>
      </div>
    </main>
  );
}

