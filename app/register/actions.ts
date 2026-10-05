'use server';

import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type RegistrationState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  redirectTo?: string;
  claimHref?: string;
};

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getAuthRedirect(nextPath: string) {
  const url = new URL('/auth/callback', getSiteUrl());
  url.searchParams.set('next', nextPath);
  return url.toString();
}

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

export async function registerStudent(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const { fullName, email, password } = getFormValues(formData);
  const validationError = validateForm(fullName, email, password);
  if (validationError) return { status: 'error', message: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: getAuthRedirect('/login?registered=student'),
    },
  });

  if (error) {
    return { status: 'error', message: 'Không thể tạo tài khoản. Hãy kiểm tra email hoặc thử lại sau.' };
  }

  await supabase.auth.signOut();
  return {
    status: 'success',
    message: 'Tài khoản đã được tạo. Đăng nhập để tiếp tục.',
    redirectTo: '/login?registered=student',
  };
}

export async function registerTeacher(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const { fullName, email, password } = getFormValues(formData);
  const validationError = validateForm(fullName, email, password);
  if (validationError) return { status: 'error', message: validationError };

  const invitationToken = String(formData.get('invitationToken') ?? '').trim();
  const signupData: Record<string, string> = { full_name: fullName };

  if (invitationToken) {
    signupData.teacher_invitation_hash = createHash('sha256').update(invitationToken).digest('hex');
  } else {
    signupData.requested_role = 'teacher';
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: signupData,
  });

  const claimHref = invitationToken
    ? `/login?claimInvite=${encodeURIComponent(invitationToken)}&claimEmail=${encodeURIComponent(email)}`
    : undefined;

  if (error) {
    console.error('Teacher Admin API createUser failed:', {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    const accountAlreadyExists =
      error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message);

    return {
      status: 'error',
      message: invitationToken
        ? accountAlreadyExists
          ? 'Email này đã có tài khoản. Hãy đăng nhập bằng email đó để nhận lời mời.'
          : 'Không thể tạo tài khoản. Mã mời có thể sai/hết hạn hoặc migration trên Supabase chưa được cập nhật.'
        : 'Không thể tạo yêu cầu giảng viên. Hãy kiểm tra email hoặc thử lại sau.',
      ...(claimHref ? { claimHref } : {}),
    };
  }

  return {
    status: 'success',
    message: invitationToken
      ? 'Tài khoản giảng viên đã được tạo, không cần xác nhận email. Đăng nhập để tiếp tục.'
      : 'Yêu cầu đã được gửi. Tài khoản sẽ chờ quản trị viên duyệt; không cần xác nhận email.',
    redirectTo: '/login?registered=teacher',
  };
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
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
