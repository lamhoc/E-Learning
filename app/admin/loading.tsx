import { Skeleton } from '@/components/ui/skeleton';

export default function AdminHubLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10 animate-pulse">
      {/* Hero Header Skeleton */}
      <div className="h-48 w-full rounded-3xl bg-slate-200/80 p-8 flex flex-col justify-between">
        <Skeleton className="h-5 w-44 rounded-md bg-slate-300" />
        <Skeleton className="h-9 w-80 rounded-xl bg-slate-300" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md bg-slate-300" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-8 w-28 rounded-lg bg-slate-300" />
          <Skeleton className="h-8 w-28 rounded-lg bg-slate-300" />
        </div>
      </div>

      {/* Grid 2 Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-80 rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="size-14 rounded-2xl bg-slate-100" />
              <Skeleton className="h-6 w-24 rounded-full bg-slate-100" />
            </div>
            <Skeleton className="h-6 w-48 rounded-lg bg-slate-100" />
            <Skeleton className="h-4 w-full rounded-md bg-slate-100" />
            <Skeleton className="h-4 w-3/4 rounded-md bg-slate-100" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl bg-slate-50" />
        </div>

        <div className="h-80 rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="size-14 rounded-2xl bg-slate-100" />
              <Skeleton className="h-6 w-24 rounded-full bg-slate-100" />
            </div>
            <Skeleton className="h-6 w-48 rounded-lg bg-slate-100" />
            <Skeleton className="h-4 w-full rounded-md bg-slate-100" />
            <Skeleton className="h-4 w-3/4 rounded-md bg-slate-100" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl bg-slate-50" />
        </div>
      </div>
    </div>
  );
}

