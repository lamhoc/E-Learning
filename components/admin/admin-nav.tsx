'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/app/subjects/actions';

export function AdminNav() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
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
    <nav className="flex items-center gap-1 sm:gap-2">
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
            <span className={item.href === '/admin' ? 'hidden sm:inline' : 'hidden md:inline'}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Nút chuyển đổi Sáng / Tối */}
      <ThemeToggle />

      {/* Nút Đăng xuất độc lập */}
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
          <span className="hidden sm:inline">
            {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </span>
        </Button>
      </form>
    </nav>
  );
}
