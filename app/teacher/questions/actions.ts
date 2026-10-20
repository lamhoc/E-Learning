'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type QuestionActionState = {
  status: 'idle' | 'error' | 'success';
  message: string;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

async function getAuthenticatedTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { supabase: null, user: null, role: null };

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !role || (role !== 'admin' && role !== 'teacher')) {
    return { supabase: null, user: null, role: null };
  }

  return { supabase, user, role };
}

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

  const { supabase, user, role } = await getAuthenticatedTeacher();
  if (!supabase || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // Verify teacher has assignment to this subject (unless admin)
  if (role === 'teacher') {
    const { data: assignment, error: assignError } = await supabase
      .from('teacher_subject_assignments')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (assignError || !assignment) {
      return { status: 'error', message: 'Bạn không được phân công môn học này.' };
    }
  }

  // 1. Insert question_bank
  const { data: newQuestion, error: qbError } = await supabase
    .from('question_bank')
    .insert({
      subject_id: subjectId,
      created_by: user.id,
      question_type: questionType,
      question_text: questionText,
      explanation: explanation || null,
    })
    .select('id')
    .single();

  if (qbError || !newQuestion) {
    console.error('Could not insert question_bank:', qbError?.code, qbError?.message);
    return { status: 'error', message: 'Không thể tạo câu hỏi. Hãy kiểm tra lại thông tin.' };
  }

  const questionId = newQuestion.id;

  // 2. Insert Type-Specific Data
  if (questionType === 'multiple_choice') {
    const optionA = String(formData.get('optionA') ?? '').trim();
    const optionB = String(formData.get('optionB') ?? '').trim();
    const optionC = String(formData.get('optionC') ?? '').trim();
    const optionD = String(formData.get('optionD') ?? '').trim();
    const correctOptionKey = String(formData.get('correctOptionKey') ?? '').trim().toUpperCase();

    if (!optionA || !optionB || !optionC || !optionD) {
      await supabase.from('question_bank').delete().eq('id', questionId);
      return { status: 'error', message: 'Vui lòng nhập đầy đủ 4 phương án A, B, C, D.' };
    }

    if (!['A', 'B', 'C', 'D'].includes(correctOptionKey)) {
      await supabase.from('question_bank').delete().eq('id', questionId);
      return { status: 'error', message: 'Vui lòng chọn đáp án đúng trong các phương án A, B, C, D.' };
    }

    // Insert options first (required by foreign key on answer keys)
    const optionsToInsert = [
      { question_id: questionId, option_key: 'A', option_text: optionA, position: 1 },
      { question_id: questionId, option_key: 'B', option_text: optionB, position: 2 },
      { question_id: questionId, option_key: 'C', option_text: optionC, position: 3 },
      { question_id: questionId, option_key: 'D', option_text: optionD, position: 4 },
    ];

    const { error: optionsError } = await supabase.from('question_options').insert(optionsToInsert);

    if (optionsError) {
      console.error('Could not insert question_options:', optionsError.code, optionsError.message);
      await supabase.from('question_bank').delete().eq('id', questionId);
      return { status: 'error', message: 'Không thể lưu các phương án trắc nghiệm.' };
    }

    // Insert answer key
    const { error: keyError } = await supabase.from('question_answer_keys').insert({
      question_id: questionId,
      correct_option_key: correctOptionKey,
      model_answer: null,
      grading_rubric: null,
    });

    if (keyError) {
      console.error('Could not insert question_answer_keys:', keyError.code, keyError.message);
      await supabase.from('question_bank').delete().eq('id', questionId);
      return { status: 'error', message: 'Không thể lưu đáp án đúng.' };
    }
  } else {
    // Essay
    const modelAnswer = String(formData.get('modelAnswer') ?? '').trim();
    const gradingRubric = String(formData.get('gradingRubric') ?? '').trim();

    const { error: keyError } = await supabase.from('question_answer_keys').insert({
      question_id: questionId,
      correct_option_key: null,
      model_answer: modelAnswer || null,
      grading_rubric: gradingRubric || null,
    });

    if (keyError) {
      console.error('Could not insert essay answer key:', keyError.code, keyError.message);
      await supabase.from('question_bank').delete().eq('id', questionId);
      return { status: 'error', message: 'Không thể lưu hướng dẫn chấm tự luận.' };
    }
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

  const { supabase, user, role } = await getAuthenticatedTeacher();
  if (!supabase || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // Check ownership
  const { data: existingQ, error: checkError } = await supabase
    .from('question_bank')
    .select('id, created_by, question_type')
    .eq('id', questionId)
    .maybeSingle();

  if (checkError || !existingQ) {
    return { status: 'error', message: 'Không tìm thấy câu hỏi cần chỉnh sửa.' };
  }

  if (role !== 'admin' && existingQ.created_by !== user.id) {
    return { status: 'error', message: 'Bạn không có quyền chỉnh sửa câu hỏi này.' };
  }

  // Update question_bank
  const { error: updateQbError } = await supabase
    .from('question_bank')
    .update({
      subject_id: subjectId,
      question_type: questionType,
      question_text: questionText,
      explanation: explanation || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId);

  if (updateQbError) {
    console.error('Could not update question_bank:', updateQbError.code, updateQbError.message);
    return { status: 'error', message: 'Không thể cập nhật câu hỏi.' };
  }

  if (questionType === 'multiple_choice') {
    const optionA = String(formData.get('optionA') ?? '').trim();
    const optionB = String(formData.get('optionB') ?? '').trim();
    const optionC = String(formData.get('optionC') ?? '').trim();
    const optionD = String(formData.get('optionD') ?? '').trim();
    const correctOptionKey = String(formData.get('correctOptionKey') ?? '').trim().toUpperCase();

    if (!optionA || !optionB || !optionC || !optionD) {
      return { status: 'error', message: 'Vui lòng nhập đầy đủ 4 phương án A, B, C, D.' };
    }

    if (!['A', 'B', 'C', 'D'].includes(correctOptionKey)) {
      return { status: 'error', message: 'Vui lòng chọn đáp án đúng trong các phương án A, B, C, D.' };
    }

    // Upsert options
    const optionsToUpsert = [
      { question_id: questionId, option_key: 'A', option_text: optionA, position: 1 },
      { question_id: questionId, option_key: 'B', option_text: optionB, position: 2 },
      { question_id: questionId, option_key: 'C', option_text: optionC, position: 3 },
      { question_id: questionId, option_key: 'D', option_text: optionD, position: 4 },
    ];

    for (const opt of optionsToUpsert) {
      await supabase.from('question_options').upsert(opt);
    }

    // Upsert answer key
    await supabase.from('question_answer_keys').upsert({
      question_id: questionId,
      correct_option_key: correctOptionKey,
      model_answer: null,
      grading_rubric: null,
      updated_at: new Date().toISOString(),
    });
  } else {
    // Essay: remove options if it was multiple_choice previously
    await supabase.from('question_options').delete().eq('question_id', questionId);

    const modelAnswer = String(formData.get('modelAnswer') ?? '').trim();
    const gradingRubric = String(formData.get('gradingRubric') ?? '').trim();

    await supabase.from('question_answer_keys').upsert({
      question_id: questionId,
      correct_option_key: null,
      model_answer: modelAnswer || null,
      grading_rubric: gradingRubric || null,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');
  return { status: 'success', message: 'Đã cập nhật câu hỏi thành công.' };
}

export async function deleteQuestion(questionId: string): Promise<QuestionActionState> {
  if (!uuidPattern.test(questionId)) {
    return { status: 'error', message: 'Mã câu hỏi không hợp lệ.' };
  }

  const { supabase, user, role } = await getAuthenticatedTeacher();
  if (!supabase || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  let deleteQuery = supabase.from('question_bank').delete().eq('id', questionId);
  if (role !== 'admin') {
    deleteQuery = deleteQuery.eq('created_by', user.id);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    console.error('Could not delete question:', deleteError.code, deleteError.message);
    return { status: 'error', message: 'Không thể xóa câu hỏi. Có thể câu hỏi đã được dùng trong đề thi.' };
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');
  return { status: 'success', message: 'Đã xóa câu hỏi khỏi ngân hàng.' };
}
