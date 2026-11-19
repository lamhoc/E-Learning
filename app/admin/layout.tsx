import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { AdminShell } from '@/components/admin/admin-shell';

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
    <AdminShell adminEmail={user.email || 'admin@lhu.edu.vn'}>
      {children}
    </AdminShell>
  );
}
