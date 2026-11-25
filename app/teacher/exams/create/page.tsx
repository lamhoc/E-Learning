import { Suspense } from 'react';
import { GraduationCap } from 'lucide-react';
import { getTeacherExamCreateData } from '@/lib/teacher-exam-create';
import { ExamCreateForm } from '@/components/teacher/exam-create-form';
import { Skeleton } from '@/components/ui/skeleton';

type PageProps = {
  searchParams: Promise<{
    editId?: string;
  }>;
};

export default async function TeacherExamCreatePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const editId = searchParams?.editId;
  const data = await getTeacherExamCreateData(editId);

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
              initialExam={data.initialExam}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
