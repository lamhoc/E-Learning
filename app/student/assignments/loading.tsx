import { Skeleton } from '@/components/ui/skeleton';

export default function StudentAssignmentsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 lg:px-10">
      <div className="space-y-2 border-b border-slate-200 pb-5">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-10 w-36 rounded-lg mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

