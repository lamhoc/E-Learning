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

export type CsvPreviewRow = {
  rowNumber: number;
  identifier: string;
  result: 'ready' | 'not_found' | 'already_enrolled' | 'duplicate' | 'invalid';
  studentId: string | null;
  fullName: string | null;
  email: string | null;
  studentCode: string | null;
};

export type CsvPreviewState = {
  status: 'idle' | 'error' | 'ready';
  message: string;
  requestKey?: string;
  rows?: CsvPreviewRow[];
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

type EnrollmentCsvPreviewRecord = {
  row_number: number;
  identifier: string | null;
  result: CsvPreviewRow['result'];
  student_id: string | null;
  full_name: string | null;
  student_email: string | null;
  student_code: string | null;
};

type BulkEnrollmentRecord = { student_id: string; result: string };

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

export async function previewClassEnrollmentCsv(
  _previousState: CsvPreviewState,
  formData: FormData,
): Promise<CsvPreviewState> {
  const classId = String(formData.get('classId') ?? '');
  const identifiersJson = String(formData.get('identifiersJson') ?? '');
  const errorState = (message: string): CsvPreviewState => ({
    status: 'error',
    message,
    ...(identifiersJson.length <= 100_000 ? { requestKey: identifiersJson } : {}),
  });
  if (!uuidPattern.test(classId) || identifiersJson.length > 100_000) {
    return errorState('File CSV không hợp lệ hoặc vượt quá giới hạn.');
  }

  let identifiers: unknown;
  try {
    identifiers = JSON.parse(identifiersJson);
  } catch {
    return errorState('Không đọc được dữ liệu CSV. Hãy chọn file và thử lại.');
  }

  if (
    !Array.isArray(identifiers)
    || identifiers.length === 0
    || identifiers.length > 500
    || identifiers.some((identifier) => typeof identifier !== 'string' || identifier.length > 320)
  ) {
    return errorState('CSV cần có từ 1 đến 500 dòng dữ liệu hợp lệ.');
  }

  const { supabase } = await getStaffClient();
  if (!supabase) return errorState('Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.');

  const { data, error } = await supabase.rpc('preview_class_enrollment_csv', {
    p_class_id: classId,
    p_identifiers: identifiers,
  });
  if (error) {
    console.error('Could not preview class enrollment CSV:', error.code);
    return {
      status: 'error',
      message: error.code === '42501'
        ? 'Bạn không có quyền quản lý danh sách sinh viên của lớp này.'
        : 'Không thể kiểm tra CSV. Hãy chắc chắn đã chạy migration bulk class enrollment trên Supabase.',
      requestKey: identifiersJson,
    };
  }

  const rows: CsvPreviewRow[] = ((data ?? []) as EnrollmentCsvPreviewRecord[]).map((row) => ({
    rowNumber: Number(row.row_number),
    identifier: row.identifier ?? '',
    result: row.result,
    studentId: row.student_id,
    fullName: row.full_name,
    email: row.student_email,
    studentCode: row.student_code,
  }));

  return {
    status: 'ready',
    message: `Đã kiểm tra ${rows.length} dòng. Chỉ các dòng hợp lệ mới được thêm.`,
    requestKey: identifiersJson,
    rows,
  };
}

export async function bulkEnrollClassCsv(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentIdsJson = String(formData.get('studentIdsJson') ?? '');
  if (!uuidPattern.test(classId) || studentIdsJson.length > 30_000) {
    return { status: 'error', message: 'Dữ liệu CSV không hợp lệ hoặc vượt quá giới hạn.' };
  }

  let studentIds: unknown;
  try {
    studentIds = JSON.parse(studentIdsJson);
  } catch {
    return { status: 'error', message: 'Không đọc được danh sách đã xác nhận.' };
  }

  if (
    !Array.isArray(studentIds)
    || studentIds.length === 0
    || studentIds.length > 500
    || studentIds.some((studentId) => typeof studentId !== 'string' || !uuidPattern.test(studentId))
  ) {
    return { status: 'error', message: 'Không có dòng hợp lệ để ghi danh.' };
  }

  const { supabase } = await getStaffClient();
  if (!supabase) return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };

  const { data, error } = await supabase.rpc('bulk_enroll_students_in_class', {
    p_class_id: classId,
    p_student_ids: studentIds,
  });
  if (error) {
    console.error('Could not bulk enroll students:', error.code);
    return {
      status: 'error',
      message: error.code === '42501'
        ? 'Bạn không có quyền ghi danh sinh viên vào lớp này.'
        : 'Không thể ghi danh CSV. Hãy tải lại preview và thử lại.',
    };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  const results = (data ?? []) as BulkEnrollmentRecord[];
  const added = results.filter((row) => row.result === 'added').length;
  const existing = results.filter((row) => row.result === 'already_enrolled').length;
  const rejected = results.filter((row) => row.result === 'not_student').length;
  return {
    status: 'success',
    message: `Đã thêm ${added} sinh viên; ${existing} đã có trong lớp; ${rejected} tài khoản không còn role sinh viên.`,
  };
}