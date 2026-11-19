import { Skeleton } from '@/components/ui/skeleton';

export default function StudentAiTutorLoading() {
  return (
    <div className="min-w-0">
      {/* Sidebar skeleton placeholder */}
      

      <div className="flex h-screen flex-col overflow-hidden min-w-0">
        {/* Topbar skeleton */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10 shrink-0">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </div>
        </header>

        {/* Chat area skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-61px)] bg-[#f8faf8]">
          <div className="flex-1 px-4 py-6 sm:px-6 space-y-5 max-w-3xl mx-auto w-full">
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-14 w-1/2 rounded-2xl" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-28 w-2/3 rounded-2xl" />
            </div>
          </div>

          <footer className="shrink-0 border-t border-[#e2e8e2] bg-white px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

