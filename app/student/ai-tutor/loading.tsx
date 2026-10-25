import { Skeleton } from '@/components/ui/skeleton';

export default function StudentAiTutorLoading() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar skeleton placeholder */}
      <aside className="hidden min-h-screen flex-col border-r border-[#d9e3dc] bg-[#17372e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="size-10 rounded-xl bg-white/20" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 bg-white/20" />
            <Skeleton className="h-3 w-28 bg-white/10" />
          </div>
        </div>
        <div className="mt-10 px-3">
          <Skeleton className="h-3 w-24 bg-white/10" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/10" />
          ))}
        </div>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full bg-white/20" />
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-24 bg-white/20" />
              <Skeleton className="h-2.5 w-16 bg-white/10" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex h-screen flex-col overflow-hidden min-w-0">
        {/* Topbar skeleton */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10 shrink-0">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-4 w-px" />
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
    </main>
  );
}

