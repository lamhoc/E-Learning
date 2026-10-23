'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function verifyAdminCaller() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Vui lòng đăng nhập lại.', adminUser: null };
  }

  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isDbAdmin = !roleError && roleRecord?.role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    return { error: 'Chỉ quản trị viên mới có quyền thao tác.', adminUser: null };
  }

  return { error: null, adminUser: user };
}

/**
 * Khóa hoặc Mở khóa tài khoản sinh viên
 * @param userId ID tài khoản sinh viên
 * @param isBlocked true = Khóa tài khoản, false = Mở khóa
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
    const adminClient = createAdminClient();

    // 1. Kiểm tra an toàn: Không cho phép khóa tài khoản admin
    const { data: targetRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (targetRole?.role === 'admin') {
      return { success: false, error: 'Không thể khóa tài khoản quản trị viên.' };
    }

    // 2. Cập nhật Auth User với Service Role:
    // - ban_duration: '876000h' (khoảng 100 năm) chặn hoàn toàn đăng nhập và refresh token
    // - ban_duration: 'none' gỡ bỏ lệnh cấm đăng nhập
    // - Đồng thời ghi nhận cờ is_blocked vào cả app_metadata và user_metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: isBlocked ? '876000h' : 'none',
      app_metadata: { is_blocked: isBlocked },
      user_metadata: { is_blocked: isBlocked },
    });

    if (updateError) {
      console.error('Lỗi cập nhật trạng thái Auth của sinh viên:', updateError);
      return {
        success: false,
        error: updateError.message || 'Không thể cập nhật trạng thái tài khoản Auth.',
      };
    }

    // 3. Nếu mở khóa, gửi thông báo khôi phục cho sinh viên
    if (!isBlocked) {
      await adminClient.from('notifications').insert({
        user_id: userId,
        title: 'Tài khoản đã được mở khóa',
        message: 'Tài khoản học tập của bạn đã được quản trị viên khôi phục quyền truy cập.',
      });
    }

    revalidatePath('/admin/student-management');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi thay đổi trạng thái sinh viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi xử lý yêu cầu.' };
  }
}
