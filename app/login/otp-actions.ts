'use server';

import { getDataSource } from '@/lib/db/data-source';
import { ProfileSchema, UserSchema } from '@/lib/db/entities';
import { hashPassword } from '@/lib/auth/password';
import { createAndSendOtp, verifyOtp } from '@/lib/email/otp-service';

export type OtpActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  step?: 'request' | 'verify';
};

/**
 * Yêu cầu gửi mã OTP đặt lại mật khẩu về email
 */
export async function sendPasswordResetOtpAction(
  email: string,
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' };
  }

  const ds = await getDataSource();
  const user = await ds.getRepository(UserSchema).findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      success: true,
      message: 'Nếu email này đã đăng ký trên hệ thống, mã xác thực 6 chữ số sẽ được gửi tới hộp thư của bạn trong ít phút.',
    };
  }

  const profile = await ds.getRepository(ProfileSchema).findOne({
    where: { id: user.id },
  });

  return createAndSendOtp({
    email: normalizedEmail,
    purpose: 'reset_password',
    userName: profile?.full_name || undefined,
    metadata: { userId: user.id },
  });
}

/**
 * Xác thực mã OTP và đặt lại mật khẩu mới trên SQL Server
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

  const verifyResult = await verifyOtp({
    email: normalizedEmail,
    otp,
    purpose: 'reset_password',
  });

  if (!verifyResult.valid) {
    return { success: false, message: verifyResult.message || 'Mã xác thực không hợp lệ.' };
  }

  const ds = await getDataSource();
  const userRepo = ds.getRepository(UserSchema);

  let userId = (verifyResult.metadata?.userId as string) || '';
  if (!userId) {
    const found = await userRepo.findOne({ where: { email: normalizedEmail } });
    userId = found?.id ?? '';
  }

  if (!userId) {
    return { success: false, message: 'Không tìm thấy tài khoản người dùng tương ứng.' };
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    await userRepo.update({ id: userId }, { password_hash: passwordHash });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
    };
  } catch (err) {
    console.error('Lỗi khi cập nhật mật khẩu trên SQL Server:', err);
    return {
      success: false,
      message: 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.',
    };
  }
}
