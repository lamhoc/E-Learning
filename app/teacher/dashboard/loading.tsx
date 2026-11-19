import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherDashboardLoading() {
  return (
    <div className="min-w-0">
      
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
    </div>
  );
}
