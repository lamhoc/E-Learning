import { Suspense } from 'react';
import { GraduationCap, LibraryBig } from 'lucide-react';
import { getTeacherQuestionsData } from '@/lib/question-bank';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { QuestionManager } from '@/components/teacher/question-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentProfile } from '@/lib/auth-cache';

type QuestionsPageProps = {
  searchParams: Promise<{
    subject?: string;
    type?: string;
    q?: string;
  }>;
};

function QuestionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-28 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function QuestionsAsyncContent({ searchParams }: QuestionsPageProps) {
  const { subject, type, q } = await searchParams;
  const data = await getTeacherQuestionsData({
    subjectId: typeof subject === 'string' ? subject : undefined,
    type: typeof type === 'string' ? type : undefined,
    query: typeof q === 'string' ? q : undefined,
  });

  return (
    <QuestionManager
      initialQuestions={data.questions}
      subjects={data.assignedSubjects}
    />
  );
}

export default async function TeacherQuestionsPage({ searchParams }: QuestionsPageProps) {
  // Lấy thông tin profile từ cache nhanh (0ms nếu đã authenticate)
  const { fullName } = await getCurrentProfile();

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="questions" teacherName={fullName || 'Giảng viên'} />

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

          {/* Granular Suspense Streaming: Shell tĩnh tải 0ms, bảng dữ liệu câu hỏi stream về sau */}
          <Suspense fallback={<QuestionsSkeleton />}>
            <QuestionsAsyncContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
