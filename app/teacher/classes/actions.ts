'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type StudentLookupState = {
  status: 'idle' | 'error' | 'found';
  message: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
    studentCode: string;
    alreadyEnrolled: boolean;
  };
};

export type MembershipActionState = {
  status: 'idle' | 'error' | 'success';
  message: string;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

async function getStaffClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase: null, user: null };

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError || !['admin', 'teacher'].includes(roleRecord?.role ?? '')) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

export async function findStudentForClass(
  _previousState: StudentLookupState,
  formData: FormData,
): Promise<StudentLookupState> {
  const classId = String(formData.get('classId') ?? '');
  const identifier = String(formData.get('identifier') ?? '').trim().toLowerCase();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isStudentCode = /^sv[0-9]{6,}$/.test(identifier);
  if (!uuidPattern.test(classId) || (!isEmail && !isStudentCode)) {
    return { status: 'error', message: 'Nhập mã sinh viên hoặc email chính xác.' };
  }

  const { supabase } = await getStaffClient();
  if (!supabase) return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };

  const { data, error } = await supabase.rpc('find_student_for_class', {
    p_class_id: classId,
    p_email: identifier,
  });
  if (error) {
    console.error('Could not find student for class:', error.code, error.message);
    return {
      status: 'error',
      message: error.code === '42501'
        ? 'Bạn không có quyền quản lý danh sách sinh viên của lớp này.'
        : 'Không thể tìm sinh viên. Kiểm tra migration ghi danh lớp trên Supabase.',
    };
  }

  const student = data?.[0];
  if (!student) {
    return { status: 'error', message: 'Không tìm thấy tài khoản sinh viên với mã hoặc email này.' };
  }

  return {
    status: 'found',
    message: student.already_enrolled ? 'Sinh viên này đã có trong lớp.' : 'Đã tìm thấy tài khoản sinh viên.',
    student: {
      id: student.student_id,
      fullName: student.full_name,
      email: student.student_email,
      studentCode: student.student_code ?? '',
      alreadyEnrolled: student.already_enrolled,
    },
  };
}

export async function enrollStudentInClass(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  if (!uuidPattern.test(classId) || !uuidPattern.test(studentId)) {
    return { status: 'error', message: 'Thông tin lớp hoặc sinh viên không hợp lệ.' };
  }

  const { supabase } = await getStaffClient();
  if (!supabase) return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };

  const { data: inserted, error } = await supabase.rpc('enroll_student_in_class', {
    p_class_id: classId,
    p_student_id: studentId,
  });
  if (error) {
    console.error('Could not enroll student in class:', error.code, error.message);
    return {
      status: 'error',
      message: error.code === '42501'
        ? 'Bạn không có quyền ghi danh sinh viên vào lớp này.'
        : 'Không thể ghi danh. Tài khoản phải có role sinh viên.',
    };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return {
    status: 'success',
    message: inserted ? 'Đã thêm sinh viên vào lớp.' : 'Sinh viên đã có trong lớp.',
  };
}

export async function unenrollStudentFromClass(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  if (!uuidPattern.test(classId) || !uuidPattern.test(studentId)) {
    return { status: 'error', message: 'Thông tin lớp hoặc sinh viên không hợp lệ.' };
  }

  const { supabase } = await getStaffClient();
  if (!supabase) return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };

  const { data: removed, error } = await supabase.rpc('unenroll_student_from_class', {
    p_class_id: classId,
    p_student_id: studentId,
  });
  if (error) {
    console.error('Could not remove student from class:', error.code, error.message);
    return {
      status: 'error',
      message: error.code === '42501'
        ? 'Bạn không có quyền chỉnh sửa danh sách sinh viên của lớp này.'
        : 'Không thể gỡ sinh viên khỏi lớp.',
    };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return {
    status: 'success',
    message: removed ? 'Đã gỡ sinh viên khỏi lớp.' : 'Sinh viên không còn trong lớp.',
  };
}