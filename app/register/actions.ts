'use server';

import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAndSendOtp, verifyOtp } from '@/lib/email/otp-service';
import { isResendConfigured } from '@/lib/email/resend';

export type RegistrationState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  redirectTo?: string;
  claimHref?: string;
};

function getFormValues(formData: FormData) {
  return {
    fullName: String(formData.get('fullName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

function validateForm(fullName: string, email: string, password: string) {
  if (fullName.length < 2 || fullName.length > 120) return 'Họ tên cần từ 2 đến 120 ký tự.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email chưa đúng định dạng.';
  if (password.length < 12 || password.length > 128) return 'Mật khẩu cần từ 12 đến 128 ký tự.';
  return null;
}

/**
 * Yêu cầu gửi mã OTP xác thực email khi Đăng ký tài khoản
 */
export async function requestRegistrationOtpAction(
  formData: FormData,
  role: 'student' | 'teacher',
): Promise<{
  success: boolean;
  message: string;
  email?: string;
  bypass?: boolean;
  redirectTo?: string;
}> {
  const { fullName, email, password } = getFormValues(formData);
  const validationError = validateForm(fullName, email, password);
  if (validationError) return { success: false, message: validationError };

  const invitationToken = String(formData.get('invitationToken') ?? '').trim();
  const adminClient = createAdminClient();

  // Kiểm tra email đã tồn tại hay chưa
  try {
    const { data: usersList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
    const existingUser = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existingUser) {
      return {
        success: false,
        message: 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng tính năng Quên mật khẩu.',
      };
    }
  } catch {
    // Tiếp tục nếu không kiểm tra được danh sách
  }

  // Nếu Resend chưa được cấu hình, đăng ký trực tiếp (chế độ dự phòng dev)
  if (!isResendConfigured()) {
    const signupData: Record<string, string> = { full_name: fullName };
    if (role === 'teacher') {
      if (invitationToken) {
        signupData.teacher_invitation_hash = createHash('sha256')
          .update(invitationToken)
          .digest('hex');
      } else {
        signupData.requested_role = 'teacher';
      }
    }

    const { error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: signupData,
    });

    if (error) {
      return {
        success: false,
        message: 'Không thể tạo tài khoản: ' + error.message,
      };
    }

    return {
      success: true,
      bypass: true,
      message: 'Đăng ký thành công! Đang chuyển hướng...',
      redirectTo: `/login?registered=${role}`,
    };
  }

  // Gửi mã OTP xác thực email qua Resend
  const otpResult = await createAndSendOtp({
    email,
    purpose: 'register_verify',
    userName: fullName,
    metadata: {
      fullName,
      password,
      role,
      invitationToken,
    },
  });

  if (!otpResult.success) {
    return { success: false, message: otpResult.message };
  }

  return {
    success: true,
    email,
    message: otpResult.message,
  };
}

/**
 * Xác thực mã OTP 6 số và chính thức tạo tài khoản người dùng
 */
export async function completeRegistrationWithOtpAction(
  email: string,
  otp: string,
): Promise<{ success: boolean; message: string; redirectTo?: string }> {
  const verifyResult = await verifyOtp({
    email,
    otp,
    purpose: 'register_verify',
  });

  if (!verifyResult.valid) {
    return { success: false, message: verifyResult.message || 'Mã xác thực OTP không hợp lệ.' };
  }

  const metadata = (verifyResult.metadata as {
    fullName?: string;
    password?: string;
    role?: 'student' | 'teacher';
    invitationToken?: string;
  }) || {};

  const fullName = metadata.fullName || '';
  const password = metadata.password || '';
  const role = metadata.role || 'student';
  const invitationToken = metadata.invitationToken || '';

  const adminClient = createAdminClient();
  const signupData: Record<string, string> = { full_name: fullName };

  if (role === 'teacher') {
    if (invitationToken) {
      signupData.teacher_invitation_hash = createHash('sha256')
        .update(invitationToken)
        .digest('hex');
    } else {
      signupData.requested_role = 'teacher';
    }
  }

  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: signupData,
  });

  if (error) {
    console.error('Lỗi tạo tài khoản sau xác thực OTP:', error);
    return {
      success: false,
      message: 'Không thể kích hoạt tài khoản: ' + error.message,
    };
  }

  return {
    success: true,
    message: 'Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.',
    redirectTo: `/login?registered=${role}`,
  };
}

// Giữ lại các hàm cũ để duy trì tương thích ngược
export async function registerStudent(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const res = await requestRegistrationOtpAction(formData, 'student');
  if (!res.success) return { status: 'error', message: res.message };
  if (res.redirectTo) return { status: 'success', message: res.message, redirectTo: res.redirectTo };
  return { status: 'success', message: res.message };
}

export async function registerTeacher(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const res = await requestRegistrationOtpAction(formData, 'teacher');
  if (!res.success) return { status: 'error', message: res.message };
  if (res.redirectTo) return { status: 'success', message: res.message, redirectTo: res.redirectTo };
  return { status: 'success', message: res.message };
}

export type ClaimInvitationResult = {
  success: boolean;
  message: string;
};

export async function claimTeacherInvitation(token: string): Promise<ClaimInvitationResult> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return { success: false, message: 'Link mời không hợp lệ.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: 'Hãy đăng nhập bằng đúng email nhận mã mời trước.' };
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { error } = await supabase.rpc('claim_teacher_invitation', {
    p_token_hash: tokenHash,
  });

  if (error) {
    return {
      success: false,
      message: 'Không thể nhận mã mời. Hãy kiểm tra email đăng nhập, hạn dùng và trạng thái của link.',
    };
  }

  return { success: true, message: 'Đã xác nhận mã mời giảng viên.' };
}
