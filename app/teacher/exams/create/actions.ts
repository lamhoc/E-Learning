'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendExamInstructionTags, isAutoGradeEssay, isCameraRequired } from '@/lib/exam-auto-grade';

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
  requireCamera?: boolean;
  autoGradeEssay?: boolean;
  showAnswersAfterSubmit?: boolean;
  selectedQuestions: {
    questionId: string;
    points: number;
    position: number;
  }[];
};

type SnapshotSourceQuestion = {
  id: string;
  question_type: string;
  question_text: string;
  explanation: string | null;
  options: unknown;
  answer_key: unknown;
};

type SnapshotResult = { ok: true } | { ok: false; stage: 'question' | 'answer_key' };

/**
 * Đóng gói (snapshot) câu hỏi từ ngân hàng vào exam_questions + exam_answer_keys.
 * Tối ưu N+1: 1 lệnh bulk insert exam_questions + 1 lệnh bulk insert exam_answer_keys
 * (trước đây: 2 lệnh INSERT tuần tự cho MỖI câu hỏi).
 * - `tolerant = false` (tạo đề): bất kỳ lỗi nào cũng trả về { ok: false } để caller rollback.
 * - `tolerant = true` (cập nhật đề): giữ hành vi cũ - nếu bulk lỗi thì chèn lại từng câu, bỏ qua câu lỗi.
 */
async function snapshotExamQuestions(
  adminClient: ReturnType<typeof createAdminClient>,
  examId: string,
  selectedQuestions: CreateExamPayload['selectedQuestions'],
  sourceMap: Map<string, SnapshotSourceQuestion>,
  tolerant: boolean,
): Promise<SnapshotResult> {
  const prepared: {
    eqRow: {
      exam_id: string;
      source_question_id: string;
      position: number;
      question_type: string;
      question_text: string;
      options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
      points: number;
    };
    keyRow: {
      correct_option_key: string | null;
      model_answer: string | null;
      grading_rubric: string | null;
      explanation: string | null;
    };
  }[] = [];

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

    const answerKeyObj = (Array.isArray(source.answer_key) ? source.answer_key[0] : source.answer_key) as
      | { correct_option_key?: string | null; model_answer?: string | null; grading_rubric?: string | null }
      | null
      | undefined;

    prepared.push({
      eqRow: {
        exam_id: examId,
        source_question_id: source.id,
        position: sq.position,
        question_type: source.question_type,
        question_text: source.question_text,
        options: optionsJson,
        points: sq.points,
      },
      keyRow: {
        correct_option_key: isMC ? answerKeyObj?.correct_option_key || null : null,
        model_answer: !isMC ? answerKeyObj?.model_answer || null : null,
        grading_rubric: !isMC ? answerKeyObj?.grading_rubric || null : null,
        explanation: source.explanation || null,
      },
    });
  }

  if (prepared.length === 0) return { ok: true };

  const { data: inserted, error: eqErr } = await adminClient
    .from('exam_questions')
    .insert(prepared.map((p) => p.eqRow))
    .select('id, position');

  if (!eqErr && inserted) {
    // (exam_id, position) là UNIQUE nên position định danh duy nhất từng câu vừa chèn.
    const idByPosition = new Map<number, string>(
      inserted.map((row: { id: string; position: number }) => [Number(row.position), row.id]),
    );
    const keyRows = prepared.flatMap((p) => {
      const examQuestionId = idByPosition.get(p.eqRow.position);
      return examQuestionId ? [{ exam_question_id: examQuestionId, ...p.keyRow }] : [];
    });

    if (keyRows.length > 0) {
      const { error: akErr } = await adminClient.from('exam_answer_keys').insert(keyRows);
      if (akErr) {
        console.error('Failed to snapshot exam_answer_keys (bulk):', akErr);
        return tolerant ? { ok: true } : { ok: false, stage: 'answer_key' };
      }
    }
    return { ok: true };
  }

  console.error('Failed to snapshot exam_questions (bulk):', eqErr);
  if (!tolerant) return { ok: false, stage: 'question' };

  // Chế độ dung sai (cập nhật đề): bulk là atomic nên chưa có dòng nào được chèn -> chèn lại từng câu như cũ.
  for (const p of prepared) {
    const { data: insertedEq, error: rowErr } = await adminClient
      .from('exam_questions')
      .insert(p.eqRow)
      .select('id')
      .single();
    if (insertedEq && !rowErr) {
      await adminClient.from('exam_answer_keys').insert({ exam_question_id: insertedEq.id, ...p.keyRow });
    }
  }
  return { ok: true };
}

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
  const requireCamera = Boolean(payload.requireCamera);
  const autoGradeEssay = Boolean(payload.autoGradeEssay);
  const showAnswersAfterSubmit = payload.showAnswersAfterSubmit !== false;
  const taggedInstructions = appendExamInstructionTags(instructions, {
    requireCamera,
    autoGradeEssay,
    showAnswersAfterSubmit,
  });

  try {
    // 2. Insert into public.exams with Zero-Crash Fallback
    let newExam: { id: string } | null = null;
    let examInsertError: unknown = null;

    // Lần thử 1: Ghi trực tiếp cả 3 cột require_camera, auto_grade_essay, show_answers_after_submit
    const firstAttempt = await adminClient
      .from('exams')
      .insert({
        subject_id: subjectId,
        created_by: user.id,
        title: title.trim(),
        instructions: taggedInstructions,
        duration_minutes: durationMinutes,
        max_attempts: maxAttempts,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        status: 'draft',
        require_camera: requireCamera,
        auto_grade_essay: autoGradeEssay,
        show_answers_after_submit: showAnswersAfterSubmit,
      })
      .select('id')
      .single();

    if (firstAttempt.error) {
      console.warn(
        'Lần thử 1 ghi show_answers_after_submit thất bại (có thể DB chưa chạy migration). Thử lần 2 không có cột này:',
        firstAttempt.error.message,
      );

      // Lần thử 2: Thử ghi với require_camera & auto_grade_essay
      const secondAttempt = await adminClient
        .from('exams')
        .insert({
          subject_id: subjectId,
          created_by: user.id,
          title: title.trim(),
          instructions: taggedInstructions,
          duration_minutes: durationMinutes,
          max_attempts: maxAttempts,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
          status: 'draft',
          require_camera: requireCamera,
          auto_grade_essay: autoGradeEssay,
        })
        .select('id')
        .single();

      if (secondAttempt.error) {
        console.warn(
          'Lần thử 2 thất bại. Thử lần 3 chế độ fallback cơ bản (tag cờ đã nhúng trong instructions):',
          secondAttempt.error.message,
        );
        // Lần thử 3: Bỏ cả 2 cột, chỉ ghi các trường cơ bản. Cả 2 tag đã nằm an toàn trong instructions
        const thirdAttempt = await adminClient
          .from('exams')
          .insert({
            subject_id: subjectId,
            created_by: user.id,
            title: title.trim(),
            instructions: taggedInstructions,
            duration_minutes: durationMinutes,
            max_attempts: maxAttempts,
            available_from: availableFrom || null,
            available_until: availableUntil || null,
            status: 'draft',
          })
          .select('id')
          .single();

        newExam = thirdAttempt.data;
        examInsertError = thirdAttempt.error;
      } else {
        newExam = secondAttempt.data;
      }
    } else {
      newExam = firstAttempt.data;
    }

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

    const sourceMap = new Map<string, SnapshotSourceQuestion>(
      (sourceQuestions as unknown as SnapshotSourceQuestion[]).map((sq) => [sq.id, sq]),
    );

    // 5. Snapshot into public.exam_questions & public.exam_answer_keys (bulk insert, không còn N+1)
    const snapshot = await snapshotExamQuestions(adminClient, examId, selectedQuestions, sourceMap, false);
    if (!snapshot.ok) {
      await adminClient.from('exams').delete().eq('id', examId);
      return {
        status: 'error',
        message:
          snapshot.stage === 'question'
            ? 'Lỗi khi đóng gói câu hỏi vào đề thi.'
            : 'Lỗi khi đóng gói đáp án câu hỏi.',
      };
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

    revalidatePath('/teacher/exams');
    revalidatePath('/teacher/exams/[examId]', 'page');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/questions');
    revalidatePath('/student/exams');
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

export type UpdateExamPayload = CreateExamPayload & {
  examId: string;
};

/**
 * Cập nhật trực tiếp bản ghi đề thi nháp (UPDATE trên examId sẵn có, tuyệt đối không tạo trùng).
 */
export async function updateExamAction(payload: UpdateExamPayload): Promise<CreateExamResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const {
    examId,
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

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

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

  // Kiểm tra quyền sở hữu và trạng thái đề thi
  const { data: existingExam, error: fetchErr } = await adminClient
    .from('exams')
    .select('id, created_by, status')
    .eq('id', examId)
    .maybeSingle();

  if (fetchErr || !existingExam) {
    return { status: 'error', message: 'Không tìm thấy thông tin đề thi cần cập nhật.' };
  }

  // Lấy role để kiểm tra quyền admin hoặc chính chủ giảng viên
  const { data: roleRecord } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isOwner = existingExam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền chỉnh sửa đề thi này.' };
  }

  const requireCamera = Boolean(payload.requireCamera);
  const autoGradeEssay = Boolean(payload.autoGradeEssay);
  const showAnswersAfterSubmit = payload.showAnswersAfterSubmit !== false;
  const taggedInstructions = appendExamInstructionTags(instructions, {
    requireCamera,
    autoGradeEssay,
    showAnswersAfterSubmit,
  });

  try {
    // 1. UPDATE trực tiếp bảng public.exams (Zero-Crash Fallback cho các cột mới)
    let updateSuccess = false;

    // Lần thử 1: Cập nhật cả require_camera, auto_grade_essay, show_answers_after_submit
    const firstAttempt = await adminClient
      .from('exams')
      .update({
        subject_id: subjectId,
        title: title.trim(),
        instructions: taggedInstructions,
        duration_minutes: durationMinutes,
        max_attempts: maxAttempts,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        require_camera: requireCamera,
        auto_grade_essay: autoGradeEssay,
        show_answers_after_submit: showAnswersAfterSubmit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId);

    if (firstAttempt.error) {
      console.warn('Lần thử 1 update show_answers_after_submit lỗi. Thử lần 2:', firstAttempt.error.message);
      // Lần thử 2: Cập nhật require_camera và auto_grade_essay
      const secondAttempt = await adminClient
        .from('exams')
        .update({
          subject_id: subjectId,
          title: title.trim(),
          instructions: taggedInstructions,
          duration_minutes: durationMinutes,
          max_attempts: maxAttempts,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
          require_camera: requireCamera,
          auto_grade_essay: autoGradeEssay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', examId);

      if (secondAttempt.error) {
        console.warn('Lần thử 2 update lỗi. Thử lần 3 chế độ cơ bản:', secondAttempt.error.message);
        // Lần thử 3: Cập nhật các trường cơ bản (tags đã nhúng trong instructions)
        const thirdAttempt = await adminClient
          .from('exams')
          .update({
            subject_id: subjectId,
            title: title.trim(),
            instructions: taggedInstructions,
            duration_minutes: durationMinutes,
            max_attempts: maxAttempts,
            available_from: availableFrom || null,
            available_until: availableUntil || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', examId);

        if (thirdAttempt.error) {
          console.error('Lỗi cập nhật bảng exams:', thirdAttempt.error);
          return { status: 'error', message: 'Không thể cập nhật cấu hình đề thi. Vui lòng thử lại.' };
        }
        updateSuccess = true;
      } else {
        updateSuccess = true;
      }
    } else {
      updateSuccess = true;
    }

    if (!updateSuccess) {
      return { status: 'error', message: 'Không thể lưu thay đổi đề thi.' };
    }

    // 2. Đồng bộ danh sách lớp gán: Xóa các lớp cũ và chèn lại các lớp mới
    await adminClient.from('exam_classes').delete().eq('exam_id', examId);

    if (classIds && classIds.length > 0) {
      const classRows = classIds.map((cid) => ({
        exam_id: examId,
        class_id: cid,
      }));
      const { error: classErr } = await adminClient.from('exam_classes').insert(classRows);
      if (classErr) {
        console.error('Lỗi cập nhật exam_classes:', classErr);
      }
    }

    // 3. Đồng bộ danh sách câu hỏi: Xóa câu hỏi cũ và chèn snapshot mới
    // Do exam_answer_keys có ON DELETE CASCADE từ exam_questions, xóa exam_questions sẽ tự làm sạch
    await adminClient.from('exam_questions').delete().eq('exam_id', examId);

    // Fetch thông tin nguồn từ question_bank
    const questionIds = selectedQuestions.map((sq) => sq.questionId);
    const { data: sourceQuestions, error: fetchQError } = await adminClient
      .from('question_bank')
      .select(`
        id, subject_id, question_type, question_text, explanation,
        options:question_options(option_key, option_text, position),
        answer_key:question_answer_keys(correct_option_key, model_answer, grading_rubric)
      `)
      .in('id', questionIds);

    if (!fetchQError && sourceQuestions && sourceQuestions.length > 0) {
      const sourceMap = new Map<string, SnapshotSourceQuestion>(
        (sourceQuestions as unknown as SnapshotSourceQuestion[]).map((sq) => [sq.id, sq]),
      );
      // Bulk insert (không còn N+1); chế độ dung sai giữ nguyên hành vi cũ của luồng cập nhật.
      await snapshotExamQuestions(adminClient, examId, selectedQuestions, sourceMap, true);
    }

    // 4. Xử lý Xuất bản ngay nếu người dùng chọn
    let isPublished = false;
    if (publishImmediately) {
      const { error: rpcError } = await adminClient.rpc('publish_exam', {
        p_exam_id: examId,
      });

      if (rpcError) {
        console.warn('publish_exam RPC error khi update, fallback direct status update:', rpcError);
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

    // Làm mới cache toàn diện
    revalidatePath('/teacher/exams');
    revalidatePath('/teacher/exams/[examId]', 'page');
    revalidatePath(`/teacher/exams/${examId}`);
    revalidatePath('/teacher/dashboard');
    revalidatePath('/teacher/questions');
    revalidatePath('/student/exams');
    revalidatePath('/student/dashboard');

    return {
      status: 'success',
      message: isPublished
        ? 'Đề thi đã được cập nhật và xuất bản thành công! Đề thi đã được chuyển sang mục Đã phát hành.'
        : 'Đã lưu các thay đổi của bản nháp thành công!',
      examId,
      published: isPublished,
    };
  } catch (err) {
    console.error('updateExamAction exception:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi cập nhật đề thi.',
    };
  }
}

/**
 * Xuất bản trực tiếp một bản nháp có sẵn (dùng cho nút "Xuất bản ngay" trên thẻ hoặc trang chi tiết).
 */
export async function publishExistingDraftExamAction(
  examId: string,
): Promise<{ status: 'success' | 'error'; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const adminClient = createAdminClient();

  // Kiểm tra đề thi
  const { data: exam, error: examErr } = await adminClient
    .from('exams')
    .select(`
      id, title, status, created_by,
      exam_questions(id),
      exam_classes(class_id)
    `)
    .eq('id', examId)
    .maybeSingle();

  if (examErr || !exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi.' };
  }

  // Kiểm tra quyền
  const { data: roleRecord } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isOwner = exam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền xuất bản đề thi này.' };
  }

  if (exam.status !== 'draft') {
    return { status: 'error', message: 'Đề thi này đã được xuất bản hoặc đã đóng.' };
  }

  if (!exam.exam_classes || exam.exam_classes.length === 0) {
    return {
      status: 'error',
      message: 'Đề thi chưa được gán vào lớp học nào. Vui lòng bấm "Chỉnh sửa bản nháp" để chọn ít nhất 1 lớp học trước khi xuất bản.',
    };
  }

  if (!exam.exam_questions || exam.exam_questions.length === 0) {
    return {
      status: 'error',
      message: 'Đề thi chưa có câu hỏi nào. Vui lòng bấm "Chỉnh sửa bản nháp" để thêm câu hỏi từ ngân hàng trước khi xuất bản.',
    };
  }

  // Thực hiện xuất bản
  const { error: rpcError } = await adminClient.rpc('publish_exam', {
    p_exam_id: examId,
  });

  if (rpcError) {
    console.warn('publish_exam RPC error, falling back to manual status update:', rpcError);
    const { error: updateErr } = await adminClient
      .from('exams')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', examId);

    if (updateErr) {
      console.error('Lỗi xuất bản đề thi:', updateErr);
      return { status: 'error', message: 'Không thể xuất bản đề thi. Vui lòng thử lại.' };
    }
  }

  revalidatePath('/teacher/exams');
  revalidatePath('/teacher/exams/[examId]', 'page');
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath('/teacher/dashboard');
  revalidatePath('/student/exams');
  revalidatePath('/student/dashboard');

  return {
    status: 'success',
    message: `Đã xuất bản đề thi "${exam.title}" thành công! Đề thi đã được chuyển sang mục Đã phát hành.`,
  };
}

/**
 * Xóa bản nháp đề thi không còn sử dụng.
 */
export async function deleteDraftExamAction(
  examId: string,
): Promise<{ status: 'success' | 'error'; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const adminClient = createAdminClient();

  const { data: exam, error: examErr } = await adminClient
    .from('exams')
    .select('id, title, status, created_by')
    .eq('id', examId)
    .maybeSingle();

  if (examErr || !exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi cần xóa.' };
  }

  const { data: roleRecord } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isOwner = exam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền xóa đề thi này.' };
  }

  if (exam.status !== 'draft') {
    return { status: 'error', message: 'Chỉ có thể xóa đề thi đang ở trạng thái Bản nháp.' };
  }

  // Xóa các bảng phụ thuộc và bảng chính
  await adminClient.from('exam_classes').delete().eq('exam_id', examId);
  await adminClient.from('exam_questions').delete().eq('exam_id', examId);
  const { error: delErr } = await adminClient.from('exams').delete().eq('id', examId);

  if (delErr) {
    console.error('Lỗi khi xóa bản nháp exams:', delErr);
    return { status: 'error', message: 'Không thể xóa bản nháp đề thi. Vui lòng thử lại.' };
  }

  revalidatePath('/teacher/exams');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/student/exams');
  revalidatePath('/student/dashboard');

  return {
    status: 'success',
    message: `Đã xóa bản nháp "${exam.title}" thành công.`,
  };
}

/**
 * Bật/tắt nhanh quyền xem đáp án đúng/sai sau khi nộp bài thi (Dành cho Giảng viên/Admin).
 */
export async function toggleExamAnswerVisibilityAction(
  examId: string,
  showAnswers: boolean,
): Promise<{ status: 'success' | 'error'; message: string; showAnswers?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const adminClient = createAdminClient();

  const { data: exam, error: examErr } = await adminClient
    .from('exams')
    .select('id, title, instructions, require_camera, auto_grade_essay, created_by')
    .eq('id', examId)
    .maybeSingle();

  if (examErr || !exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi cần cập nhật.' };
  }

  const { data: roleRecord } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isOwner = exam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền thay đổi cấu hình đề thi này.' };
  }

  const reqCam = isCameraRequired(exam);
  const autoGrade = isAutoGradeEssay(exam);
  const taggedInstructions = appendExamInstructionTags(exam.instructions, {
    requireCamera: reqCam,
    autoGradeEssay: autoGrade,
    showAnswersAfterSubmit: showAnswers,
  });

  // Lần thử 1: Cập nhật cả cột show_answers_after_submit và instructions
  const firstAttempt = await adminClient
    .from('exams')
    .update({
      show_answers_after_submit: showAnswers,
      instructions: taggedInstructions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', examId);

  if (firstAttempt.error) {
    console.warn(
      'Cột show_answers_after_submit chưa có trong schema, fallback cập nhật vào instructions tag:',
      firstAttempt.error.message,
    );
    // Lần thử 2: Cập nhật instructions mang tag [SHOW_ANSWERS:true/false]
    const secondAttempt = await adminClient
      .from('exams')
      .update({
        instructions: taggedInstructions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId);

    if (secondAttempt.error) {
      console.error('Lỗi cập nhật instructions exams:', secondAttempt.error);
      return { status: 'error', message: 'Không thể cập nhật cấu hình xem đáp án.' };
    }
  }

  revalidatePath('/teacher/exams');
  revalidatePath('/teacher/exams/[examId]', 'page');
  revalidatePath('/student/exams');
  revalidatePath('/student/exams/[examId]', 'page');
  revalidatePath('/student/results');

  return {
    status: 'success',
    message: showAnswers
      ? 'Đã mở quyền xem đáp án chi tiết và lời giải cho học sinh!'
      : 'Đã khóa đáp án thành công. Học sinh chỉ xem được tổng điểm!',
    showAnswers,
  };
}

