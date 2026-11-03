import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  FileCheck,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/ui/brand-logo';
import { sanitizeVietnameseText } from '@/lib/utils';

export type TeacherSidebarActiveRoute =
  | 'dashboard'
  | 'materials'
  | 'assignments'
  | 'grading'
  | 'questions'
  | 'subjects'
  | 'ai-tutor';

type TeacherSidebarProps = {
  activeRoute: TeacherSidebarActiveRoute;
  teacherName: string;
};

export function TeacherSidebar({ activeRoute, teacherName }: TeacherSidebarProps) {
  const cleanTeacherName = sanitizeVietnameseText(teacherName) || 'Giảng viên';
  const initials = cleanTeacherName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const navItems = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      href: '/teacher/dashboard',
      icon: LayoutDashboard,
      active: activeRoute === 'dashboard',
    },
    {
      id: 'materials',
      label: 'Tài liệu giảng dạy',
      href: '/teacher/materials',
      icon: FileText,
      active: activeRoute === 'materials',
    },
    {
      id: 'assignments',
      label: 'Bài tập về nhà',
      href: '/teacher/assignments',
      icon: ClipboardList,
      active: activeRoute === 'assignments',
    },
    {
      id: 'grading',
      label: 'Chấm bài thi',
      href: '/teacher/grading',
      icon: FileCheck,
      active: activeRoute === 'grading',
    },
    {
      id: 'questions',
      label: 'Ngân hàng câu hỏi',
      href: '/teacher/questions',
      icon: HelpCircle,
      active: activeRoute === 'questions',
    },
    {
      id: 'subjects',
      label: 'Môn học',
      href: '/teacher/subjects',
      icon: BookOpen,
      active: activeRoute === 'subjects',
    },
    {
      id: 'ai-tutor',
      label: 'Gia sư AI',
      href: '/teacher/ai-tutor',
      icon: Sparkles,
      active: activeRoute === 'ai-tutor',
    },
  ];

  return (
    <aside className="hidden min-h-screen flex-col border-r border-white/10 bg-[#0A275C] dark:bg-[#0B1628] dark:border-slate-800/80 px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      {/* Brand Logo LHU ở góc trên bên trái */}
      <div className="px-1">
        <BrandLogo
          href="/teacher/dashboard"
          size="md"
          variant="framed"
          subtitle="Khu vực Giảng viên"
        />
      </div>

      <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
        Menu Giảng viên
      </div>

      <nav aria-label="Điều hướng chính" className="mt-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-white/15 text-white ring-1 ring-[#FACC15]/50 shadow-xs font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 transition-colors ${item.active ? 'text-[#FACC15]' : 'text-white/70'}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-xs">
            {initials || 'GV'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{cleanTeacherName}</span>
            <span className="block text-xs text-white/60">Giảng viên LHU</span>
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
