import { Skeleton } from '@/components/ui/skeleton';

export default function StudentPageLoading() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-10">
      <div className="space-y-2 border-b border-slate-200 pb-5">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-9 w-full rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

