'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AssignmentActionResult = {
  status: 'success' | 'error';
  message: string;
  assignmentId?: string;
};

const ASSIGNMENTS_BUCKET = 'assignments';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Giảng viên tạo bài tập về nhà mới
 */
export async function createAssignmentAction(
  classId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // 1. Kiểm tra vai trò
  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền tạo bài tập cho lớp học này.' };
  }

  const adminClient = createAdminClient();

  // 2. Xác thực lớp học
  const { data: classRecord, error: classError } = await adminClient
    .from('classes')
    .select('id, name, teacher_id')
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classRecord) {
    return { status: 'error', message: 'Lớp học không tồn tại.' };
  }

  if (role === 'teacher' && classRecord.teacher_id !== user.id) {
    return { status: 'error', message: 'Bạn không phải là giảng viên phụ trách lớp học này.' };
  }

  // 3. Đọc dữ liệu từ FormData
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const dueDateRaw = String(formData.get('dueDate') || '').trim();
  const maxScoreRaw = String(formData.get('maxScore') || '10').trim();

  if (!title) {
    return { status: 'error', message: 'Vui lòng nhập tiêu đề bài tập.' };
  }

  if (!dueDateRaw) {
    return { status: 'error', message: 'Vui lòng chọn hạn nộp bài.' };
  }

  const dueDate = new Date(dueDateRaw);
  if (isNaN(dueDate.getTime())) {
    return { status: 'error', message: 'Hạn nộp bài không hợp lệ.' };
  }

  const maxScore = Number(maxScoreRaw);
  if (isNaN(maxScore) || maxScore <= 0 || maxScore > 100) {
    return { status: 'error', message: 'Thang điểm tối đa phải là số từ 1 đến 100.' };
  }

  // 4. Xử lý file đính kèm đề bài (nếu có)
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  const file = formData.get('attachment') as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { status: 'error', message: 'File đính kèm không được vượt quá 50MB.' };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `attachments/${classId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await adminClient.storage
      .from(ASSIGNMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadError) {
      console.error('Lỗi khi tải file đề bài lên Storage:', uploadError.message);
      return { status: 'error', message: `Không thể tải file đính kèm: ${uploadError.message}` };
    }

    const { data: publicUrlData } = adminClient.storage
      .from(ASSIGNMENTS_BUCKET)
      .getPublicUrl(storagePath);

    attachmentUrl = publicUrlData.publicUrl;
    attachmentName = file.name;
  }

  // 5. Lưu bài tập vào CSDL
  const { data: inserted, error: insertError } = await adminClient
    .from('assignments')
    .insert({
      class_id: classId,
      teacher_id: user.id,
      title,
      description,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      due_date: dueDate.toISOString(),
      max_score: maxScore,
      status: 'published',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('Lỗi khi tạo bài tập:', insertError?.message);
    return { status: 'error', message: `Lỗi khi lưu bài tập: ${insertError?.message || 'Không xác định'}` };
  }

  revalidatePath(`/teacher/classes/${classId}/assignments`);
  revalidatePath(`/teacher/classes/${classId}`);

  return {
    status: 'success',
    message: 'Đã tạo và giao bài tập về nhà thành công!',
    assignmentId: inserted.id,
  };
}

/**
 * Giảng viên chấm điểm và ghi nhận xét cho bài nộp của sinh viên
 */
export async function gradeAssignmentSubmissionAction(
  submissionId: string,
  assignmentId: string,
  classId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // 1. Kiểm tra vai trò
  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền chấm bài cho lớp học này.' };
  }

  const adminClient = createAdminClient();

  // 2. Đọc điểm và phản hồi từ FormData
  const scoreRaw = String(formData.get('score') || '').trim();
  const feedback = String(formData.get('feedback') || '').trim() || null;

  if (scoreRaw === '') {
    return { status: 'error', message: 'Vui lòng nhập điểm số.' };
  }

  const score = Number(scoreRaw);
  if (isNaN(score) || score < 0 || score > 100) {
    return { status: 'error', message: 'Điểm số phải là số từ 0 đến 100.' };
  }

  // 3. Cập nhật bài nộp
  const { error: updateError } = await adminClient
    .from('assignment_submissions')
    .update({
      score,
      feedback,
      graded_at: new Date().toISOString(),
      graded_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('assignment_id', assignmentId);

  if (updateError) {
    console.error('Lỗi khi cập nhật điểm bài nộp:', updateError.message);
    return { status: 'error', message: `Không thể lưu điểm: ${updateError.message}` };
  }

  revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}`);
  revalidatePath(`/teacher/classes/${classId}/assignments`);

  return {
    status: 'success',
    message: 'Đã lưu điểm và nhận xét bài nộp thành công!',
  };
}

/**
 * Sinh viên upload file nộp bài tập về nhà
 */
export async function submitAssignmentAction(
  assignmentId: string,
  classId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const adminClient = createAdminClient();

  // 1. Kiểm tra sinh viên có trong lớp không
  const { data: member } = await adminClient
    .from('class_memberships')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (!member) {
    return { status: 'error', message: 'Bạn không phải là thành viên của lớp học này.' };
  }

  // 2. Lấy thông tin bài tập để kiểm tra hạn nộp
  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select('id, due_date, status')
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { status: 'error', message: 'Bài tập không tồn tại.' };
  }

  if (assignment.status === 'closed') {
    return { status: 'error', message: 'Bài tập này đã đóng và không còn nhận bài nộp.' };
  }

  // 3. Đọc file nộp và ghi chú
  const file = formData.get('file') as File | null;
  const note = String(formData.get('note') || '').trim() || null;

  if (!file || file.size === 0) {
    return { status: 'error', message: 'Vui lòng chọn file bài làm (.zip, .pdf, .docx...).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: 'error', message: 'File nộp bài không được vượt quá 50MB.' };
  }

  // 4. Upload file lên Storage bucket assignments
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `submissions/${assignmentId}/${user.id}_${Date.now()}_${safeName}`;

  const { error: uploadError } = await adminClient.storage
    .from(ASSIGNMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    console.error('Lỗi khi tải file bài làm lên Storage:', uploadError.message);
    return { status: 'error', message: `Không thể tải file bài làm lên máy chủ: ${uploadError.message}` };
  }

  const { data: publicUrlData } = adminClient.storage
    .from(ASSIGNMENTS_BUCKET)
    .getPublicUrl(storagePath);

  const fileUrl = publicUrlData.publicUrl;
  const isLate = new Date() > new Date(assignment.due_date);

  // 5. Upsert bản ghi nộp bài
  const { error: upsertError } = await adminClient
    .from('assignment_submissions')
    .upsert(
      {
        assignment_id: assignmentId,
        student_id: user.id,
        file_url: fileUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        note,
        submitted_at: new Date().toISOString(),
        is_late: isLate,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'assignment_id,student_id',
      }
    );

  if (upsertError) {
    console.error('Lỗi khi lưu bài nộp vào CSDL:', upsertError.message);
    return { status: 'error', message: `Không thể lưu thông tin bài nộp: ${upsertError.message}` };
  }

  revalidatePath('/student/dashboard');
  revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}`);

  return {
    status: 'success',
    message: isLate
      ? 'Đã nộp bài thành công (Ghi nhận nộp muộn sau hạn chót).'
      : 'Đã nộp bài tập về nhà thành công!',
  };
}

