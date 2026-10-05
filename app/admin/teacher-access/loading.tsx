import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherAccessLoading() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-56" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </main>
  );
}
