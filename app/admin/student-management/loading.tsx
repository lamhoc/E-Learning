import { Skeleton } from '@/components/ui/skeleton';

export default function AdminStudentManagementLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8 sm:py-9 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-md bg-slate-200" />
        <Skeleton className="h-8 w-72 rounded-xl bg-slate-200" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md bg-slate-200" />
      </div>

      {/* Table Card Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:w-72 rounded-xl bg-slate-100" />
          <Skeleton className="h-10 w-44 rounded-xl bg-slate-100" />
        </div>

        <div className="space-y-3 pt-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}

