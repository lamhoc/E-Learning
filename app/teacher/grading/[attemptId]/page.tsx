import { GraduationCap } from 'lucide-react';
import { getTeacherGradingData } from '@/lib/teacher-grading';
import { EssayGradingClient } from '@/components/teacher/essay-grading-client';
import { ThemeToggle } from '@/components/theme-toggle';

type TeacherGradingPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function TeacherGradingPage({ params }: TeacherGradingPageProps) {
  const { attemptId } = await params;
  const data = await getTeacherGradingData(attemptId);

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="min-w-0">

      <div className="min-w-0">
        <header className="hidden lg:block sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-semibold">Mầm Học</span>
            </div>
            <p className="hidden text-xs font-medium capitalize text-slate-500 dark:text-slate-400 sm:block">
              {today}
            </p>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <EssayGradingClient data={data} />
        </div>
      </div>
    </div>
  );
}
