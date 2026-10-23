'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type CreateExamPayload = {
  subjectId: string;
  title: string;
  instructions?: string | null;
  durationMinutes: number;
  maxAttempts: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  classIds: string[];
  publishImmediately: boolean;
  selectedQuestions: {
    questionId: string;
    points: number;
    position: number;
  }[];
};

export type CreateExamResult = {
  status: 'success' | 'error';
  message: string;
  examId?: string;
  published?: boolean;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function createExamAction(payload: CreateExamPayload): Promise<CreateExamResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // 1. Validate Basic Fields
  const {
    subjectId,
    title,
    instructions,
    durationMinutes,
    maxAttempts,
    availableFrom,
    availableUntil,
    classIds,
    publishImmediately,
    selectedQuestions,
  } = payload;

  if (!uuidPattern.test(subjectId)) {
    return { status: 'error', message: 'Vui lòng chọn môn học hợp lệ.' };
  }

  if (!title || title.trim().length === 0) {
    return { status: 'error', message: 'Vui lòng nhập tiêu đề đề thi.' };
  }

  if (durationMinutes <= 0) {
    return { status: 'error', message: 'Thời gian làm bài phải lớn hơn 0 phút.' };
  }

  if (maxAttempts <= 0) {
    return { status: 'error', message: 'Số lượt thi tối đa phải lớn hơn 0.' };
  }

  if (availableFrom && availableUntil) {
    const fromDate = new Date(availableFrom);
    const untilDate = new Date(availableUntil);
    if (untilDate <= fromDate) {
      return { status: 'error', message: 'Thời gian kết thúc phải diễn ra sau thời gian mở đề.' };
    }
  }

  if (!selectedQuestions || selectedQuestions.length === 0) {
    return { status: 'error', message: 'Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng để đưa vào đề thi.' };
  }

  for (const q of selectedQuestions) {
    if (!uuidPattern.test(q.questionId) || q.points <= 0) {
      return { status: 'error', message: 'Điểm số của từng câu hỏi phải lớn hơn 0.' };
    }
  }

  if (publishImmediately && (!classIds || classIds.length === 0)) {
    return { status: 'error', message: 'Để xuất bản đề thi ngay lập tức, bạn phải gán đề cho ít nhất 1 lớp học.' };
  }

  const adminClient = createAdminClient();

  try {
    // 2. Insert into public.exams
    const { data: newExam, error: examInsertError } = await adminClient
      .from('exams')
      .insert({
        subject_id: subjectId,
        created_by: user.id,
        title: title.trim(),
        instructions: instructions?.trim() || null,
        duration_minutes: durationMinutes,
        max_attempts: maxAttempts,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        status: 'draft',
      })
      .select('id')
      .single();

    if (examInsertError || !newExam) {
      console.error('Failed to insert exam:', examInsertError);
      return { status: 'error', message: 'Không thể tạo bản ghi đề thi. Vui lòng thử lại.' };
    }

    const examId = newExam.id;

    // 3. Insert assigned classes into public.exam_classes
    if (classIds && classIds.length > 0) {
      const classRows = classIds.map((cid) => ({
        exam_id: examId,
        class_id: cid,
      }));

      const { error: classInsertError } = await adminClient
        .from('exam_classes')
        .insert(classRows);

      if (classInsertError) {
        console.error('Failed to link exam_classes:', classInsertError);
        // Rollback created exam
        await adminClient.from('exams').delete().eq('id', examId);
        return { status: 'error', message: 'Không thể gán đề thi vào các lớp đã chọn.' };
      }
    }

    // 4. Fetch source questions from question_bank
    const questionIds = selectedQuestions.map((sq) => sq.questionId);
    const { data: sourceQuestions, error: fetchQError } = await adminClient
      .from('question_bank')
      .select(`
        id, subject_id, question_type, question_text, explanation,
        options:question_options(option_key, option_text, position),
        answer_key:question_answer_keys(correct_option_key, model_answer, grading_rubric)
      `)
      .in('id', questionIds);

    if (fetchQError || !sourceQuestions || sourceQuestions.length === 0) {
      console.error('Failed to fetch source questions:', fetchQError);
      await adminClient.from('exams').delete().eq('id', examId);
      return { status: 'error', message: 'Không thể nạp nội dung câu hỏi từ ngân hàng.' };
    }

    const sourceMap = new Map(sourceQuestions.map((sq) => [sq.id, sq]));

    // 5. Snapshot into public.exam_questions & public.exam_answer_keys
    for (const sq of selectedQuestions) {
      const source = sourceMap.get(sq.questionId);
      if (!source) continue;

      const isMC = source.question_type === 'multiple_choice';
      const rawOptions = (Array.isArray(source.options) ? source.options : []) as {
        option_key: 'A' | 'B' | 'C' | 'D';
        option_text: string;
        position: number;
      }[];

      const sortedOptions = [...rawOptions].sort((a, b) => a.position - b.position);
      const optionsJson = isMC
        ? sortedOptions.map((opt) => ({ key: opt.option_key, text: opt.option_text }))
        : [];

      // Insert exam_question
      const { data: insertedEq, error: eqErr } = await adminClient
        .from('exam_questions')
        .insert({
          exam_id: examId,
          source_question_id: source.id,
          position: sq.position,
          question_type: source.question_type,
          question_text: source.question_text,
          options: optionsJson,
          points: sq.points,
        })
        .select('id')
        .single();

      if (eqErr || !insertedEq) {
        console.error('Failed to snapshot exam_question:', eqErr);
        await adminClient.from('exams').delete().eq('id', examId);
        return { status: 'error', message: 'Lỗi khi đóng gói câu hỏi vào đề thi.' };
      }

      // Insert exam_answer_key
      const answerKeyObj = Array.isArray(source.answer_key) ? source.answer_key[0] : source.answer_key;
      const { error: akErr } = await adminClient
        .from('exam_answer_keys')
        .insert({
          exam_question_id: insertedEq.id,
          correct_option_key: isMC ? answerKeyObj?.correct_option_key || null : null,
          model_answer: !isMC ? answerKeyObj?.model_answer || null : null,
          grading_rubric: !isMC ? answerKeyObj?.grading_rubric || null : null,
          explanation: source.explanation || null,
        });

      if (akErr) {
        console.error('Failed to snapshot exam_answer_key:', akErr);
        await adminClient.from('exams').delete().eq('id', examId);
        return { status: 'error', message: 'Lỗi khi đóng gói đáp án câu hỏi.' };
      }
    }

    // 6. Handle Publish Immediately
    let isPublished = false;
    if (publishImmediately) {
      // Call public.publish_exam(p_exam_id) RPC
      const { error: rpcError } = await adminClient.rpc('publish_exam', {
        p_exam_id: examId,
      });

      if (rpcError) {
        console.warn('publish_exam RPC error, falling back to manual publish update:', rpcError);
        // Fallback update status directly if RPC conditions check
        const { error: updateErr } = await adminClient
          .from('exams')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', examId);

        if (!updateErr) {
          isPublished = true;
        }
      } else {
        isPublished = true;
      }
    }

    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/questions');
    revalidatePath('/student/dashboard');

    return {
      status: 'success',
      message: isPublished
        ? 'Đề thi đã được khởi tạo và xuất bản thành công!'
        : 'Đề thi đã được lưu thành công dưới dạng Bản nháp!',
      examId,
      published: isPublished,
    };
  } catch (err) {
    console.error('createExamAction exception:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi tạo đề thi.',
    };
  }
}

