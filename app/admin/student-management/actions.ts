'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import { NotificationSchema, UserRoleSchema, UserSchema } from '@/lib/db/entities';

async function verifyAdminCaller() {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    return { error: 'Vui lòng đăng nhập lại.', adminUser: null };
  }

  if (role !== 'admin' && user.app_metadata?.role !== 'admin') {
    return { error: 'Chỉ quản trị viên mới có quyền thao tác.', adminUser: null };
  }

  return { error: null, adminUser: user };
}

/**
 * Khóa hoặc Mở khóa tài khoản sinh viên trên SQL Server
 */
export async function toggleStudentStatus(
  userId: string,
  isBlocked: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { success: false, error: 'User ID không hợp lệ.' };
  }

  const { error: authError, adminUser } = await verifyAdminCaller();
  if (authError || !adminUser) {
    return { success: false, error: authError || 'Không có quyền quản trị.' };
  }

  try {
    const ds = await getDataSource();
    const targetRole = await ds.getRepository(UserRoleSchema).findOne({
      where: { user_id: userId },
    });

    if (targetRole?.role === 'admin') {
      return { success: false, error: 'Không thể khóa tài khoản quản trị viên.' };
    }

    const bannedUntil = isBlocked
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await ds.getRepository(UserSchema).update(
      { id: userId },
      {
        is_blocked: isBlocked,
        banned_until: bannedUntil,
      },
    );

    if (!isBlocked) {
      const notifRepo = ds.getRepository(NotificationSchema);
      await notifRepo.save(
        notifRepo.create({
          user_id: userId,
          title: 'Tài khoản đã được mở khóa',
          message: 'Tài khoản học tập của bạn đã được quản trị viên khôi phục quyền truy cập.',
          data: {},
        }),
      );
    }

    revalidatePath('/admin/student-management');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi thay đổi trạng thái sinh viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi xử lý yêu cầu.' };
  }
}
