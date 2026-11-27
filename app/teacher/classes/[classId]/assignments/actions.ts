'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  AssignmentSchema,
  AssignmentSubmissionSchema,
  ClassMembershipSchema,
  ClassSchema,
} from '@/lib/db/entities';
import { saveUploadedFile } from '@/lib/storage/local-storage';

export type AssignmentActionResult = {
  status: 'success' | 'error';
  message: string;
  assignmentId?: string;
};

const ASSIGNMENTS_BUCKET = 'assignments';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function createAssignmentAction(
  classId: string,
  formData: FormData,
): Promise<AssignmentActionResult> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền tạo bài tập cho lớp học này.' };
  }

  const ds = await getDataSource();
  const classRecord = await ds.getRepository(ClassSchema).findOne({
    where: { id: classId },
    select: { id: true, name: true, teacher_id: true },
  });

  if (!classRecord) {
    return { status: 'error', message: 'Lớp học không tồn tại.' };
  }

  if (role === 'teacher' && classRecord.teacher_id !== user.id) {
    return { status: 'error', message: 'Bạn không phải là giảng viên phụ trách lớp học này.' };
  }

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const dueDateRaw = String(formData.get('dueDate') || '').trim();
  const maxScoreRaw = String(formData.get('maxScore') || '10').trim();

  if (!title) return { status: 'error', message: 'Vui lòng nhập tiêu đề bài tập.' };
  if (!dueDateRaw) return { status: 'error', message: 'Vui lòng chọn hạn nộp bài.' };

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return { status: 'error', message: 'Hạn nộp bài không hợp lệ.' };
  }

  const maxScore = Number(maxScoreRaw);
  if (Number.isNaN(maxScore) || maxScore <= 0 || maxScore > 100) {
    return { status: 'error', message: 'Thang điểm tối đa phải là số từ 1 đến 100.' };
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  const file = formData.get('attachment') as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { status: 'error', message: 'File đính kèm không được vượt quá 50MB.' };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `attachments/${classId}/${Date.now()}_${safeName}`;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { publicUrl } = await saveUploadedFile(ASSIGNMENTS_BUCKET, storagePath, buffer);
      attachmentUrl = publicUrl;
      attachmentName = file.name;
    } catch (uploadError) {
      console.error('Lỗi khi tải file đề bài lên Storage nội bộ:', uploadError);
      return { status: 'error', message: 'Không thể tải file đính kèm lên máy chủ.' };
    }
  }

  try {
    const repo = ds.getRepository(AssignmentSchema);
    const saved = await repo.save(
      repo.create({
        class_id: classId,
        teacher_id: user.id,
        title,
        description,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        due_date: dueDate.toISOString(),
        max_score: maxScore,
        status: 'published',
      }),
    );

    revalidatePath(`/teacher/classes/${classId}/assignments`);
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath('/teacher/assignments');
    revalidatePath('/student/assignments');
    revalidatePath('/student/dashboard');

    return {
      status: 'success',
      message: 'Đã tạo và giao bài tập về nhà thành công!',
      assignmentId: saved.id,
    };
  } catch (err) {
    console.error('Lỗi khi tạo bài tập:', err);
    return { status: 'error', message: 'Lỗi khi lưu bài tập vào CSDL.' };
  }
}

export async function gradeAssignmentSubmissionAction(
  submissionId: string,
  assignmentId: string,
  classId: string,
  formData: FormData,
): Promise<AssignmentActionResult> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền chấm bài cho lớp học này.' };
  }

  const scoreRaw = String(formData.get('score') || '').trim();
  const feedback = String(formData.get('feedback') || '').trim() || null;

  if (scoreRaw === '') return { status: 'error', message: 'Vui lòng nhập điểm số.' };

  const score = Number(scoreRaw);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    return { status: 'error', message: 'Điểm số phải là số từ 0 đến 100.' };
  }

  try {
    const ds = await getDataSource();
    const nowIso = new Date().toISOString();
    await ds.getRepository(AssignmentSubmissionSchema).update(
      { id: submissionId, assignment_id: assignmentId },
      {
        score,
        feedback,
        graded_at: nowIso,
        graded_by: user.id,
        updated_at: nowIso,
      },
    );

    revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}`);
    revalidatePath(`/teacher/classes/${classId}/assignments`);
    revalidatePath('/teacher/assignments');
    revalidatePath('/student/assignments');
    revalidatePath('/student/dashboard');
    revalidatePath('/student/results');

    return {
      status: 'success',
      message: 'Đã lưu điểm và nhận xét bài nộp thành công!',
    };
  } catch (err) {
    console.error('Lỗi khi cập nhật điểm bài nộp:', err);
    return { status: 'error', message: 'Không thể lưu điểm vào CSDL.' };
  }
}

export async function submitAssignmentAction(
  assignmentId: string,
  classId: string,
  formData: FormData,
): Promise<AssignmentActionResult> {
  const { user } = await getCurrentUserWithRole();

  if (!user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const ds = await getDataSource();
  const member = await ds.getRepository(ClassMembershipSchema).findOne({
    where: { class_id: classId, student_id: user.id },
  });

  if (!member) {
    return { status: 'error', message: 'Bạn không phải là thành viên của lớp học này.' };
  }

  const assignment = await ds.getRepository(AssignmentSchema).findOne({
    where: { id: assignmentId },
    select: { id: true, due_date: true, status: true },
  });

  if (!assignment) {
    return { status: 'error', message: 'Bài tập không tồn tại.' };
  }

  if (assignment.status === 'closed') {
    return { status: 'error', message: 'Bài tập này đã đóng và không còn nhận bài nộp.' };
  }

  const file = formData.get('file') as File | null;
  const note = String(formData.get('note') || '').trim() || null;

  if (!file || file.size === 0) {
    return { status: 'error', message: 'Vui lòng chọn file bài làm (.zip, .pdf, .docx...).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: 'error', message: 'File nộp bài không được vượt quá 50MB.' };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `submissions/${assignmentId}/${user.id}_${Date.now()}_${safeName}`;

  let fileUrl = '';
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await saveUploadedFile(ASSIGNMENTS_BUCKET, storagePath, buffer);
    fileUrl = publicUrl;
  } catch (uploadError) {
    console.error('Lỗi khi tải file bài làm lên Storage:', uploadError);
    return { status: 'error', message: 'Không thể tải file bài làm lên máy chủ.' };
  }

  const isLate = new Date() > new Date(assignment.due_date);
  const nowIso = new Date().toISOString();

  try {
    const subRepo = ds.getRepository(AssignmentSubmissionSchema);
    const existing = await subRepo.findOne({
      where: { assignment_id: assignmentId, student_id: user.id },
    });

    if (existing) {
      await subRepo.update(
        { id: existing.id },
        {
          file_url: fileUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          note,
          submitted_at: nowIso,
          is_late: isLate,
          updated_at: nowIso,
        },
      );
    } else {
      await subRepo.save(
        subRepo.create({
          assignment_id: assignmentId,
          student_id: user.id,
          file_url: fileUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          note,
          submitted_at: nowIso,
          is_late: isLate,
          score: null,
          feedback: null,
          graded_at: null,
          graded_by: null,
        }),
      );
    }
  } catch (err) {
    console.error('Lỗi khi lưu bài nộp vào CSDL:', err);
    return { status: 'error', message: 'Không thể lưu thông tin bài nộp.' };
  }

  revalidatePath('/student/dashboard');
  revalidatePath('/student/results');
  revalidatePath('/student/assignments');
  revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}`);

  return {
    status: 'success',
    message: isLate
      ? 'Đã nộp bài thành công (Ghi nhận nộp muộn sau hạn chót).'
      : 'Đã nộp bài tập về nhà thành công!',
  };
}
