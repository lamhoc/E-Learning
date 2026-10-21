import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type TeacherSidebarProps = {
  activeRoute: 'dashboard' | 'questions' | 'subjects';
  teacherName: string;
};

export function TeacherSidebar({ activeRoute, teacherName }: TeacherSidebarProps) {
  const initials = teacherName
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
      id: 'questions',
      label: 'Ngân hàng câu hỏi',
      href: '/teacher/questions',
      icon: HelpCircle,
      active: activeRoute === 'questions',
    },
    {
      id: 'subjects',
      label: 'Môn học',
      href: '/subjects',
      icon: BookOpen,
      active: activeRoute === 'subjects',
    },
    {
      id: 'ai-tutor',
      label: 'Gia sư AI',
      href: '/chat',
      icon: Sparkles,
      active: false,
    },
  ];

  return (
    <aside className="hidden min-h-screen flex-col border-r border-[#d9e3dc] bg-[#17372e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <Link href="/teacher/dashboard" className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-xl bg-[#c9ed99] text-[#17372e]">
          <GraduationCap aria-hidden="true" className="size-6" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-wide">Mầm Học</span>
          <span className="mt-0.5 block text-xs text-white/55">Không gian giảng dạy</span>
        </span>
      </Link>

      <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        Khu vực giảng viên
      </div>

      <nav aria-label="Điều hướng chính" className="mt-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? 'bg-white/12 text-white ring-1 ring-white/10'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-4 ${item.active ? 'text-[#c9ed99]' : ''}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]">
            {initials || 'GV'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{teacherName}</span>
            <span className="block text-xs text-white/55">Giảng viên</span>
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
