import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherExamCreateLoading() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
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

        <section className="mx-auto max-w-4xl space-y-6 px-5 py-6 sm:px-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </section>
      </div>
    </main>
  );
}

