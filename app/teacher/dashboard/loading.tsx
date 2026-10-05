import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[#e1e8e2] bg-white p-5 lg:block">
        <Skeleton className="mb-10 h-9 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </aside>
      <section className="mx-auto w-full max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-[370px] rounded-xl" />
          <Skeleton className="h-[370px] rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </section>
    </main>
  );
}
