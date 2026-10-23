import { Suspense } from 'react';
import { GraduationCap } from 'lucide-react';
import { getTeacherExamCreateData } from '@/lib/teacher-exam-create';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ExamCreateForm } from '@/components/teacher/exam-create-form';
import { Skeleton } from '@/components/ui/skeleton';

export default async function TeacherExamCreatePage() {
  const data = await getTeacherExamCreateData();

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="dashboard" teacherName={data.teacherName} />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-semibold">Mầm Học</span>
            </div>
            <p className="hidden text-xs font-medium capitalize text-muted-foreground sm:block">
              {today}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <ExamCreateForm
              assignedSubjects={data.assignedSubjects}
              classes={data.classes}
              questions={data.questions}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

