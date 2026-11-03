'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { revalidateSubjectsCache } from '@/lib/data-cache';

export type SubjectActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

async function verifyAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) {
    return { error: 'Vui lòng đăng nhập lại.', user: null };
  }

  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const isDbAdmin = role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    return { error: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.', user: null };
  }

  return { error: null, user };
}

/**
 * Tạo môn học mới trong hệ thống
 */
export async function createSubjectAction(formData: FormData): Promise<SubjectActionResponse> {
  const { error: authError, user } = await verifyAdmin();
  if (authError || !user) {
    return { success: false, error: authError || 'Không có quyền truy cập.' };
  }

  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!code || !/^[A-Z0-9_-]{2,24}$/.test(code)) {
    return {
      success: false,
      error: 'Mã môn học không hợp lệ (từ 2-24 ký tự chữ in hoa, số hoặc gạch nối, ví dụ: INT101).',
    };
  }

  if (!name || name.length < 2 || name.length > 120) {
    return {
      success: false,
      error: 'Tên môn học phải từ 2 đến 120 ký tự.',
    };
  }

  try {
    const adminClient = createAdminClient();

    // Kiểm tra trùng mã môn
    const { data: existing } = await adminClient
      .from('subjects')
      .select('id, code')
      .ilike('code', code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Mã môn "${code}" đã tồn tại trong hệ thống.` };
    }

    const { error: insertError } = await adminClient.from('subjects').insert({
      code,
      name,
      description: description || null,
      created_by: user.id,
    });

    if (insertError) {
      console.error('Lỗi khi thêm môn học:', insertError);
      return { success: false, error: 'Không thể tạo môn học mới. Vui lòng thử lại.' };
    }

    await revalidateSubjectsCache();
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');

    return { success: true, message: `Đã tạo môn học "${name}" (${code}) thành công.` };
  } catch (err: unknown) {
    console.error('Lỗi createSubjectAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi không mong muốn khi tạo môn học.' };
  }
}

/**
 * Cập nhật thông tin môn học (Tên, mã môn, mô tả)
 */
export async function updateSubjectAction(formData: FormData): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  const subjectId = String(formData.get('id') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'ID môn học không hợp lệ.' };
  }

  if (!code || !/^[A-Z0-9_-]{2,24}$/.test(code)) {
    return {
      success: false,
      error: 'Mã môn học không hợp lệ (từ 2-24 ký tự in hoa, số hoặc gạch nối).',
    };
  }

  if (!name || name.length < 2 || name.length > 120) {
    return { success: false, error: 'Tên môn học phải từ 2 đến 120 ký tự.' };
  }

  try {
    const adminClient = createAdminClient();

    // Kiểm tra trùng mã môn với môn khác
    const { data: existing } = await adminClient
      .from('subjects')
      .select('id')
      .ilike('code', code)
      .neq('id', subjectId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Mã môn "${code}" đã được sử dụng bởi một môn học khác.` };
    }

    const { error: updateError } = await adminClient
      .from('subjects')
      .update({
        code,
        name,
        description: description || null,
      })
      .eq('id', subjectId);

    if (updateError) {
      console.error('Lỗi khi cập nhật môn học:', updateError);
      return { success: false, error: 'Không thể cập nhật môn học.' };
    }

    await revalidateSubjectsCache();
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');

    return { success: true, message: `Đã cập nhật môn học "${name}" thành công.` };
  } catch (err: unknown) {
    console.error('Lỗi updateSubjectAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi cập nhật môn học.' };
  }
}

/**
 * Chuyển đổi trạng thái Lưu trữ (Archive) hoặc Kích hoạt lại môn học
 */
export async function toggleArchiveSubjectAction(
  subjectId: string,
  shouldArchive: boolean
): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'ID môn học không hợp lệ.' };
  }

  try {
    const adminClient = createAdminClient();
    const archived_at = shouldArchive ? new Date().toISOString() : null;

    const { error } = await adminClient
      .from('subjects')
      .update({ archived_at })
      .eq('id', subjectId);

    if (error) {
      console.error('Lỗi toggleArchiveSubjectAction:', error);
      return { success: false, error: 'Không thể thay đổi trạng thái lưu trữ môn học.' };
    }

    await revalidateSubjectsCache();
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');

    return {
      success: true,
      message: shouldArchive
        ? 'Đã chuyển môn học vào mục Lưu trữ.'
        : 'Đã kích hoạt lại môn học thành công.',
    };
  } catch (err: unknown) {
    console.error('Lỗi toggleArchiveSubjectAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi hệ thống.' };
  }
}

/**
 * Xóa môn học khỏi hệ thống
 * Kiểm tra ràng buộc dữ liệu: Nếu đã có lớp học hoặc câu hỏi thì yêu cầu lưu trữ thay vì xóa cứng
 */
export async function deleteSubjectAction(subjectId: string): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'ID môn học không hợp lệ.' };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Kiểm tra xem môn học có lớp học nào không
    const { count: classesCount, error: countClassesError } = await adminClient
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    if (countClassesError) {
      console.error('Lỗi đếm classes:', countClassesError);
    }

    if ((classesCount ?? 0) > 0) {
      return {
        success: false,
        error: `Môn học đang có ${classesCount} lớp học liên kết. Hãy xóa hoặc chuyển lớp trước, hoặc dùng tính năng "Lưu trữ" để bảo toàn dữ liệu.`,
      };
    }

    // 2. Kiểm tra xem môn học có câu hỏi trong ngân hàng câu hỏi không
    const { count: questionsCount } = await adminClient
      .from('question_bank')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    if ((questionsCount ?? 0) > 0) {
      return {
        success: false,
        error: `Môn học đang có ${questionsCount} câu hỏi trong ngân hàng câu hỏi. Vui lòng chọn "Lưu trữ" môn học thay vì xóa vĩnh viễn.`,
      };
    }

    // 3. Xóa các phân công giảng viên trước (foreign key cascade có thể đã hỗ trợ nhưng dọn dẹp tường minh an toàn hơn)
    await adminClient.from('teacher_subject_assignments').delete().eq('subject_id', subjectId);

    // 4. Xóa môn học
    const { error: deleteError } = await adminClient
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (deleteError) {
      console.error('Lỗi delete subject:', deleteError);
      return { success: false, error: 'Không thể xóa môn học do có ràng buộc dữ liệu khác.' };
    }

    await revalidateSubjectsCache();
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');

    return { success: true, message: 'Đã xóa vĩnh viễn môn học thành công.' };
  } catch (err: unknown) {
    console.error('Lỗi deleteSubjectAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi xóa môn học.' };
  }
}

/**
 * Gán nhanh giảng viên phụ trách môn học
 */
export async function quickAssignTeacherAction(
  subjectId: string,
  teacherId: string
): Promise<SubjectActionResponse> {
  const { error: authError, user } = await verifyAdmin();
  if (authError || !user) {
    return { success: false, error: authError || 'Không có quyền truy cập.' };
  }

  if (!/^[0-9a-f-]{36}$/i.test(subjectId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  try {
    const adminClient = createAdminClient();

    // Kiểm tra tài khoản có role là teacher
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', teacherId)
      .maybeSingle();

    if (roleData?.role !== 'teacher') {
      return { success: false, error: 'Tài khoản người dùng này chưa được cấp quyền Giảng viên.' };
    }

    const { error } = await adminClient.from('teacher_subject_assignments').upsert(
      {
        teacher_id: teacherId,
        subject_id: subjectId,
        assigned_by: user.id,
      },
      { onConflict: 'teacher_id,subject_id', ignoreDuplicates: true }
    );

    if (error) {
      console.error('Lỗi quickAssignTeacherAction:', error);
      return { success: false, error: 'Không thể gán giảng viên phụ trách môn học.' };
    }

    await revalidateSubjectsCache(teacherId);
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/subjects');

    return { success: true, message: 'Đã phân công giảng viên phụ trách môn học thành công.' };
  } catch (err: unknown) {
    console.error('Lỗi quickAssignTeacherAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi phân công giảng viên.' };
  }
}

/**
 * Hủy phân công giảng viên khỏi môn học
 */
export async function quickUnassignTeacherAction(
  subjectId: string,
  teacherId: string
): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) {
    return { success: false, error: authError };
  }

  if (!/^[0-9a-f-]{36}$/i.test(subjectId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('teacher_subject_assignments')
      .delete()
      .eq('subject_id', subjectId)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Lỗi quickUnassignTeacherAction:', error);
      return { success: false, error: 'Không thể gỡ phân công giảng viên.' };
    }

    await revalidateSubjectsCache(teacherId);
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/subjects');

    return { success: true, message: 'Đã gỡ giảng viên khỏi môn học thành công.' };
  } catch (err: unknown) {
    console.error('Lỗi quickUnassignTeacherAction:', err);
    return { success: false, error: 'Đã xảy ra lỗi khi gỡ phân công giảng viên.' };
  }
}

