'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { revalidateSubjectsCache } from '@/lib/data-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  InvitationTokenSchema,
  NotificationSchema,
  ProfileSchema,
  SubjectSchema,
  TeacherApplicationSchema,
  TeacherSubjectAssignmentSchema,
  UserRoleSchema,
  UserSchema,
} from '@/lib/db/entities';
import {
  sendTeacherApplicationReviewEmail,
  sendTeacherInvitationEmail,
} from '@/lib/email/resend';

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

async function verifyAdminCaller() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) return { error: 'Vui lòng đăng nhập lại.', user: null };

  if (role !== 'admin' && user.app_metadata?.role !== 'admin') {
    return { error: 'Chỉ admin mới được quản lý quyền giảng viên.', user: null };
  }

  return { error: null, user };
}

export async function approveTeacher(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { success: false, error: 'User ID không hợp lệ.' };
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const ds = await getDataSource();
    const nowIso = new Date().toISOString();

    await ds.transaction(async (manager) => {
      const roleRepo = manager.getRepository(UserRoleSchema);
      const profileRepo = manager.getRepository(ProfileSchema);
      const appRepo = manager.getRepository(TeacherApplicationSchema);
      const notifRepo = manager.getRepository(NotificationSchema);

      const existingRole = await roleRepo.findOne({ where: { user_id: userId } });
      if (existingRole) {
        await roleRepo.update({ user_id: userId }, { role: 'teacher' });
      } else {
        await roleRepo.save(roleRepo.create({ user_id: userId, role: 'teacher' }));
      }

      await profileRepo.update({ id: userId }, { student_code: null });

      await appRepo.update(
        { user_id: userId },
        {
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: nowIso,
          review_note: 'Phê duyệt bởi Quản trị viên',
        },
      );

      await notifRepo.save(
        notifRepo.create({
          user_id: userId,
          title: 'Tài khoản Giáo viên đã được phê duyệt',
          message:
            'Hồ sơ xin cấp quyền giáo viên của bạn đã được phê duyệt thành công. Bạn đã có quyền tạo đề thi, quản lý lớp và chấm bài.',
          data: {},
        }),
      );
    });

    try {
      const [userRow, profileRow] = await Promise.all([
        ds.getRepository(UserSchema).findOne({ where: { id: userId } }),
        ds.getRepository(ProfileSchema).findOne({ where: { id: userId } }),
      ]);
      const teacherEmail = userRow?.email;
      const teacherName = profileRow?.full_name || teacherEmail?.split('@')[0] || 'Quý Thầy/Cô';
      if (teacherEmail) {
        await sendTeacherApplicationReviewEmail({
          to: teacherEmail,
          teacherName,
          approved: true,
        });
      }
    } catch (emailErr) {
      console.warn('Lỗi gửi email thông báo phê duyệt:', emailErr);
    }

    await revalidateSubjectsCache(userId);
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi phê duyệt giáo viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi duyệt giáo viên.' };
  }
}

export async function rejectTeacher(userId: string, note?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { success: false, error: 'User ID không hợp lệ.' };
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const ds = await getDataSource();
    await ds.getRepository(TeacherApplicationSchema).update(
      { user_id: userId },
      {
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: note?.trim().slice(0, 500) || 'Từ chối bởi Quản trị viên',
      },
    );

    const notifRepo = ds.getRepository(NotificationSchema);
    await notifRepo.save(
      notifRepo.create({
        user_id: userId,
        title: 'Hồ sơ Giáo viên không được chấp thuận',
        message: note?.trim()
          ? `Đơn xin cấp quyền giáo viên của bạn không được phê duyệt: ${note.trim()}`
          : 'Đơn xin cấp quyền giáo viên của bạn chưa được phê duyệt. Vui lòng liên hệ ban quản trị để biết thêm chi tiết.',
        data: {},
      }),
    );

    try {
      const [userRow, profileRow] = await Promise.all([
        ds.getRepository(UserSchema).findOne({ where: { id: userId } }),
        ds.getRepository(ProfileSchema).findOne({ where: { id: userId } }),
      ]);
      const teacherEmail = userRow?.email;
      const teacherName = profileRow?.full_name || teacherEmail?.split('@')[0] || 'Quý Thầy/Cô';
      if (teacherEmail) {
        await sendTeacherApplicationReviewEmail({
          to: teacherEmail,
          teacherName,
          approved: false,
          note: note?.trim(),
        });
      }
    } catch (emailErr) {
      console.warn('Lỗi gửi email thông báo từ chối:', emailErr);
    }

    revalidatePath('/admin/teacher-access');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi từ chối giáo viên:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi từ chối hồ sơ.' };
  }
}

export async function assignSubject(teacherId: string, subjectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Không có quyền admin.' };
  }

  try {
    const ds = await getDataSource();
    const roleData = await ds.getRepository(UserRoleSchema).findOne({
      where: { user_id: teacherId },
    });

    if (roleData?.role !== 'teacher') {
      return { success: false, error: 'Tài khoản chưa được cấp quyền giáo viên.' };
    }

    const tsaRepo = ds.getRepository(TeacherSubjectAssignmentSchema);
    const existing = await tsaRepo.findOne({
      where: { teacher_id: teacherId, subject_id: subjectId },
    });

    if (!existing) {
      await tsaRepo.save(
        tsaRepo.create({
          teacher_id: teacherId,
          subject_id: subjectId,
          assigned_by: user.id,
        }),
      );
    }

    await revalidateSubjectsCache(teacherId);
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi phân công môn học:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi phân công môn.' };
  }
}

export async function unassignSubject(teacherId: string, subjectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  const { error: adminError } = await verifyAdminCaller();
  if (adminError) return { success: false, error: adminError };

  try {
    const ds = await getDataSource();
    await ds
      .getRepository(TeacherSubjectAssignmentSchema)
      .delete({ teacher_id: teacherId, subject_id: subjectId });

    await revalidateSubjectsCache(teacherId);
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');
    return { success: true };
  } catch (err) {
    console.error('Lỗi khi gỡ phân công môn học:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi gỡ phân công môn.' };
  }
}

export async function createSubject(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!/^[A-Z0-9_-]{2,24}$/.test(code) || name.length < 2 || name.length > 120 || description.length > 1000) {
    redirect('/admin/teacher-access?error=subject-invalid');
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) redirect('/admin/teacher-access?error=unauthorized');

  try {
    const ds = await getDataSource();
    const subjectRepo = ds.getRepository(SubjectSchema);
    const existing = await subjectRepo.findOne({ where: { code } });
    if (existing) {
      redirect('/admin/teacher-access?error=subject-duplicate');
    }
    await subjectRepo.save(
      subjectRepo.create({
        code,
        name,
        description: description || null,
        created_by: user.id,
        archived_at: null,
      }),
    );
  } catch (err) {
    console.error('Could not create subject:', err);
    redirect('/admin/teacher-access?error=subject-create');
  }

  await revalidateSubjectsCache();
  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=subject-created');
}

export async function assignTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  const result = await assignSubject(teacherId, subjectId);
  if (!result.success) redirect('/admin/teacher-access?error=assignment-save');
  redirect('/admin/teacher-access?success=assignment-saved');
}

export async function removeTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  const result = await unassignSubject(teacherId, subjectId);
  if (!result.success) redirect('/admin/teacher-access?error=assignment-remove');
  redirect('/admin/teacher-access?success=assignment-removed');
}

export async function updateClassTeacher(
  classId: string,
  teacherId: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(classId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    return { success: false, error: 'Thông tin lớp học hoặc giảng viên không hợp lệ.' };
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) {
    return { success: false, error: adminError || 'Bạn không có quyền thực hiện thao tác này.' };
  }

  try {
    const ds = await getDataSource();
    const classRecord = await ds.getRepository(ClassSchema).findOne({
      where: { id: classId },
    });

    if (!classRecord) {
      return { success: false, error: 'Lớp học không tồn tại trong hệ thống.' };
    }

    const assignment = await ds.getRepository(TeacherSubjectAssignmentSchema).findOne({
      where: { teacher_id: teacherId, subject_id: classRecord.subject_id },
    });

    if (!assignment) {
      return {
        success: false,
        error: 'Giảng viên này chưa được phân công môn học tương ứng của lớp. Vui lòng gán môn trước.',
      };
    }

    await ds.getRepository(ClassSchema).update(
      { id: classId },
      { teacher_id: teacherId, updated_at: new Date().toISOString() },
    );

    const subject = await ds.getRepository(SubjectSchema).findOne({
      where: { id: classRecord.subject_id },
      select: { name: true },
    });
    const className = classRecord.name || classRecord.class_code;

    try {
      const notifRepo = ds.getRepository(NotificationSchema);
      await notifRepo.save(
        notifRepo.create({
          user_id: teacherId,
          title: 'Phân công phụ trách lớp học',
          message: `Bạn đã được phân công phụ trách lớp ${className}${subject?.name ? ` (${subject.name})` : ''}.`,
          data: {},
        }),
      );
    } catch (notifErr) {
      console.warn('Lỗi khi ghi thông báo cho giảng viên:', notifErr);
    }

    await revalidateSubjectsCache(teacherId);
    if (classRecord.teacher_id && classRecord.teacher_id !== teacherId) {
      await revalidateSubjectsCache(classRecord.teacher_id);
    }
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/materials');
    revalidatePath('/teacher/assignments');
    revalidatePath('/subjects');

    return {
      success: true,
      message: `Đã cập nhật giảng viên phụ trách lớp ${className} thành công!`,
    };
  } catch (err) {
    console.error('Lỗi hệ thống khi cập nhật giảng viên phụ trách lớp:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống khi cập nhật lớp học.' };
  }
}

export async function assignClassTeacher(formData: FormData) {
  const classId = String(formData.get('classId') ?? '');
  const teacherId = String(formData.get('teacherId') ?? '');
  const result = await updateClassTeacher(classId, teacherId);
  if (!result.success) {
    redirect(`/admin/teacher-access?error=${encodeURIComponent(result.error || 'class-assignment-failed')}`);
  }
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
      message: 'Chưa cấu hình domain production hợp lệ. Đặt SITE_URL rồi thử lại.',
    };
  }

  const { error: adminError, user } = await verifyAdminCaller();
  if (adminError || !user) {
    return { status: 'error', message: adminError ?? 'Không thể xác thực quyền admin.' };
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(InvitationTokenSchema);
    await repo.save(
      repo.create({
        email,
        token_hash: tokenHash,
        created_by: user.id,
        expires_at: expiresAt,
        used_at: null,
        used_by: null,
      }),
    );
  } catch (err) {
    console.error('Could not create teacher invitation:', err);
    return { status: 'error', message: 'Không thể tạo mã mời. Kiểm tra kết nối SQL Server.' };
  }

  const invitationUrl = new URL('/register/teacher', siteUrl);
  invitationUrl.searchParams.set('email', email);
  invitationUrl.searchParams.set('invite', token);

  let emailSent = false;
  try {
    const emailResult = await sendTeacherInvitationEmail({
      to: email,
      invitationUrl: invitationUrl.toString(),
    });
    emailSent = emailResult.success;
  } catch (emailErr) {
    console.warn('Lỗi khi gửi email mời giáo viên:', emailErr);
  }

  revalidatePath('/admin/teacher-access');

  return {
    status: 'success',
    message: emailSent
      ? 'Đã tạo link mời và tự động gửi thư kích hoạt tài khoản tới email của giảng viên!'
      : 'Link mời có hiệu lực 24 giờ và chỉ dùng được một lần. Hãy sao chép ngay; token thô sẽ không được lưu lại.',
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
    if (!result.success) redirect('/admin/teacher-access?error=review');
  } else {
    const result = await rejectTeacher(userId, note);
    if (!result.success) redirect('/admin/teacher-access?error=review');
  }

  redirect(`/admin/teacher-access?success=${approve ? 'approved' : 'rejected'}`);
}
