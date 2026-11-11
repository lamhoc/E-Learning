'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ClipboardList,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/brand-logo';

export type StudentSidebarRoute =
  | 'dashboard'
  | 'classes'
  | 'materials'
  | 'assignments'
  | 'exams'
  | 'results'
  | 'ai-tutor';

type StudentSidebarProps = {
  studentName: string;
  activeRoute?: StudentSidebarRoute;
};

export function StudentSidebar({ studentName, activeRoute }: StudentSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = studentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  // Nguồn chân lý duy nhất cho active state:
  const isRouteActive = (routeId: StudentSidebarRoute, href: string) => {
    if (pathname) {
      if (routeId === 'dashboard') {
        return pathname === '/student/dashboard' || pathname === '/student';
      }
      return pathname.startsWith(href);
    }
    return activeRoute === routeId;
  };

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Client student signOut error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Tổng quan', href: '/student/dashboard', icon: LayoutDashboard },
    { id: 'classes' as const, label: 'Lớp học', href: '/student/classes', icon: BookOpen },
    { id: 'materials' as const, label: 'Tài liệu', href: '/student/materials', icon: FileText },
    { id: 'assignments' as const, label: 'Bài tập', href: '/student/assignments', icon: FileCheck2 },
    { id: 'exams' as const, label: 'Đề thi', href: '/student/exams', icon: ClipboardList },
    { id: 'results' as const, label: 'Kết quả học tập', href: '/student/results', icon: Trophy },
    { id: 'ai-tutor' as const, label: 'Gia sư AI', href: '/student/ai-tutor', icon: Sparkles },
  ];

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0A275C] dark:bg-[#0B1628] dark:border-slate-800/80 text-white overflow-hidden lg:sticky lg:top-0 lg:flex">
      {/* Phần 1: Brand Logo LHU ở đỉnh Sidebar */}
      <div className="shrink-0 p-4 border-b border-white/10 dark:border-slate-800/80">
        <BrandLogo
          href="/student/dashboard"
          size="md"
          variant="framed"
          subtitle="Khu vực Sinh viên"
        />
        <div className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
          Menu Sinh viên
        </div>
      </div>

      {/* Phần 2: Danh sách Menu ở giữa (Cuộn mượt mà khi màn hình thấp) */}
      <nav aria-label="Điều hướng chính" className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {navItems.map(({ id, label, href, icon: Icon }) => {
          const isActive = isRouteActive(id, href);

          return (
            <Link
              key={label}
              href={href}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/15 text-white ring-1 ring-[#FACC15]/50 shadow-xs font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 transition-colors ${isActive ? 'text-[#FACC15]' : 'text-white/70'}`}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Phần 3: Khung Thông tin tài khoản & Nút Đăng xuất ở Đáy (Cố định 100%) */}
      <div className="shrink-0 p-3 border-t border-white/10 dark:border-slate-800/80 bg-[#0A275C] dark:bg-[#0B1628] z-10">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
              {initials || 'SV'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{studentName}</span>
              <span className="block text-[11px] text-white/60">Sinh viên LHU</span>
            </span>
          </div>

          <Separator className="my-2.5 bg-white/15 dark:bg-slate-800" />

          <form
            action={signOut}
            onSubmit={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              disabled={isLoggingOut}
              onClick={handleSignOut}
              className="h-8 w-full justify-start gap-2 px-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
            >
              {isLoggingOut ? (
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-[#FACC15]" />
              ) : (
                <LogOut aria-hidden="true" className="size-3.5 text-white/70" />
              )}
              <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
