'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type InvitationState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  invitationUrl?: string;
};

function getInvitationSiteUrl() {
  const configuredUrl = process.env.SITE_URL?.trim();
  const candidateUrl =
    configuredUrl ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (!candidateUrl) return null;

  try {
    const url = new URL(candidateUrl);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || isLocalHost)) {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Vui lòng đăng nhập lại.', supabase: null, user: null };

  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isDbAdmin = !roleError && roleRecord?.role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    return { error: 'Chỉ admin mới được quản lý quyền giảng viên.', supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

/**
 * Phê duyệt đơn xin cấp quyền giáo viên
 * Sử dụng Supabase Admin Client để cập nhật app_metadata & user_metadata role = 'teacher'
 */
export async function approveTeacher(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { success: false, error: 'User ID không hợp lệ.' };
  }

  const { error: adminError, user } = await getAdminClient();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Cập nhật role trong Auth Metadata thông qua Supabase Service Role
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'teacher' },
      user_metadata: { role: 'teacher' },
    });

    if (authUpdateError) {
      console.error('Không thể cập nhật auth metadata giáo viên:', authUpdateError);
      return { success: false, error: 'Lỗi cập nhật metadata tài khoản Auth.' };
    }

    // 2. Đồng bộ bảng user_roles
    const { error: roleError } = await adminClient
      .from('user_roles')
      .upsert({ user_id: userId, role: 'teacher' }, { onConflict: 'user_id' });

    if (roleError) {
      console.error('Không thể cập nhật bảng user_roles:', roleError);
    }

    // 3. Cập nhật bảng teacher_applications
    const { error: appError } = await adminClient
      .from('teacher_applications')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: 'Phê duyệt bởi Quản trị viên',
      })
      .eq('user_id', userId);

    if (appError) {
      console.error('Không thể cập nhật teacher_applications:', appError);
    }

    // 4. Gửi thông báo đến giáo viên
    await adminClient.from('notifications').insert({
      user_id: userId,
      title: 'Tài khoản Giáo viên đã được phê duyệt',
      message: 'Hồ sơ xin cấp quyền giáo viên của bạn đã được phê duyệt thành công. Bạn đã có quyền tạo đề thi, quản lý lớp và chấm bài.',
    });

    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi phê duyệt giáo viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi duyệt giáo viên.' };
  }
}

/**
 * Từ chối đơn xin cấp quyền giáo viên
 */
export async function rejectTeacher(userId: string, note?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { success: false, error: 'User ID không hợp lệ.' };
  }

  const { error: adminError, user } = await getAdminClient();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const adminClient = createAdminClient();

    const { error: appError } = await adminClient
      .from('teacher_applications')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: note?.trim().slice(0, 500) || 'Từ chối bởi Quản trị viên',
      })
      .eq('user_id', userId);

    if (appError) {
      console.error('Không thể từ chối teacher_applications:', appError);
      return { success: false, error: 'Không thể cập nhật trạng thái đơn đăng ký.' };
    }

    await adminClient.from('notifications').insert({
      user_id: userId,
      title: 'Hồ sơ Giáo viên không được chấp thuận',
      message: note?.trim()
        ? `Đơn xin cấp quyền giáo viên của bạn không được phê duyệt: ${note.trim()}`
        : 'Đơn xin cấp quyền giáo viên của bạn chưa được phê duyệt. Vui lòng liên hệ ban quản trị để biết thêm chi tiết.',
    });

    revalidatePath('/admin/teacher-access');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi từ chối giáo viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi từ chối hồ sơ.' };
  }
}

/**
 * Phân công môn học cho giáo viên
 */
export async function assignSubject(teacherId: string, subjectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  const { error: adminError, user } = await getAdminClient();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const adminClient = createAdminClient();

    // Xác nhận giáo viên có role teacher
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', teacherId)
      .maybeSingle();

    if (roleData?.role !== 'teacher') {
      return { success: false, error: 'Tài khoản chưa được cấp quyền giáo viên.' };
    }

    const { error } = await adminClient.from('teacher_subject_assignments').upsert(
      {
        teacher_id: teacherId,
        subject_id: subjectId,
        assigned_by: user.id,
      },
      { onConflict: 'teacher_id,subject_id', ignoreDuplicates: true },
    );

    if (error) {
      console.error('Could not assign subject to teacher:', error);
      return { success: false, error: 'Không thể lưu phân công môn học.' };
    }

    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi phân công môn học:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi phân công môn.' };
  }
}

/**
 * Hủy phân công môn học của giáo viên
 */
export async function unassignSubject(teacherId: string, subjectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  const { error: adminError } = await getAdminClient();
  if (adminError) {
    return { success: false, error: adminError };
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('teacher_subject_assignments')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId);

    if (error) {
      console.error('Could not remove teacher subject assignment:', error);
      return { success: false, error: 'Không thể gỡ phân công môn học.' };
    }

    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi gỡ phân công môn học:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi gỡ phân công môn.' };
  }
}

/* ========================================================================= */
/* FOR COMPATIBILITY WITH EXISTING HTML FORMS / REDIRECTS                     */
/* ========================================================================= */

export async function createSubject(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!/^[A-Z0-9_-]{2,24}$/.test(code) || name.length < 2 || name.length > 120 || description.length > 1000) {
    redirect('/admin/teacher-access?error=subject-invalid');
  }

  const { error: adminError, supabase, user } = await getAdminClient();
  if (adminError || !supabase || !user) redirect('/admin/teacher-access?error=unauthorized');

  const { error } = await supabase.from('subjects').insert({
    code,
    name,
    description: description || null,
    created_by: user.id,
  });
  if (error) {
    console.error('Could not create subject:', error.code, error.message);
    redirect(`/admin/teacher-access?error=${error.code === '23505' ? 'subject-duplicate' : 'subject-create'}`);
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=subject-created');
}

export async function assignTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');

  const result = await assignSubject(teacherId, subjectId);
  if (!result.success) {
    redirect('/admin/teacher-access?error=assignment-save');
  }
  redirect('/admin/teacher-access?success=assignment-saved');
}

export async function removeTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');

  const result = await unassignSubject(teacherId, subjectId);
  if (!result.success) {
    redirect('/admin/teacher-access?error=assignment-remove');
  }
  redirect('/admin/teacher-access?success=assignment-removed');
}

export async function assignClassTeacher(formData: FormData) {
  const classId = String(formData.get('classId') ?? '');
  const teacherId = String(formData.get('teacherId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(classId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    redirect('/admin/teacher-access?error=class-assignment-invalid');
  }

  const { error: adminError, supabase } = await getAdminClient();
  if (adminError || !supabase) redirect('/admin/teacher-access?error=unauthorized');

  const { data: classRecord, error: classError } = await supabase
    .from('classes')
    .select('subject_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError || !classRecord) redirect('/admin/teacher-access?error=class-assignment-failed');

  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_subject_assignments')
    .select('teacher_id')
    .eq('teacher_id', teacherId)
    .eq('subject_id', classRecord.subject_id)
    .maybeSingle();
  if (assignmentError || !assignment) redirect('/admin/teacher-access?error=class-assignment-subject');

  const { error } = await supabase.from('classes').update({ teacher_id: teacherId }).eq('id', classId);
  if (error) {
    console.error('Could not assign class to teacher:', error.code, error.message);
    redirect('/admin/teacher-access?error=class-assignment-failed');
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=class-assigned');
}

export async function createTeacherInvitation(
  _previousState: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Nhập email giảng viên hợp lệ.' };
  }

  const siteUrl = getInvitationSiteUrl();
  if (!siteUrl) {
    return {
      status: 'error',
      message: 'Chưa cấu hình domain production hợp lệ. Đặt SITE_URL trên Vercel rồi thử lại.',
    };
  }

  const { error: adminError, supabase, user } = await getAdminClient();
  if (adminError || !supabase || !user) {
    return { status: 'error', message: adminError ?? 'Không thể xác thực quyền admin.' };
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('invitation_tokens').insert({
    email,
    token_hash: tokenHash,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Could not create teacher invitation:', error.message);
    return { status: 'error', message: 'Không thể tạo mã mời. Kiểm tra migration và quyền admin.' };
  }

  const invitationUrl = new URL('/register/teacher', siteUrl);
  invitationUrl.searchParams.set('email', email);
  invitationUrl.searchParams.set('invite', token);

  return {
    status: 'success',
    message: 'Link mời có hiệu lực 24 giờ và chỉ dùng được một lần. Hãy sao chép ngay; token thô sẽ không được lưu lại.',
    invitationUrl: invitationUrl.toString(),
  };
}

export async function reviewTeacherApplication(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const approve = decision === 'approve';
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);

  if (!/^[0-9a-f-]{36}$/i.test(userId) || !['approve', 'reject'].includes(decision)) {
    redirect('/admin/teacher-access?error=invalid');
  }

  if (approve) {
    const result = await approveTeacher(userId);
    if (!result.success) {
      redirect('/admin/teacher-access?error=review');
    }
  } else {
    const result = await rejectTeacher(userId, note);
    if (!result.success) {
      redirect('/admin/teacher-access?error=review');
    }
  }

  redirect(`/admin/teacher-access?success=${approve ? 'approved' : 'rejected'}`);
}
