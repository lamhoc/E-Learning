'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { sanitizeVietnameseText, cn } from '@/lib/utils';

type StudentShellProps = {
  children: ReactNode;
  studentName?: string;
};

export function StudentShell({ children, studentName = 'Sinh viên' }: StudentShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExamFullscreen, setIsExamFullscreen] = useState(false);

  // Lắng nghe sự kiện phòng thi kích hoạt / kết thúc chế độ toàn màn hình để ẩn hoàn toàn menu
  useEffect(() => {
    const handleExamFullscreen = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      setIsExamFullscreen(Boolean(customEvent.detail?.active));
    };

    window.addEventListener('exam-fullscreen-mode', handleExamFullscreen);
    return () => {
      window.removeEventListener('exam-fullscreen-mode', handleExamFullscreen);
    };
  }, []);

  // Đọc trạng thái thu gọn từ localStorage khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lhu_student_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Bỏ qua lỗi localStorage
    }
  }, []);

  // Tự động đóng mobile drawer khi chuyển trang
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Tự động thu gọn sidebar trên desktop khi sinh viên vào làm bài thi
  useEffect(() => {
    if (pathname && pathname.startsWith('/student/exams/') && pathname !== '/student/exams') {
      setIsCollapsed(true);
    }
  }, [pathname]);

  // Đóng khi bấm phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lhu_student_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const cleanStudentName = sanitizeVietnameseText(studentName) || 'Sinh viên';
  const initials = cleanStudentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('SignOut error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const isRouteActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/student/dashboard') {
      return pathname === '/student/dashboard' || pathname === '/student';
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      label: 'Tổng quan',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      active: isRouteActive('/student/dashboard'),
    },
    {
      label: 'Lớp học',
      href: '/student/classes',
      icon: GraduationCap,
      active: isRouteActive('/student/classes'),
    },
    {
      label: 'Tài liệu học tập',
      href: '/student/materials',
      icon: FileText,
      active: isRouteActive('/student/materials'),
    },
    {
      label: 'Bài tập về nhà',
      href: '/student/assignments',
      icon: ClipboardList,
      active: isRouteActive('/student/assignments'),
    },
    {
      label: 'Đề thi & Luyện tập',
      href: '/student/exams',
      icon: FileCheck,
      active: isRouteActive('/student/exams'),
    },
    {
      label: 'Lịch sử thi & Kết quả',
      href: '/student/results',
      icon: History,
      active: isRouteActive('/student/results'),
    },
    {
      label: 'Gia sư AI',
      href: '/student/ai-tutor',
      icon: Bot,
      active: isRouteActive('/student/ai-tutor'),
    },
  ];

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors">
      {/* ── 1. DESKTOP SIDEBAR (Kéo ra w-64 / Thu gọn w-20) ── */}
      <aside
        className={cn(
          isExamFullscreen ? 'hidden' : 'hidden lg:flex',
          'flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out',
          'bg-[#0A275C] dark:bg-[#0B1628] text-white border-r border-[#153B75] dark:border-slate-800/80 shadow-md',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Header: Logo LHU + Nút Thu gọn / Kéo ra */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-white/10 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <BrandLogo
                href="/student/dashboard"
                size="sm"
                variant="framed"
                badgeText="Sinh viên"
                subtitle="Đại học Lạc Hồng"
              />
              <button
                type="button"
                onClick={toggleCollapse}
                title="Thu gọn menu (w-20)"
                aria-label="Thu gọn menu"
                className="grid size-8 place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full gap-1">
              <button
                type="button"
                onClick={toggleCollapse}
                title="Mở rộng menu (w-64)"
                aria-label="Mở rộng menu"
                className="grid size-9 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <PanelLeftOpen className="size-5" />
              </button>
            </div>
          )}
        </div>

        {/* Danh sách 7 Menu Items (Cuộn dọc) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl transition-all duration-150 relative font-medium text-sm',
                  isCollapsed ? 'justify-center size-12 mx-auto px-0' : 'px-3 py-2.5 w-full',
                  item.active
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon
                  className={cn(
                    'size-5 shrink-0 transition-transform group-hover:scale-105',
                    item.active ? 'text-white' : 'text-blue-300 dark:text-blue-400'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {/* Floating tooltip khi thu gọn */}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: User Info + Đăng xuất */}
        <div className="p-3 border-t border-white/10 bg-black/10 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-full bg-blue-600 font-bold text-xs text-white grid place-items-center shrink-0 border border-blue-400/30">
                  {initials || 'SV'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{cleanStudentName}</p>
                  <p className="text-[11px] text-blue-200/80 truncate">Sinh viên LHU</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle className="size-8 rounded-lg !bg-white/10 !border-white/15 !text-white hover:!bg-white/20" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  title="Đăng xuất"
                  className="grid size-8 place-items-center rounded-lg text-white/70 hover:text-red-300 hover:bg-white/10 transition cursor-pointer shrink-0"
                >
                  {isLoggingOut ? (
                    <LoaderCircle className="size-4 animate-spin text-red-400" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                title={cleanStudentName}
                className="size-8 rounded-full bg-blue-600 font-bold text-xs text-white grid place-items-center shrink-0 border border-blue-400/30"
              >
                {initials || 'SV'}
              </div>
              <ThemeToggle className="size-8 rounded-lg !bg-white/10 !border-white/15 !text-white hover:!bg-white/20" />
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                title="Đăng xuất"
                className="grid size-8 place-items-center rounded-lg text-white/70 hover:text-red-300 hover:bg-white/10 transition cursor-pointer"
              >
                {isLoggingOut ? (
                  <LoaderCircle className="size-4 animate-spin text-red-400" />
                ) : (
                  <LogOut className="size-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── 2. KHUNG NỘI DUNG CHÍNH (Kèm Sticky Topbar trên Mobile) ── */}
      <div className={cn("flex-1 min-w-0 w-full max-w-full flex flex-col min-h-dvh", isExamFullscreen && "w-full")}>
        {/* Sticky Topbar trên Mobile (< 1024px) */}
        <header
          className={cn(
            isExamFullscreen ? 'hidden' : 'sticky top-0 z-40 h-14 bg-white/95 dark:bg-[#0B1628]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between lg:hidden shrink-0'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Nút Hamburger Menu */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Mở menu điều hướng"
              className="grid size-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#111C2D] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              <Menu className="size-5" />
            </button>

            {/* Logo LHU luôn là link quay về Trang chủ / Tổng quan */}
            <BrandLogo
              href="/student/dashboard"
              size="sm"
              variant="framed"
              badgeText="SV"
              subtitle="ĐH Lạc Hồng"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <div className="size-8 rounded-full bg-blue-600 font-bold text-xs text-white grid place-items-center shrink-0">
              {initials || 'SV'}
            </div>
          </div>
        </header>

        {/* Nội dung trang con */}
        <div className="flex-1 min-w-0 w-full max-w-full overflow-x-clip">
          {children}
        </div>
      </div>

      {/* ── 3. MOBILE DRAWER SLIDE-OVER (< 1024px) ── */}
      <div
        className={cn(
          isExamFullscreen && 'hidden',
          'fixed inset-0 z-50 lg:hidden transition-all duration-300',
          isMobileOpen ? 'visible' : 'invisible pointer-events-none'
        )}
        aria-hidden={!isMobileOpen || isExamFullscreen}
      >
        {/* Lớp nền mờ Backdrop */}
        <div
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            'fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300',
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />

        {/* Panel trượt từ cạnh trái */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0A275C] dark:bg-[#0B1628] text-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header Mobile Drawer */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
            <BrandLogo
              href="/student/dashboard"
              size="sm"
              variant="framed"
              badgeText="Sinh viên"
              subtitle="Đại học Lạc Hồng"
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

          {/* Danh sách Menu Items trong Drawer */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                    item.active
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5 shrink-0',
                      item.active ? 'text-white' : 'text-blue-300 dark:text-blue-400'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Mobile Drawer: Nút Đăng xuất ghim ở đáy */}
          <div className="p-4 border-t border-white/10 bg-black/15 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-blue-600 font-bold text-sm text-white grid place-items-center shrink-0 border border-blue-400/30">
                {initials || 'SV'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{cleanStudentName}</p>
                <p className="text-xs text-blue-200/80 truncate">Sinh viên LHU</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-red-200 hover:text-white bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 transition cursor-pointer disabled:opacity-60"
            >
              {isLoggingOut ? (
                <LoaderCircle className="size-4 animate-spin text-red-300" />
              ) : (
                <LogOut className="size-4" />
              )}
              <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất khỏi hệ thống'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
