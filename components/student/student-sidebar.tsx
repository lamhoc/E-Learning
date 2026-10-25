import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type StudentSidebarProps = {
  studentName: string;
  activeRoute?: 'dashboard' | 'classes' | 'materials' | 'assignments' | 'exams' | 'ai-tutor';
};

export function StudentSidebar({ studentName, activeRoute = 'dashboard' }: StudentSidebarProps) {
  const initials = studentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', href: '/student/dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Lớp học', href: '/student/dashboard#classes', icon: BookOpen },
    { id: 'materials', label: 'Tài liệu', href: '/student/dashboard#materials', icon: FileText },
    { id: 'assignments', label: 'Bài tập', href: '/student/dashboard#assignments', icon: FileCheck2 },
    { id: 'exams', label: 'Đề thi', href: '/student/dashboard#exams', icon: ClipboardList },
    { id: 'ai-tutor', label: 'Gia sư AI', href: '/student/ai-tutor', icon: Sparkles },
  ];

  return (
    <aside className="hidden min-h-screen flex-col border-r border-[#d9e3dc] bg-[#17372e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <Link href="/student/dashboard" className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-xl bg-[#c9ed99] text-[#17372e]">
          <GraduationCap aria-hidden="true" className="size-6" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-wide">Mầm Học</span>
          <span className="mt-0.5 block text-xs text-white/55">Không gian học tập</span>
        </span>
      </Link>

      <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        Khu vực sinh viên
      </div>

      <nav aria-label="Điều hướng chính" className="mt-3 space-y-1">
        {navItems.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeRoute === id;
          return (
            <Link
              key={label}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/12 text-white ring-1 ring-white/10'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 ${isActive ? 'text-[#c9ed99]' : ''}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]">
            {initials || 'SV'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{studentName}</span>
            <span className="block text-xs text-white/55">Sinh viên</span>
          </span>
        </div>
        <Separator className="my-4 bg-white/12" />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-9 w-full justify-start gap-2 px-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Đăng xuất
          </Button>
        </form>
      </div>
    </aside>
  );
}
