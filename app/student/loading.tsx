import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton dùng chung cho mọi trang Sinh viên chưa có loading.tsx riêng.
 * Hiện ngay khi bấm Sidebar (Streaming/Suspense) trong lúc server lấy dữ liệu.
 * Tông màu đồng bộ Light/Dark Mode (#09111E / #111C2D).
 */
export default function StudentLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] min-w-0 space-y-6 px-3.5 py-5 sm:px-6 sm:py-7 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-8 w-64 max-w-full bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-4 w-full max-w-md bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            key={i}
            className="h-32 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#111C2D]"
          />
        ))}
      </div>

      <Skeleton className="h-72 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#111C2D]" />
    </div>
  );
}
