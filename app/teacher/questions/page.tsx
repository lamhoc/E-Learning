import { Suspense } from 'react';
import { GraduationCap, LibraryBig } from 'lucide-react';
import { getTeacherQuestionsData } from '@/lib/question-bank';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { QuestionManager } from '@/components/teacher/question-manager';
import { Skeleton } from '@/components/ui/skeleton';

type QuestionsPageProps = {
  searchParams: Promise<{
    subject?: string;
    type?: string;
    q?: string;
  }>;
};

export default async function TeacherQuestionsPage({ searchParams }: QuestionsPageProps) {
  const { subject, type, q } = await searchParams;
  const data = await getTeacherQuestionsData({
    subjectId: typeof subject === 'string' ? subject : undefined,
    type: typeof type === 'string' ? type : undefined,
    query: typeof q === 'string' ? q : undefined,
  });

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="questions" teacherName={data.teacherName} />

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

        <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e5f0e9] text-[#246348]">
                  <LibraryBig className="size-4" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Ngân hàng câu hỏi
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Quản lý kho câu hỏi trắc nghiệm và tự luận để phục vụ tạo đề thi cho học sinh.
              </p>
            </div>
          </section>

          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <QuestionManager
              initialQuestions={data.questions}
              subjects={data.assignedSubjects}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
