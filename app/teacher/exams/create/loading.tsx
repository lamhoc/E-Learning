import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherExamCreateLoading() {
  return (
    <div className="min-w-0">
      
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
    </div>
  );
}

