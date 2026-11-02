import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherQuestionsLoading() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[#e1e8e2] bg-[#17372e] p-5 lg:block">
        <Skeleton className="mb-10 h-9 w-36 bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full bg-white/10 rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-[#e2e8e2] bg-white/95 px-5 py-3 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </header>

        <section className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>

          {/* Filter Bar Skeleton */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>

          {/* Question Cards Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Skeleton className="h-8 rounded" />
                  <Skeleton className="h-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

