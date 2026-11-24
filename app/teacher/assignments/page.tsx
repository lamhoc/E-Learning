import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  PenTool,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { NotificationBell } from '@/components/layout/notification-bell';
import { getTeacherAllAssignmentsData } from '@/lib/teacher-all-assignments';
import { TeacherAssignmentsClient } from '@/components/teacher/teacher-assignments-client';

export const metadata: Metadata = {
  title: 'Bài tập về nhà | Đại học Lạc Hồng',
  description: 'Quản lý bài tập về nhà, theo dõi bài nộp và chấm điểm sinh viên các lớp phụ trách',
};

type TeacherAssignmentsPageProps = {
  searchParams: Promise<{ classId?: string }>;
};

export default async function TeacherAssignmentsPage({ searchParams }: TeacherAssignmentsPageProps) {
  const { classId } = await searchParams;
  const data = await getTeacherAllAssignmentsData();

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
    <div className="min-w-0">

      <div className="min-w-0">
        {/* Sticky Header Topbar */}
        <header className="hidden lg:block sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="hidden text-xs font-medium capitalize text-slate-500 dark:text-slate-400 sm:block">
                {today}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.teacherId} />
              <ThemeToggle />
              <Badge variant="outline" className="hidden gap-1.5 border-primary/20 bg-primary/10 text-primary sm:inline-flex">
                <CheckCircle2 data-icon="inline-start" /> {data.stats.totalAssignments} Bài tập đã giao
              </Badge>
              <span
                className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/30"
                aria-label={`Tài khoản ${data.teacherName}`}
              >
                {initials || 'GV'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          {/* Section Header */}
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Khảo thí & Đánh giá quá trình
              </p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#154C99]/10 text-[#154C99] dark:bg-[#3B82F6]/20 dark:text-[#60A5FA]">
                  <ClipboardList className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  Bài tập về nhà
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Giao bài tập, đặt hạn nộp, theo dõi tiến độ nộp bài và chấm điểm bài làm của sinh viên.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/teacher/grading"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700' })}
              >
                <PenTool className="size-4" /> Chấm bài thi trắc nghiệm & tự luận
              </Link>
            </div>
          </section>

          {/* Client Dashboard Component */}
          <TeacherAssignmentsClient
            classes={data.classes}
            assignments={data.assignments}
            stats={data.stats}
            initialClassId={classId}
          />
        </div>
      </div>
    </div>
  );
}

