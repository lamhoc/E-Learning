'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  QuestionAnswerKeySchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';

export type QuestionActionState = {
  status: 'idle' | 'error' | 'success';
  message: string;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function createQuestion(
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const questionType = String(formData.get('questionType') ?? '').trim();
  const questionText = String(formData.get('questionText') ?? '').trim();
  const explanation = String(formData.get('explanation') ?? '').trim();

  if (!uuidPattern.test(subjectId)) {
    return { status: 'error', message: 'Vui lòng chọn môn học hợp lệ.' };
  }
  if (questionType !== 'multiple_choice' && questionType !== 'essay') {
    return { status: 'error', message: 'Loại câu hỏi không hợp lệ.' };
  }
  if (!questionText || questionText.length < 3) {
    return { status: 'error', message: 'Nội dung câu hỏi phải có ít nhất 3 ký tự.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const ds = await getDataSource();

  if (role === 'teacher') {
    const assignment = await ds.getRepository(TeacherSubjectAssignmentSchema).findOne({
      where: { teacher_id: user.id, subject_id: subjectId },
    });
    if (!assignment) {
      return { status: 'error', message: 'Bạn không được phân công môn học này.' };
    }
  }

  const optionA = String(formData.get('optionA') ?? '').trim();
  const optionB = String(formData.get('optionB') ?? '').trim();
  const optionC = String(formData.get('optionC') ?? '').trim();
  const optionD = String(formData.get('optionD') ?? '').trim();
  const correctOptionKey = String(formData.get('correctOptionKey') ?? '').trim().toUpperCase();
  const modelAnswer = String(formData.get('modelAnswer') ?? '').trim();
  const gradingRubric = String(formData.get('gradingRubric') ?? '').trim();

  if (questionType === 'multiple_choice') {
    if (!optionA || !optionB || !optionC || !optionD) {
      return { status: 'error', message: 'Vui lòng nhập đầy đủ 4 phương án A, B, C, D.' };
    }
    if (!['A', 'B', 'C', 'D'].includes(correctOptionKey)) {
      return { status: 'error', message: 'Vui lòng chọn đáp án đúng trong các phương án A, B, C, D.' };
    }
  }

  try {
    await ds.transaction(async (manager) => {
      const qbRepo = manager.getRepository(QuestionBankSchema);
      const optRepo = manager.getRepository(QuestionOptionSchema);
      const keyRepo = manager.getRepository(QuestionAnswerKeySchema);

      const savedQ = await qbRepo.save(
        qbRepo.create({
          subject_id: subjectId,
          created_by: user.id,
          question_type: questionType,
          question_text: questionText,
          explanation: explanation || null,
          archived_at: null,
        }),
      );

      if (questionType === 'multiple_choice') {
        await optRepo.save([
          optRepo.create({ question_id: savedQ.id, option_key: 'A', option_text: optionA, position: 1 }),
          optRepo.create({ question_id: savedQ.id, option_key: 'B', option_text: optionB, position: 2 }),
          optRepo.create({ question_id: savedQ.id, option_key: 'C', option_text: optionC, position: 3 }),
          optRepo.create({ question_id: savedQ.id, option_key: 'D', option_text: optionD, position: 4 }),
        ]);

        await keyRepo.save(
          keyRepo.create({
            question_id: savedQ.id,
            correct_option_key: correctOptionKey,
            model_answer: null,
            grading_rubric: null,
          }),
        );
      } else {
        await keyRepo.save(
          keyRepo.create({
            question_id: savedQ.id,
            correct_option_key: null,
            model_answer: modelAnswer || null,
            grading_rubric: gradingRubric || null,
          }),
        );
      }
    });
  } catch (err) {
    console.error('Could not create question:', err);
    return { status: 'error', message: 'Không thể tạo câu hỏi. Hãy kiểm tra lại thông tin.' };
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');
  return { status: 'success', message: 'Đã thêm câu hỏi vào ngân hàng thành công.' };
}

export async function updateQuestion(
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const questionId = String(formData.get('questionId') ?? '').trim();
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const questionType = String(formData.get('questionType') ?? '').trim();
  const questionText = String(formData.get('questionText') ?? '').trim();
  const explanation = String(formData.get('explanation') ?? '').trim();

  if (!uuidPattern.test(questionId) || !uuidPattern.test(subjectId)) {
    return { status: 'error', message: 'Thông tin câu hỏi hoặc môn học không hợp lệ.' };
  }
  if (questionType !== 'multiple_choice' && questionType !== 'essay') {
    return { status: 'error', message: 'Loại câu hỏi không hợp lệ.' };
  }
  if (!questionText || questionText.length < 3) {
    return { status: 'error', message: 'Nội dung câu hỏi phải có ít nhất 3 ký tự.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const ds = await getDataSource();
  const existingQ = await ds.getRepository(QuestionBankSchema).findOne({
    where: { id: questionId },
  });

  if (!existingQ) {
    return { status: 'error', message: 'Không tìm thấy câu hỏi cần chỉnh sửa.' };
  }
  if (role !== 'admin' && existingQ.created_by !== user.id) {
    return { status: 'error', message: 'Bạn không có quyền chỉnh sửa câu hỏi này.' };
  }

  const optionA = String(formData.get('optionA') ?? '').trim();
  const optionB = String(formData.get('optionB') ?? '').trim();
  const optionC = String(formData.get('optionC') ?? '').trim();
  const optionD = String(formData.get('optionD') ?? '').trim();
  const correctOptionKey = String(formData.get('correctOptionKey') ?? '').trim().toUpperCase();
  const modelAnswer = String(formData.get('modelAnswer') ?? '').trim();
  const gradingRubric = String(formData.get('gradingRubric') ?? '').trim();

  if (questionType === 'multiple_choice') {
    if (!optionA || !optionB || !optionC || !optionD) {
      return { status: 'error', message: 'Vui lòng nhập đầy đủ 4 phương án A, B, C, D.' };
    }
    if (!['A', 'B', 'C', 'D'].includes(correctOptionKey)) {
      return { status: 'error', message: 'Vui lòng chọn đáp án đúng trong các phương án A, B, C, D.' };
    }
  }

  try {
    await ds.transaction(async (manager) => {
      const qbRepo = manager.getRepository(QuestionBankSchema);
      const optRepo = manager.getRepository(QuestionOptionSchema);
      const keyRepo = manager.getRepository(QuestionAnswerKeySchema);
      const nowIso = new Date().toISOString();

      await qbRepo.update(
        { id: questionId },
        {
          subject_id: subjectId,
          question_type: questionType,
          question_text: questionText,
          explanation: explanation || null,
          updated_at: nowIso,
        },
      );

      await optRepo.delete({ question_id: questionId });

      if (questionType === 'multiple_choice') {
        await optRepo.save([
          optRepo.create({ question_id: questionId, option_key: 'A', option_text: optionA, position: 1 }),
          optRepo.create({ question_id: questionId, option_key: 'B', option_text: optionB, position: 2 }),
          optRepo.create({ question_id: questionId, option_key: 'C', option_text: optionC, position: 3 }),
          optRepo.create({ question_id: questionId, option_key: 'D', option_text: optionD, position: 4 }),
        ]);

        await keyRepo.save(
          keyRepo.create({
            question_id: questionId,
            correct_option_key: correctOptionKey,
            model_answer: null,
            grading_rubric: null,
            updated_at: nowIso,
          }),
        );
      } else {
        await keyRepo.save(
          keyRepo.create({
            question_id: questionId,
            correct_option_key: null,
            model_answer: modelAnswer || null,
            grading_rubric: gradingRubric || null,
            updated_at: nowIso,
          }),
        );
      }
    });
  } catch (err) {
    console.error('Could not update question:', err);
    return { status: 'error', message: 'Không thể cập nhật câu hỏi.' };
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');
  return { status: 'success', message: 'Đã cập nhật câu hỏi thành công.' };
}

export async function deleteQuestion(questionId: string): Promise<QuestionActionState> {
  if (!uuidPattern.test(questionId)) {
    return { status: 'error', message: 'Mã câu hỏi không hợp lệ.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  try {
    const ds = await getDataSource();
    const where: Record<string, unknown> = { id: questionId };
    if (role !== 'admin') where.created_by = user.id;

    await ds.getRepository(QuestionBankSchema).delete(where);
  } catch (err) {
    console.error('Could not delete question:', err);
    return { status: 'error', message: 'Không thể xóa câu hỏi. Có thể câu hỏi đã được dùng trong đề thi.' };
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');
  return { status: 'success', message: 'Đã xóa câu hỏi khỏi ngân hàng.' };
}
