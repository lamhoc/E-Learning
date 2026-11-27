import 'server-only';

import { createHash, randomInt } from 'node:crypto';
import { IsNull } from 'typeorm';
import { getDataSource } from '@/lib/db/data-source';
import { AuthOtpSchema } from '@/lib/db/entities';
import { sendOtpEmail } from './resend';

export type OtpPurpose = 'reset_password' | 'register_verify' | 'login_2fa';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp.trim()).digest('hex');
}

/**
 * Sinh mã OTP 6 số ngẫu nhiên, lưu vào bảng `auth_otps` trên SQL Server và gửi email
 */
export async function createAndSendOtp({
  email,
  purpose,
  metadata = {},
  userName,
  ttlMinutes = 5,
}: {
  email: string;
  purpose: OtpPurpose;
  metadata?: Record<string, unknown>;
  userName?: string;
  ttlMinutes?: number;
}): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const otpCode = randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  try {
    const ds = await getDataSource();
    const otpRepo = ds.getRepository(AuthOtpSchema);

    // Vô hiệu hóa các mã OTP cũ chưa sử dụng của email & purpose này
    await otpRepo.update(
      { email: normalizedEmail, purpose, consumed_at: IsNull() },
      { consumed_at: new Date().toISOString() },
    );

    // Ghi mã OTP mới vào SQL Server
    await otpRepo.save(
      otpRepo.create({
        email: normalizedEmail,
        otp_hash: otpHash,
        purpose,
        metadata,
        attempts: 0,
        max_attempts: 5,
        expires_at: expiresAt,
        consumed_at: null,
      }),
    );
  } catch (err) {
    console.error('Lỗi khi lưu mã OTP vào auth_otps:', err);
    return {
      success: false,
      message: 'Không thể khởi tạo mã xác thực. Vui lòng thử lại sau ít phút.',
    };
  }

  const emailResult = await sendOtpEmail({
    to: normalizedEmail,
    otp: otpCode,
    purpose,
    userName,
  });

  if (!emailResult.success) {
    return {
      success: false,
      message: emailResult.error || 'Không thể gửi email chứa mã OTP. Kiểm tra lại địa chỉ email.',
    };
  }

  return {
    success: true,
    message: `Mã xác thực 6 chữ số đã được gửi tới ${normalizedEmail}. Mã có hiệu lực trong 5 phút.`,
  };
}

/**
 * Xác minh mã OTP 6 chữ số được gửi từ client
 */
export async function verifyOtp({
  email,
  otp,
  purpose,
}: {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}): Promise<{
  valid: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanedOtp)) {
    return { valid: false, message: 'Mã xác thực phải bao gồm đúng 6 chữ số.' };
  }

  const ds = await getDataSource();
  const otpRepo = ds.getRepository(AuthOtpSchema);

  const record = await otpRepo.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      consumed_at: IsNull(),
    },
    order: { created_at: 'DESC' },
  });

  if (!record) {
    return {
      valid: false,
      message: 'Mã xác thực không tồn tại hoặc đã hết hạn. Hãy yêu cầu mã mới.',
    };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      message: 'Mã xác thực đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.',
    };
  }

  if (record.attempts >= record.max_attempts) {
    return {
      valid: false,
      message: 'Bạn đã nhập sai mã quá số lần cho phép (5 lần). Mã này đã bị khóa vì lý do an toàn.',
    };
  }

  const inputHash = hashOtp(cleanedOtp);
  if (inputHash !== record.otp_hash) {
    await otpRepo.update({ id: record.id }, { attempts: record.attempts + 1 });
    const remaining = record.max_attempts - (record.attempts + 1);
    return {
      valid: false,
      message: `Mã OTP không chính xác. Bạn còn ${Math.max(0, remaining)} lần thử.`,
    };
  }

  await otpRepo.update({ id: record.id }, { consumed_at: new Date().toISOString() });

  return {
    valid: true,
    metadata: record.metadata || {},
  };
}
