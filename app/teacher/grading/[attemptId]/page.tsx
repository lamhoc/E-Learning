import { GraduationCap } from 'lucide-react';
import { getTeacherGradingData } from '@/lib/teacher-grading';
import { EssayGradingClient } from '@/components/teacher/essay-grading-client';

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
            
            <p className="hidden text-xs font-medium capitalize text-slate-500 dark:text-slate-400 sm:block">
              {today}
            </p>
            
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <EssayGradingClient data={data} />
        </div>
      </div>
    </div>
  );
}
