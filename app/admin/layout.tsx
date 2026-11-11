import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { BrandLogo } from '@/components/ui/brand-logo';
import { AdminNav } from '@/components/admin/admin-nav';

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

          {/* Admin Navigation Hub (Client Component hỗ trợ Active State & Đăng xuất chuẩn) */}
          <AdminNav />
        </div>
      </header>

      <main className="flex-1 bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors">
        {children}
      </main>
    </div>
  );
}
