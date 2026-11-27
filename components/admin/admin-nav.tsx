'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/app/subjects/actions';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Separator } from '@/components/ui/separator';

export function AdminNav() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Client admin signOut error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const navItems = [
    {
      label: 'Tổng quan',
      href: '/admin',
      icon: LayoutDashboard,
      isActive: pathname === '/admin',
    },
    {
      label: 'Giảng viên & Phân môn',
      href: '/admin/teacher-access',
      icon: GraduationCap,
      isActive: pathname.startsWith('/admin/teacher-access'),
    },
    {
      label: 'Tài khoản Sinh viên',
      href: '/admin/student-management',
      icon: Users,
      isActive: pathname.startsWith('/admin/student-management'),
    },
    {
      label: 'Môn học',
      href: '/admin/subjects',
      icon: BookOpen,
      isActive: pathname.startsWith('/admin/subjects'),
    },
  ];

  return (
    <>
      {/* ── Desktop Navigation (md:) ── */}
      <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              prefetch={true}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                item.isActive
                  ? '!bg-blue-600 !text-white shadow-sm ring-1 ring-blue-400/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  item.isActive ? 'text-white' : 'text-[#154C99] dark:text-[#3B82F6]'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <ThemeToggle />

        <form
          action={signOut}
          onSubmit={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
        >
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            onClick={handleSignOut}
            className="gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-700 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900 dark:border-slate-700 cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? (
              <LoaderCircle className="size-3.5 animate-spin text-red-500" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
          </Button>
        </form>
      </nav>

      {/* ── Mobile Header Actions (< md:) ── */}
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Mở menu quản trị"
          className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* ── Mobile Admin Drawer Slide-over (< md:) ── */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div
          onClick={() => setIsMobileOpen(false)}
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        <div
          className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-[#0A275C] dark:bg-[#0B1628] text-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-white/10 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">Quản trị viên</p>
                <p className="text-[11px] text-white/60 leading-tight">Đại học Lạc Hồng</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Đóng menu"
              className="grid size-8 place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav aria-label="Điều hướng quản trị di động" className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    item.isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md ring-1 ring-blue-400'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="size-4.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer & Logout */}
          <div className="shrink-0 p-4 border-t border-white/10 dark:border-slate-800/80 bg-[#0A275C] dark:bg-[#0B1628]">
            <Button
              type="button"
              variant="ghost"
              disabled={isLoggingOut}
              onClick={handleSignOut}
              className="h-10 w-full justify-start gap-2.5 px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition cursor-pointer disabled:opacity-60 rounded-xl"
            >
              {isLoggingOut ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-rose-300" />
              ) : (
                <LogOut aria-hidden="true" className="size-4" />
              )}
              <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất khỏi hệ thống'}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
