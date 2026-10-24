import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f4f6f1] text-[#202b27] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar Placeholder */}
      <div className="hidden lg:block border-r border-[#dfe5dd] bg-white p-5 space-y-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-xl bg-slate-200" />
          <Skeleton className="h-5 w-24 rounded-lg bg-slate-200" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full rounded-xl bg-slate-100" />
          <Skeleton className="h-10 w-full rounded-xl bg-slate-100" />
          <Skeleton className="h-10 w-full rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Main Area */}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#dfe5dd] bg-[#f8faf7]/95 px-5 py-3.5 sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-lg bg-slate-200" />
            <Skeleton className="size-9 rounded-full bg-slate-200" />
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-7 px-5 py-7 sm:px-8 sm:py-8">
          {/* Hero Banner Skeleton */}
          <div className="h-40 w-full rounded-3xl bg-slate-200/80 animate-pulse p-8 flex flex-col justify-between">
            <Skeleton className="h-4 w-28 rounded-md bg-slate-300" />
            <Skeleton className="h-8 w-64 rounded-xl bg-slate-300" />
            <Skeleton className="h-4 w-96 rounded-md bg-slate-300" />
          </div>

          {/* Metric Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl bg-white border border-slate-200" />
            <Skeleton className="h-28 rounded-2xl bg-white border border-slate-200" />
            <Skeleton className="h-28 rounded-2xl bg-white border border-slate-200" />
          </div>

          {/* Exams Skeleton Grid */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-40 rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-44 rounded-2xl bg-white border border-slate-200" />
              <Skeleton className="h-44 rounded-2xl bg-white border border-slate-200" />
              <Skeleton className="h-44 rounded-2xl bg-white border border-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

