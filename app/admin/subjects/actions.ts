'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { revalidateSubjectsCache } from '@/lib/data-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  QuestionBankSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
  UserRoleSchema,
} from '@/lib/db/entities';

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

  if (role !== 'admin' && user.app_metadata?.role !== 'admin') {
    return { error: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.', user: null };
  }

  return { error: null, user };
}

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
    return { success: false, error: 'Tên môn học phải từ 2 đến 120 ký tự.' };
  }

  try {
    const ds = await getDataSource();
    const subjectRepo = ds.getRepository(SubjectSchema);

    const existing = await subjectRepo
      .createQueryBuilder('s')
      .where('UPPER(s.code) = :code', { code })
      .getOne();

    if (existing) {
      return { success: false, error: `Mã môn "${code}" đã tồn tại trong hệ thống.` };
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
    const ds = await getDataSource();
    const subjectRepo = ds.getRepository(SubjectSchema);

    const existing = await subjectRepo
      .createQueryBuilder('s')
      .where('UPPER(s.code) = :code AND s.id <> :subjectId', { code, subjectId })
      .getOne();

    if (existing) {
      return { success: false, error: `Mã môn "${code}" đã được sử dụng bởi một môn học khác.` };
    }

    await subjectRepo.update(
      { id: subjectId },
      { code, name, description: description || null },
    );

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

export async function toggleArchiveSubjectAction(
  subjectId: string,
  shouldArchive: boolean,
): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) return { success: false, error: authError };

  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'ID môn học không hợp lệ.' };
  }

  try {
    const ds = await getDataSource();
    const archived_at = shouldArchive ? new Date().toISOString() : null;
    await ds.getRepository(SubjectSchema).update({ id: subjectId }, { archived_at });

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

export async function deleteSubjectAction(subjectId: string): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) return { success: false, error: authError };

  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) {
    return { success: false, error: 'ID môn học không hợp lệ.' };
  }

  try {
    const ds = await getDataSource();
    const [classesCount, questionsCount] = await Promise.all([
      ds.getRepository(ClassSchema).count({ where: { subject_id: subjectId } }),
      ds.getRepository(QuestionBankSchema).count({ where: { subject_id: subjectId } }),
    ]);

    if (classesCount > 0) {
      return {
        success: false,
        error: `Môn học đang có ${classesCount} lớp học liên kết. Hãy xóa hoặc chuyển lớp trước, hoặc dùng tính năng "Lưu trữ" để bảo toàn dữ liệu.`,
      };
    }

    if (questionsCount > 0) {
      return {
        success: false,
        error: `Môn học đang có ${questionsCount} câu hỏi trong ngân hàng câu hỏi. Vui lòng chọn "Lưu trữ" môn học thay vì xóa vĩnh viễn.`,
      };
    }

    await ds.getRepository(TeacherSubjectAssignmentSchema).delete({ subject_id: subjectId });
    await ds.getRepository(SubjectSchema).delete({ id: subjectId });

    await revalidateSubjectsCache();
    revalidatePath('/admin/subjects');
    revalidatePath('/admin/teacher-access');
    revalidatePath('/teacher/subjects');
    revalidatePath('/subjects');

    return { success: true, message: 'Đã xóa vĩnh viễn môn học thành công.' };
  } catch (err: unknown) {
    console.error('Lỗi deleteSubjectAction:', err);
    return { success: false, error: 'Không thể xóa môn học do có ràng buộc dữ liệu khác.' };
  }
}

export async function quickAssignTeacherAction(
  subjectId: string,
  teacherId: string,
): Promise<SubjectActionResponse> {
  const { error: authError, user } = await verifyAdmin();
  if (authError || !user) return { success: false, error: authError || 'Không có quyền truy cập.' };

  if (!/^[0-9a-f-]{36}$/i.test(subjectId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  try {
    const ds = await getDataSource();
    const roleData = await ds.getRepository(UserRoleSchema).findOne({
      where: { user_id: teacherId },
    });

    if (roleData?.role !== 'teacher') {
      return { success: false, error: 'Tài khoản người dùng này chưa được cấp quyền Giảng viên.' };
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

export async function quickUnassignTeacherAction(
  subjectId: string,
  teacherId: string,
): Promise<SubjectActionResponse> {
  const { error: authError } = await verifyAdmin();
  if (authError) return { success: false, error: authError };

  if (!/^[0-9a-f-]{36}$/i.test(subjectId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    return { success: false, error: 'Thông tin phân công không hợp lệ.' };
  }

  try {
    const ds = await getDataSource();
    await ds
      .getRepository(TeacherSubjectAssignmentSchema)
      .delete({ subject_id: subjectId, teacher_id: teacherId });

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
