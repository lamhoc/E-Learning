import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherAssignmentsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors p-6 sm:p-10 space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-8 w-64 bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-4 w-96 bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5">
            <Skeleton className="h-full w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="h-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-3">
        <Skeleton className="h-full w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 space-y-3">
            <Skeleton className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <Skeleton className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <Skeleton className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

