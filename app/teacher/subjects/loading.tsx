import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherSubjectsLoading() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar skeleton placeholder */}
      <aside className="hidden min-h-screen flex-col border-r border-[#d9e3dc] bg-[#17372e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="size-10 rounded-xl bg-white/20" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 bg-white/20" />
            <Skeleton className="h-3 w-28 bg-white/10" />
          </div>
        </div>
        <div className="mt-10 px-3">
          <Skeleton className="h-3 w-24 bg-white/10" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/10" />
          ))}
        </div>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full bg-white/20" />
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-24 bg-white/20" />
              <Skeleton className="h-2.5 w-16 bg-white/10" />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Topbar skeleton */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="hidden h-4 w-32 rounded sm:block" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content skeleton */}
        <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 rounded-lg" />
              <Skeleton className="h-4 w-80 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>

          {/* Quick Metrics Bar skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <Skeleton className="size-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-6 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Subject Cards Grid skeleton */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-40 rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-7 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
