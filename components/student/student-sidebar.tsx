'use client';

import { useState, useEffect } from 'react';
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
  Menu,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/brand-logo';
import { sanitizeVietnameseText } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

/** Nút Hamburger mở Menu trượt ngang trên Mobile */
export function StudentSidebarTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-student-sidebar'));
        }
      }}
      aria-label="Mở menu điều hướng"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer lg:hidden',
        className
      )}
    >
      <Menu className="size-5" />
    </button>
  );
}

export function StudentSidebar({ studentName, activeRoute }: StudentSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const cleanStudentName = sanitizeVietnameseText(studentName) || 'Sinh viên';
  const initials = cleanStudentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  // Tự động đóng drawer khi đổi trang
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lắng nghe sự kiện mở menu từ Topbar di động
  useEffect(() => {
    const handleOpen = () => setIsMobileOpen(true);
    const handleClose = () => setIsMobileOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };

    window.addEventListener('open-student-sidebar', handleOpen);
    window.addEventListener('close-student-sidebar', handleClose);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-student-sidebar', handleOpen);
      window.removeEventListener('close-student-sidebar', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    <>
      {/* ── 1. Desktop Static Sidebar (lg:flex, Cố định bên trái) ── */}
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
                key={id}
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

        {/* Phần 3: Khung Thông tin tài khoản & Nút Đăng xuất ở Đáy */}
        <div className="shrink-0 p-3 border-t border-white/10 dark:border-slate-800/80 bg-[#0A275C] dark:bg-[#0B1628] z-10">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
                {initials || 'SV'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{cleanStudentName}</span>
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

      {/* ── 2. Mobile Drawer Slide-over (< 1024px) ── */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {/* Lớp nền mờ Backdrop */}
        <div
          onClick={() => setIsMobileOpen(false)}
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Khung Drawer trượt ngang từ mép trái */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0A275C] dark:bg-[#0B1628] text-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header Drawer: Logo + nút Đóng (X) */}
          <div className="shrink-0 p-4 border-b border-white/10 dark:border-slate-800/80 flex items-center justify-between">
            <BrandLogo
              href="/student/dashboard"
              size="sm"
              variant="framed"
              subtitle="Khu vực Sinh viên"
            />
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Đóng menu"
              className="grid size-8 place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* 7 Mục Menu Sinh viên: Cuộn dọc mượt mà */}
          <nav aria-label="Điều hướng di động" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
            {navItems.map(({ id, label, href, icon: Icon }) => {
              const isActive = isRouteActive(id, href);
              return (
                <Link
                  key={id}
                  href={href}
                  prefetch={true}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
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

          {/* Thông tin tài khoản & Đăng xuất: Luôn ghim cố định ở đáy Drawer */}
          <div className="shrink-0 p-3 border-t border-white/10 dark:border-slate-800/80 bg-[#0A275C] dark:bg-[#0B1628]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
                  {initials || 'SV'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{cleanStudentName}</span>
                  <span className="block text-[11px] text-white/60">Sinh viên LHU</span>
                </span>
              </div>

              <Separator className="my-2.5 bg-white/15 dark:bg-slate-800" />

              <Button
                type="button"
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
