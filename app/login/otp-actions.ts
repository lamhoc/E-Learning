'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createAndSendOtp, verifyOtp } from '@/lib/email/otp-service';

export type OtpActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  step?: 'request' | 'verify';
};

/**
 * Yêu cầu gửi mã OTP đặt lại mật khẩu về email qua Resend
 */
export async function sendPasswordResetOtpAction(
  email: string,
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' };
  }

  const adminClient = createAdminClient();

  // Kiểm tra tài khoản có tồn tại trong hệ thống hay không
  const userId = await findUserIdByEmail(adminClient, normalizedEmail);

  if (!userId) {
    // Để bảo mật, vẫn trả về thông điệp tích cực tránh dò quét tài khoản (Enumeration attack)
    return {
      success: true,
      message: 'Nếu email này đã đăng ký trên hệ thống, mã xác thực 6 chữ số sẽ được gửi tới hộp thư của bạn trong ít phút.',
    };
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  const result = await createAndSendOtp({
    email: normalizedEmail,
    purpose: 'reset_password',
    userName: profile?.full_name || undefined,
    metadata: { userId },
  });

  return result;
}

/**
 * Xác thực mã OTP và đặt lại mật khẩu mới
 */
export async function verifyOtpAndResetPasswordAction(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (newPassword.length < 12 || newPassword.length > 128) {
    return { success: false, message: 'Mật khẩu mới phải có độ dài từ 12 đến 128 ký tự.' };
  }

  // Xác minh mã OTP 6 số
  const verifyResult = await verifyOtp({
    email: normalizedEmail,
    otp,
    purpose: 'reset_password',
  });

  if (!verifyResult.valid) {
    return { success: false, message: verifyResult.message || 'Mã xác thực không hợp lệ.' };
  }

  const adminClient = createAdminClient();
  const userId =
    (verifyResult.metadata?.userId as string) ||
    (await findUserIdByEmail(adminClient, normalizedEmail));

  if (!userId) {
    return { success: false, message: 'Không tìm thấy tài khoản người dùng tương ứng.' };
  }

  // Cập nhật mật khẩu mới thông qua Supabase Admin API
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    console.error('Lỗi khi cập nhật mật khẩu qua Supabase Admin:', updateError);
    return {
      success: false,
      message: 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.',
    };
  }

  return {
    success: true,
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
  };
}

/**
 * Tìm ID người dùng thông qua email trong auth.users
 */
async function findUserIdByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  try {
    let page = 1;
    while (page <= 5) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !data.users || data.users.length === 0) break;
      const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) return match.id;
      if (data.users.length < 100) break;
      page++;
    }
    return null;
  } catch {
    return null;
  }
}
