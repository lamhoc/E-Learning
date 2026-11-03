import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { signOut } from '@/app/subjects/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  // Bảo mật nghiêm ngặt: Kiểm tra user.app_metadata.role === 'admin'
  // Kết hợp kiểm tra dự phòng bảng user_roles để đồng bộ cơ sở dữ liệu
  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const isDbAdmin = role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    redirect('/subjects');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md dark:bg-[#111C2D]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          {/* Logo LHU & Brand Admin Link */}
          <BrandLogo
            href="/admin"
            size="md"
            variant="plain"
            badgeText="Admin"
            subtitle="Quản trị Hệ thống LHU"
          />

          {/* Admin Navigation Hub */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              prefetch={true}
              href="/admin"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <LayoutDashboard className="size-4 text-[#154C99] dark:text-[#3B82F6]" />
              <span className="hidden sm:inline">Tổng quan</span>
            </Link>
            <Link
              prefetch={true}
              href="/admin/teacher-access"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <GraduationCap className="size-4 text-[#154C99] dark:text-[#3B82F6]" />
              <span className="hidden md:inline">Giảng viên & Phân môn</span>
            </Link>
            <Link
              prefetch={true}
              href="/admin/student-management"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <Users className="size-4 text-[#154C99] dark:text-[#3B82F6]" />
              <span className="hidden md:inline">Tài khoản Sinh viên</span>
            </Link>
            <Link
              prefetch={true}
              href="/admin/subjects"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <BookOpen className="size-4 text-[#154C99] dark:text-[#3B82F6]" />
              <span className="hidden lg:inline">Môn học</span>
            </Link>

            {/* Nút chuyển đổi Sáng / Tối */}
            <ThemeToggle />

            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-red-700 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors">
        {children}
      </main>
    </div>
  );
}
