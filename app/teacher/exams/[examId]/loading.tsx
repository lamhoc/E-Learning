import { Skeleton } from '@/components/ui/skeleton';

export default function ExamAnalyticsLoading() {
  return (
    <div className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <div className="hidden lg:block border-r border-[#dfe7e0] bg-[#17372e] p-5 space-y-6">
        <Skeleton className="size-9 rounded-xl bg-white/20" />
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3.5 sm:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between">
            <Skeleton className="h-4 w-36 rounded-lg bg-slate-200" />
            <Skeleton className="size-9 rounded-full bg-slate-200" />
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 animate-pulse">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 rounded-xl bg-slate-200" />
            <Skeleton className="h-4 w-96 rounded-md bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Skeleton className="h-24 rounded-2xl bg-white border border-slate-200" />
            <Skeleton className="h-24 rounded-2xl bg-white border border-slate-200" />
            <Skeleton className="h-24 rounded-2xl bg-white border border-slate-200" />
            <Skeleton className="h-24 rounded-2xl bg-white border border-slate-200" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <Skeleton className="h-10 w-64 rounded-xl bg-slate-100" />
            <Skeleton className="h-72 w-full rounded-xl bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

