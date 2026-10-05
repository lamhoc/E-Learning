'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError || roleRecord?.role !== 'teacher') {
    return { status: 'error', message: 'Chỉ giảng viên mới có thể tạo lớp.' };
  }

  const { error } = await supabase.from('classes').insert({
    subject_id: subjectId,
    teacher_id: user.id,
    name,
    class_code: classCode,
    academic_year: academicYear,
  });

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Mã lớp đã được dùng trong năm học này.' };
    }
    if (error.code === '42501') {
      return { status: 'error', message: 'Bạn chưa được phân công môn này hoặc không còn quyền tạo lớp.' };
    }
    console.error('Could not create teacher class:', error.code, error.message);
    return { status: 'error', message: 'Không thể tạo lớp. Hãy thử lại sau.' };
  }

  revalidatePath('/teacher/dashboard');
  revalidatePath('/subjects');
  return { status: 'success', message: 'Đã tạo lớp học.' };
}