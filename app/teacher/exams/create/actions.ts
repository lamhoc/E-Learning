'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { In, type EntityManager } from 'typeorm';
import { getCurrentUser } from '@/lib/auth-cache';
import { getDataSource, getRepo } from '@/lib/db/data-source';
import {
  ExamAnswerKeySchema,
  ExamClassSchema,
  ExamQuestionSchema,
  ExamSchema,
  QuestionAnswerKeySchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  UserRoleSchema,
  type ExamQuestionOptionJson,
  type QuestionType,
} from '@/lib/db/entities';
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
  question_type: QuestionType;
  question_text: string;
  explanation: string | null;
  options: {
    option_key: string;
    option_text: string;
    position: number;
  }[];
  answer_key: {
    correct_option_key?: string | null;
    model_answer?: string | null;
    grading_rubric?: string | null;
  } | null;
};

async function loadSourceQuestionMap(
  manager: EntityManager,
  questionIds: string[],
): Promise<Map<string, SnapshotSourceQuestion>> {
  if (questionIds.length === 0) return new Map();

  const [questions, options, answerKeys] = await Promise.all([
    manager.getRepository(QuestionBankSchema).find({ where: { id: In(questionIds) } }),
    manager.getRepository(QuestionOptionSchema).find({ where: { question_id: In(questionIds) } }),
    manager.getRepository(QuestionAnswerKeySchema).find({ where: { question_id: In(questionIds) } }),
  ]);

  const optionsByQ = new Map<string, SnapshotSourceQuestion['options']>();
  for (const opt of options) {
    const list = optionsByQ.get(opt.question_id) ?? [];
    list.push({
      option_key: opt.option_key,
      option_text: opt.option_text,
      position: opt.position,
    });
    optionsByQ.set(opt.question_id, list);
  }

  const keyByQ = new Map(answerKeys.map((k) => [k.question_id, k]));

  const sourceMap = new Map<string, SnapshotSourceQuestion>();
  for (const q of questions) {
    sourceMap.set(q.id, {
      id: q.id,
      question_type: q.question_type,
      question_text: q.question_text,
      explanation: q.explanation,
      options: optionsByQ.get(q.id) ?? [],
      answer_key: keyByQ.get(q.id) ?? null,
    });
  }
  return sourceMap;
}

/**
 * Đóng gói (snapshot) câu hỏi từ ngân hàng vào exam_questions + exam_answer_keys trong cùng transaction.
 */
async function snapshotExamQuestions(
  manager: EntityManager,
  examId: string,
  selectedQuestions: CreateExamPayload['selectedQuestions'],
  sourceMap: Map<string, SnapshotSourceQuestion>,
): Promise<void> {
  const eqRows: {
    id: string;
    exam_id: string;
    source_question_id: string;
    position: number;
    question_type: QuestionType;
    question_text: string;
    options: ExamQuestionOptionJson[];
    points: number;
  }[] = [];

  const keyRows: {
    exam_question_id: string;
    correct_option_key: string | null;
    model_answer: string | null;
    grading_rubric: string | null;
    explanation: string | null;
  }[] = [];

  for (const sq of selectedQuestions) {
    const source = sourceMap.get(sq.questionId);
    if (!source) continue;

    const isMC = source.question_type === 'multiple_choice';
    const sortedOptions = [...source.options].sort((a, b) => a.position - b.position);
    const optionsJson: ExamQuestionOptionJson[] = isMC
      ? sortedOptions.map((opt) => ({ key: opt.option_key, text: opt.option_text }))
      : [];

    const examQuestionId = randomUUID();
    eqRows.push({
      id: examQuestionId,
      exam_id: examId,
      source_question_id: source.id,
      position: sq.position,
      question_type: source.question_type,
      question_text: source.question_text,
      options: optionsJson,
      points: sq.points,
    });

    keyRows.push({
      exam_question_id: examQuestionId,
      correct_option_key: isMC ? source.answer_key?.correct_option_key || null : null,
      model_answer: !isMC ? source.answer_key?.model_answer || null : null,
      grading_rubric: !isMC ? source.answer_key?.grading_rubric || null : null,
      explanation: source.explanation || null,
    });
  }

  if (eqRows.length === 0) return;

  await manager.getRepository(ExamQuestionSchema).insert(eqRows);
  await manager.getRepository(ExamAnswerKeySchema).insert(keyRows);
}

/**
 * Thay thế RPC publish_exam của Postgres: kiểm tra điều kiện hợp lệ và cập nhật trạng thái published.
 */
async function publishExamInTransaction(manager: EntityManager, examId: string): Promise<boolean> {
  const examRepo = manager.getRepository(ExamSchema);
  const exam = await examRepo.findOne({ where: { id: examId } });
  if (!exam || exam.status !== 'draft') return false;

  const [classCount, questionCount] = await Promise.all([
    manager.getRepository(ExamClassSchema).count({ where: { exam_id: examId } }),
    manager.getRepository(ExamQuestionSchema).count({ where: { exam_id: examId } }),
  ]);

  if (classCount === 0 || questionCount === 0) {
    return false;
  }

  const nowIso = new Date().toISOString();
  await examRepo.update(
    { id: examId },
    { status: 'published', published_at: nowIso, updated_at: nowIso },
  );
  return true;
}

export type CreateExamResult = {
  status: 'success' | 'error';
  message: string;
  examId?: string;
  published?: boolean;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function createExamAction(payload: CreateExamPayload): Promise<CreateExamResult> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

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

  const requireCamera = Boolean(payload.requireCamera);
  const autoGradeEssay = Boolean(payload.autoGradeEssay);
  const showAnswersAfterSubmit = payload.showAnswersAfterSubmit !== false;
  const taggedInstructions = appendExamInstructionTags(instructions, {
    requireCamera,
    autoGradeEssay,
    showAnswersAfterSubmit,
  });

  try {
    const ds = await getDataSource();
    const { examId, isPublished } = await ds.transaction(async (manager) => {
      const id = randomUUID();
      const nowIso = new Date().toISOString();

      await manager.getRepository(ExamSchema).insert({
        id,
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
        published_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      });

      const uniqueClassIds = Array.from(new Set(classIds ?? []));
      if (uniqueClassIds.length > 0) {
        await manager.getRepository(ExamClassSchema).insert(
          uniqueClassIds.map((cid) => ({
            exam_id: id,
            class_id: cid,
          })),
        );
      }

      const questionIds = Array.from(new Set(selectedQuestions.map((sq) => sq.questionId)));
      const sourceMap = await loadSourceQuestionMap(manager, questionIds);
      if (sourceMap.size === 0) {
        throw new Error('Không thể nạp nội dung câu hỏi từ ngân hàng.');
      }

      await snapshotExamQuestions(manager, id, selectedQuestions, sourceMap);

      let published = false;
      if (publishImmediately) {
        published = await publishExamInTransaction(manager, id);
      }

      return { examId: id, isPublished: published };
    });

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
  const { user, error: authError } = await getCurrentUser();

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

  const [examRepo, roleRepo] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(UserRoleSchema),
  ]);

  const [existingExam, roleRecord] = await Promise.all([
    examRepo.findOne({ where: { id: examId } }),
    roleRepo.findOne({ where: { user_id: user.id } }),
  ]);

  if (!existingExam) {
    return { status: 'error', message: 'Không tìm thấy thông tin đề thi cần cập nhật.' };
  }

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
    const ds = await getDataSource();
    const isPublished = await ds.transaction(async (manager) => {
      await manager.getRepository(ExamSchema).update(
        { id: examId },
        {
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
        },
      );

      // Đồng bộ danh sách lớp gán
      await manager.getRepository(ExamClassSchema).delete({ exam_id: examId });
      const uniqueClassIds = Array.from(new Set(classIds ?? []));
      if (uniqueClassIds.length > 0) {
        await manager.getRepository(ExamClassSchema).insert(
          uniqueClassIds.map((cid) => ({
            exam_id: examId,
            class_id: cid,
          })),
        );
      }

      // Đồng bộ danh sách câu hỏi (exam_answer_keys có ON DELETE CASCADE từ exam_questions)
      await manager.getRepository(ExamQuestionSchema).delete({ exam_id: examId });

      const questionIds = Array.from(new Set(selectedQuestions.map((sq) => sq.questionId)));
      const sourceMap = await loadSourceQuestionMap(manager, questionIds);
      if (sourceMap.size > 0) {
        await snapshotExamQuestions(manager, examId, selectedQuestions, sourceMap);
      }

      if (publishImmediately) {
        return await publishExamInTransaction(manager, examId);
      }
      return false;
    });

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
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const [examRepo, roleRepo, examClassRepo, examQuestionRepo] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(UserRoleSchema),
    getRepo(ExamClassSchema),
    getRepo(ExamQuestionSchema),
  ]);

  const [exam, roleRecord, classCount, questionCount] = await Promise.all([
    examRepo.findOne({ where: { id: examId } }),
    roleRepo.findOne({ where: { user_id: user.id } }),
    examClassRepo.count({ where: { exam_id: examId } }),
    examQuestionRepo.count({ where: { exam_id: examId } }),
  ]);

  if (!exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi.' };
  }

  const isOwner = exam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền xuất bản đề thi này.' };
  }

  if (exam.status !== 'draft') {
    return { status: 'error', message: 'Đề thi này đã được xuất bản hoặc đã đóng.' };
  }

  if (classCount === 0) {
    return {
      status: 'error',
      message: 'Đề thi chưa được gán vào lớp học nào. Vui lòng bấm "Chỉnh sửa bản nháp" để chọn ít nhất 1 lớp học trước khi xuất bản.',
    };
  }

  if (questionCount === 0) {
    return {
      status: 'error',
      message: 'Đề thi chưa có câu hỏi nào. Vui lòng bấm "Chỉnh sửa bản nháp" để thêm câu hỏi từ ngân hàng trước khi xuất bản.',
    };
  }

  try {
    const nowIso = new Date().toISOString();
    await examRepo.update(
      { id: examId },
      { status: 'published', published_at: nowIso, updated_at: nowIso },
    );
  } catch (updateErr) {
    console.error('Lỗi xuất bản đề thi:', updateErr);
    return { status: 'error', message: 'Không thể xuất bản đề thi. Vui lòng thử lại.' };
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
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const [examRepo, roleRepo] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(UserRoleSchema),
  ]);

  const [exam, roleRecord] = await Promise.all([
    examRepo.findOne({ where: { id: examId } }),
    roleRepo.findOne({ where: { user_id: user.id } }),
  ]);

  if (!exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi cần xóa.' };
  }

  const isOwner = exam.created_by === user.id;
  const isAdmin = roleRecord?.role === 'admin';
  if (!isOwner && !isAdmin) {
    return { status: 'error', message: 'Bạn không có quyền xóa đề thi này.' };
  }

  if (exam.status !== 'draft') {
    return { status: 'error', message: 'Chỉ có thể xóa đề thi đang ở trạng thái Bản nháp.' };
  }

  try {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      await manager.getRepository(ExamClassSchema).delete({ exam_id: examId });
      await manager.getRepository(ExamQuestionSchema).delete({ exam_id: examId });
      await manager.getRepository(ExamSchema).delete({ id: examId });
    });
  } catch (delErr) {
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
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (!uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã đề thi không hợp lệ.' };
  }

  const [examRepo, roleRepo] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(UserRoleSchema),
  ]);

  const [exam, roleRecord] = await Promise.all([
    examRepo.findOne({ where: { id: examId } }),
    roleRepo.findOne({ where: { user_id: user.id } }),
  ]);

  if (!exam) {
    return { status: 'error', message: 'Không tìm thấy đề thi cần cập nhật.' };
  }

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

  try {
    await examRepo.update(
      { id: examId },
      {
        show_answers_after_submit: showAnswers,
        instructions: taggedInstructions,
        updated_at: new Date().toISOString(),
      },
    );
  } catch (err) {
    console.error('Lỗi cập nhật cấu hình xem đáp án:', err);
    return { status: 'error', message: 'Không thể cập nhật cấu hình xem đáp án.' };
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
