'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import { ClassSchema, TeacherSubjectAssignmentSchema } from '@/lib/db/entities';

export type CreateClassState = {
  status: 'idle' | 'error' | 'success';
  message: string;
};

export async function createTeacherClass(
  _previousState: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const subjectId = String(formData.get('subjectId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const classCode = String(formData.get('classCode') ?? '').trim().toUpperCase();
  const academicYear = String(formData.get('academicYear') ?? '').trim();

  if (
    !/^[0-9a-f-]{36}$/i.test(subjectId)
    || name.length < 2
    || name.length > 120
    || !/^[A-Z0-9_-]{2,24}$/.test(classCode)
    || !/^\d{4}-\d{4}$/.test(academicYear)
  ) {
    return { status: 'error', message: 'Thông tin lớp học chưa hợp lệ.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user) return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  if (role !== 'teacher') return { status: 'error', message: 'Chỉ giảng viên mới có thể tạo lớp.' };

  try {
    const ds = await getDataSource();
    const assignment = await ds.getRepository(TeacherSubjectAssignmentSchema).findOne({
      where: { teacher_id: user.id, subject_id: subjectId },
    });
    if (!assignment) {
      return {
        status: 'error',
        message: 'Bạn chưa được phân công môn này hoặc không còn quyền tạo lớp.',
      };
    }

    const classRepo = ds.getRepository(ClassSchema);
    const duplicate = await classRepo.findOne({
      where: { class_code: classCode, academic_year: academicYear },
    });
    if (duplicate) {
      return { status: 'error', message: 'Mã lớp đã được dùng trong năm học này.' };
    }

    await classRepo.save(
      classRepo.create({
        subject_id: subjectId,
        teacher_id: user.id,
        name,
        class_code: classCode,
        academic_year: academicYear,
        archived_at: null,
      }),
    );
  } catch (err) {
    console.error('Could not create teacher class:', err);
    return { status: 'error', message: 'Không thể tạo lớp. Hãy thử lại sau.' };
  }

  revalidatePath('/teacher/dashboard');
  revalidatePath('/teacher/classes');
  revalidatePath('/teacher/subjects');
  revalidatePath('/subjects');
  return { status: 'success', message: 'Đã tạo lớp học.' };
}
