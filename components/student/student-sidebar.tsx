'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ClipboardList,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/brand-logo';

export type StudentSidebarRoute =
  | 'dashboard'
  | 'classes'
  | 'materials'
  | 'assignments'
  | 'exams'
  | 'ai-tutor';

type StudentSidebarProps = {
  studentName: string;
  activeRoute?: StudentSidebarRoute;
};

export function StudentSidebar({ studentName, activeRoute }: StudentSidebarProps) {
  const pathname = usePathname();

  const initials = studentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const navItems = [
    { id: 'dashboard' as const, label: 'Tổng quan', href: '/student/dashboard', icon: LayoutDashboard },
    { id: 'classes' as const, label: 'Lớp học', href: '/student/classes', icon: BookOpen },
    { id: 'materials' as const, label: 'Tài liệu', href: '/student/materials', icon: FileText },
    { id: 'assignments' as const, label: 'Bài tập', href: '/student/assignments', icon: FileCheck2 },
    { id: 'exams' as const, label: 'Đề thi', href: '/student/exams', icon: ClipboardList },
    { id: 'ai-tutor' as const, label: 'Gia sư AI', href: '/student/ai-tutor', icon: Sparkles },
  ];

  return (
    <aside className="hidden min-h-screen flex-col border-r border-white/10 bg-[#0A275C] dark:bg-[#0B1628] dark:border-slate-800/80 px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      {/* Brand Logo LHU ở góc trên bên trái */}
      <div className="px-1">
        <BrandLogo
          href="/student/dashboard"
          size="md"
          variant="framed"
          subtitle="Khu vực Sinh viên"
        />
      </div>

      <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
        Menu Sinh viên
      </div>

      <nav aria-label="Điều hướng chính" className="mt-3 space-y-1">
        {navItems.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeRoute
            ? activeRoute === id
            : (id === 'dashboard' ? pathname === '/student/dashboard' : pathname.startsWith(href));

          return (
            <Link
              key={label}
              href={href}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/15 text-white ring-1 ring-[#FACC15]/50 shadow-xs font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 transition-colors ${isActive ? 'text-[#FACC15]' : 'text-white/70'}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
            {initials || 'SV'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{studentName}</span>
            <span className="block text-xs text-white/60">Sinh viên LHU</span>
          </span>
        </div>
        <Separator className="my-4 bg-white/15 dark:bg-slate-800" />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-9 w-full justify-start gap-2 px-2 text-white/75 hover:bg-white/10 hover:text-white dark:hover:bg-slate-800"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Đăng xuất
          </Button>
        </form>
      </div>
    </aside>
  );
}
