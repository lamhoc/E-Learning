import 'server-only';

import { createHash, randomInt } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOtpEmail } from './resend';

export type OtpPurpose = 'reset_password' | 'register_verify' | 'login_2fa';

/**
 * Băm mã OTP bằng SHA-256 trước khi lưu vào CSDL
 */
function hashOtp(otp: string): string {
  return createHash('sha256').update(otp.trim()).digest('hex');
}

/**
 * Sinh mã OTP 6 số ngẫu nhiên, lưu vào bảng `auth_otps` và gửi email qua Resend
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

  // 1. Sinh mã OTP 6 chữ số ngẫu nhiên (100000 - 999999)
  const otpCode = randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const adminClient = createAdminClient();

  // 2. Vô hiệu hóa các mã OTP cũ chưa sử dụng của email & purpose này
  await adminClient
    .from('auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  // 3. Ghi mã OTP mới vào CSDL
  const { error: insertError } = await adminClient.from('auth_otps').insert({
    email: normalizedEmail,
    otp_hash: otpHash,
    purpose,
    metadata,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Lỗi khi lưu mã OTP vào auth_otps:', insertError);
    return {
      success: false,
      message: 'Không thể khởi tạo mã xác thực. Vui lòng thử lại sau ít phút.',
    };
  }

  // 4. Gửi email qua dịch vụ Resend
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

  const adminClient = createAdminClient();

  // 1. Tìm bản ghi OTP mới nhất còn hiệu lực
  const { data: record, error } = await adminClient
    .from('auth_otps')
    .select('id, otp_hash, attempts, max_attempts, expires_at, consumed_at, metadata')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !record) {
    return {
      valid: false,
      message: 'Mã xác thực không tồn tại hoặc đã hết hạn. Hãy yêu cầu mã mới.',
    };
  }

  // 2. Kiểm tra hết hạn thời gian
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      message: 'Mã xác thực đã hết hạn (quá 5 phút). Vui lòng yêu cầu mã mới.',
    };
  }

  // 3. Kiểm tra số lần nhập sai tối đa (chống tấn công brute force)
  if (record.attempts >= record.max_attempts) {
    return {
      valid: false,
      message: 'Bạn đã nhập sai mã quá số lần cho phép (5 lần). Mã này đã bị khóa vì lý do an toàn.',
    };
  }

  // 4. So sánh mã hash
  const inputHash = hashOtp(cleanedOtp);
  if (inputHash !== record.otp_hash) {
    // Tăng số lần nhập sai
    await adminClient
      .from('auth_otps')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    const remaining = record.max_attempts - (record.attempts + 1);
    return {
      valid: false,
      message: `Mã OTP không chính xác. Bạn còn ${Math.max(0, remaining)} lần thử.`,
    };
  }

  // 5. Khớp thành công: Đánh dấu đã sử dụng để chống dùng lại (Replay attack)
  await adminClient
    .from('auth_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', record.id);

  return {
    valid: true,
    metadata: (record.metadata as Record<string, unknown>) || {},
  };
}
