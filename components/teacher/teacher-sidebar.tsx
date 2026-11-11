'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/brand-logo';
import { sanitizeVietnameseText } from '@/lib/utils';

export type TeacherSidebarActiveRoute =
  | 'dashboard'
  | 'subjects'
  | 'classes'
  | 'materials'
  | 'assignments'
  | 'questions'
  | 'ai-generator'
  | 'exams'
  | 'grading'
  | 'ai-tutor';

type TeacherSidebarProps = {
  activeRoute?: TeacherSidebarActiveRoute;
  teacherName: string;
};

export function TeacherSidebar({ activeRoute, teacherName }: TeacherSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const cleanTeacherName = sanitizeVietnameseText(teacherName) || 'Giảng viên';
  const initials = cleanTeacherName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  // Nguồn chân lý duy nhất cho active state:
  // Nếu có pathname: 'dashboard' chỉ active khi khớp chính xác tuyệt đối '===', các route khác dùng 'startsWith'
  const isRouteActive = (routeId: TeacherSidebarActiveRoute, href: string) => {
    if (pathname) {
      if (routeId === 'dashboard') {
        return pathname === '/teacher/dashboard' || pathname === '/teacher';
      }
      return pathname.startsWith(href);
    }
    return activeRoute === routeId;
  };

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // 1. Gọi client Supabase signOut để xóa session cookies ở client
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Client signOut error:', err);
    } finally {
      // 2. Điều hướng cưỡng bức tới /login để giải phóng toàn bộ router cache và state
      window.location.href = '/login';
    }
  };

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Tổng quan',
      href: '/teacher/dashboard',
      icon: LayoutDashboard,
      active: isRouteActive('dashboard', '/teacher/dashboard'),
    },
    {
      id: 'subjects' as const,
      label: 'Môn học',
      href: '/teacher/subjects',
      icon: BookOpen,
      active: isRouteActive('subjects', '/teacher/subjects'),
    },
    {
      id: 'classes' as const,
      label: 'Lớp học',
      href: '/teacher/classes',
      icon: GraduationCap,
      active: isRouteActive('classes', '/teacher/classes'),
    },
    {
      id: 'materials' as const,
      label: 'Tài liệu giảng dạy',
      href: '/teacher/materials',
      icon: FileText,
      active: isRouteActive('materials', '/teacher/materials'),
    },
    {
      id: 'assignments' as const,
      label: 'Bài tập về nhà',
      href: '/teacher/assignments',
      icon: ClipboardList,
      active: isRouteActive('assignments', '/teacher/assignments'),
    },
    {
      id: 'questions' as const,
      label: 'Ngân hàng câu hỏi',
      href: '/teacher/questions',
      icon: HelpCircle,
      active: isRouteActive('questions', '/teacher/questions'),
    },
    {
      id: 'ai-generator' as const,
      label: 'Sinh câu hỏi AI',
      href: '/teacher/ai-generator',
      icon: Sparkles,
      active: isRouteActive('ai-generator', '/teacher/ai-generator'),
    },
    {
      id: 'exams' as const,
      label: 'Đề thi',
      href: '/teacher/exams',
      icon: FileCheck,
      active: isRouteActive('exams', '/teacher/exams'),
    },
    {
      id: 'grading' as const,
      label: 'Chấm bài thi',
      href: '/teacher/grading',
      icon: PenTool,
      active: isRouteActive('grading', '/teacher/grading'),
    },
    {
      id: 'ai-tutor' as const,
      label: 'Gia sư AI',
      href: '/teacher/ai-tutor',
      icon: Bot,
      active: isRouteActive('ai-tutor', '/teacher/ai-tutor'),
    },
  ];

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0A275C] dark:bg-[#0B1628] dark:border-slate-800/80 text-white overflow-hidden lg:sticky lg:top-0 lg:flex">
      {/* Phần 1: Brand Logo LHU ở đỉnh Sidebar (Cố định không cuộn) */}
      <div className="shrink-0 p-4 border-b border-white/10 dark:border-slate-800/80">
        <BrandLogo
          href="/teacher/dashboard"
          size="md"
          variant="framed"
          subtitle="Khu vực Giảng viên"
        />
        <div className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
          Menu Giảng viên
        </div>
      </div>

      {/* Phần 2: Danh sách Menu ở giữa (Tự do cuộn mượt mà nếu màn hình thấp) */}
      <nav aria-label="Điều hướng chính" className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-white/15 text-white ring-1 ring-[#FACC15]/50 shadow-xs font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 transition-colors ${item.active ? 'text-[#FACC15]' : 'text-white/70'}`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Phần 3: Khung Thông tin tài khoản & Nút Đăng xuất ở Đáy (Luôn cố định 100%, không bị đẩy khuất) */}
      <div className="shrink-0 p-3 border-t border-white/10 dark:border-slate-800/80 bg-[#0A275C] dark:bg-[#0B1628] z-10">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
              {initials || 'GV'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{cleanTeacherName}</span>
              <span className="block text-[11px] text-white/60">Giảng viên LHU</span>
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
