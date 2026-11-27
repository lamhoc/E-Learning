'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { In } from 'typeorm';
import { getCurrentUser } from '@/lib/auth-cache';
import { getDataSource, getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ClassMembershipSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  ExamClassSchema,
  ExamProctoringLogSchema,
  ExamQuestionSchema,
  ExamSchema,
  NotificationSchema,
  StudentAnswerGradeSchema,
  StudentAnswerSchema,
  UserRoleSchema,
} from '@/lib/db/entities';
import { isAutoGradeEssay, checkEssayAnswerMatch } from '@/lib/exam-auto-grade';

export type StartAttemptResult = {
  status: 'success' | 'error';
  message: string;
  attemptId?: string;
};

export type SaveAnswerResult = {
  status: 'success' | 'error';
  message: string;
};

export type SubmitAttemptResult = {
  status: 'success' | 'error';
  message: string;
  totalScore?: number;
  isFullyGraded?: boolean;
};

export async function startOrResumeExamAttempt(examId: string): Promise<StartAttemptResult> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Vui lòng đăng nhập để bắt đầu bài thi.' };
  }

  const [examRepo, examClassRepo, membershipRepo, roleRepo, attemptRepo] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(ExamClassSchema),
    getRepo(ClassMembershipSchema),
    getRepo(UserRoleSchema),
    getRepo(ExamAttemptSchema),
  ]);

  const exam = await examRepo.findOne({ where: { id: examId } });
  if (!exam || exam.status !== 'published') {
    return { status: 'error', message: 'Đề thi hiện không khả dụng.' };
  }

  // Kiểm tra sinh viên có thuộc lớp được gán đề thi không
  const [roleRecord, examClasses] = await Promise.all([
    roleRepo.findOne({ where: { user_id: user.id } }),
    examClassRepo.find({ where: { exam_id: examId } }),
  ]);

  if (roleRecord?.role === 'student' && examClasses.length > 0) {
    const classIds = examClasses.map((ec) => ec.class_id);
    const membership = await membershipRepo.findOne({
      where: { student_id: user.id, class_id: In(classIds) },
    });
    if (!membership) {
      return { status: 'error', message: 'Bạn không thuộc lớp học được phân công làm đề thi này.' };
    }
  }

  const now = Date.now();
  const startsAt = exam.available_from ? Date.parse(exam.available_from) : Number.NEGATIVE_INFINITY;
  const endsAtLimit = exam.available_until ? Date.parse(exam.available_until) : Number.POSITIVE_INFINITY;

  if (now < startsAt || now >= endsAtLimit) {
    return { status: 'error', message: 'Hiện không nằm trong khung giờ làm bài của đề thi.' };
  }

  const attempts = await attemptRepo.find({
    where: { exam_id: examId, student_id: user.id },
    order: { attempt_no: 'DESC' },
  });

  const activeAttempt = attempts.find((att) => {
    if (att.status !== 'in_progress') return false;
    return Date.parse(att.ends_at) > now;
  });

  if (activeAttempt) {
    return {
      status: 'success',
      message: 'Tiếp tục lượt thi đang làm.',
      attemptId: activeAttempt.id,
    };
  }

  const validAttempts = attempts.filter((a) => a.status !== 'voided');
  if (validAttempts.length >= exam.max_attempts) {
    return {
      status: 'error',
      message: `Bạn đã sử dụng hết số lượt làm bài tối đa (${exam.max_attempts} lượt).`,
    };
  }

  const nextAttemptNo = validAttempts.length + 1;
  const startedAt = new Date();
  let calculatedEndsAt = new Date(startedAt.getTime() + exam.duration_minutes * 60 * 1000);

  if (exam.available_until) {
    const untilDate = new Date(exam.available_until);
    if (untilDate < calculatedEndsAt) {
      calculatedEndsAt = untilDate;
    }
  }

  const attemptId = randomUUID();
  try {
    await attemptRepo.insert({
      id: attemptId,
      exam_id: examId,
      student_id: user.id,
      attempt_no: nextAttemptNo,
      started_at: startedAt.toISOString(),
      ends_at: calculatedEndsAt.toISOString(),
      submitted_at: null,
      status: 'in_progress',
    });
  } catch (insertError) {
    console.error('Failed to start exam attempt:', insertError);
    return { status: 'error', message: 'Không thể khởi tạo lượt thi mới. Hãy thử lại.' };
  }

  revalidatePath(`/student/exams/${examId}`);
  revalidatePath('/student/dashboard');

  return {
    status: 'success',
    message: 'Bắt đầu làm bài thi thành công.',
    attemptId,
  };
}

export async function saveStudentAnswerAction(
  attemptId: string,
  examId: string,
  questionId: string,
  answer: {
    selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
    answerText?: string | null;
  },
): Promise<SaveAnswerResult> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const [attemptRepo, answerRepo] = await Promise.all([
    getRepo(ExamAttemptSchema),
    getRepo(StudentAnswerSchema),
  ]);

  const attempt = await attemptRepo.findOne({
    where: { id: attemptId, exam_id: examId, student_id: user.id },
  });

  if (!attempt || attempt.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi này không ở trạng thái làm bài.' };
  }

  if (Date.now() >= Date.parse(attempt.ends_at)) {
    return { status: 'error', message: 'Thời gian làm bài thi đã kết thúc.' };
  }

  const nowIso = new Date().toISOString();
  try {
    const existing = await answerRepo.findOne({
      where: { attempt_id: attemptId, exam_question_id: questionId },
    });

    if (existing) {
      await answerRepo.update(
        { id: existing.id },
        {
          selected_option: answer.selectedOption ?? null,
          answer_text: answer.answerText ?? null,
          updated_at: nowIso,
        },
      );
    } else {
      await answerRepo.insert({
        id: randomUUID(),
        attempt_id: attemptId,
        exam_id: examId,
        exam_question_id: questionId,
        selected_option: answer.selectedOption ?? null,
        answer_text: answer.answerText ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  } catch (upsertError) {
    console.error('Failed to save student answer:', upsertError);
    return { status: 'error', message: 'Không thể lưu câu trả lời.' };
  }

  return { status: 'success', message: 'Đã lưu đáp án.' };
}

export async function submitExamAttemptAction(
  attemptId: string,
  examId: string,
): Promise<SubmitAttemptResult> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const [attemptRepo, examRepo, questionRepo, keyRepo, answerRepo] = await Promise.all([
    getRepo(ExamAttemptSchema),
    getRepo(ExamSchema),
    getRepo(ExamQuestionSchema),
    getRepo(ExamAnswerKeySchema),
    getRepo(StudentAnswerSchema),
  ]);

  const [attemptRecord, examObj] = await Promise.all([
    attemptRepo.findOne({ where: { id: attemptId, exam_id: examId, student_id: user.id } }),
    examRepo.findOne({ where: { id: examId } }),
  ]);

  if (!attemptRecord || attemptRecord.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi đã được nộp hoặc không thể nộp bài.' };
  }

  const autoGradeEssay = isAutoGradeEssay(examObj);

  const [questionList, answers] = await Promise.all([
    questionRepo.find({ where: { exam_id: examId } }),
    answerRepo.find({ where: { attempt_id: attemptId } }),
  ]);

  const questionIds = questionList.map((q) => q.id);
  const answerKeys =
    questionIds.length > 0 ? await keyRepo.find({ where: { exam_question_id: In(questionIds) } }) : [];

  const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
  const essayQuestions = questionList.filter((q) => q.question_type === 'essay');

  const mcKeyMap: Record<string, string> = {};
  const essayKeyMap: Record<string, { model_answer?: string | null; grading_rubric?: string | null }> = {};

  for (const ak of answerKeys) {
    if (ak.correct_option_key) {
      mcKeyMap[ak.exam_question_id] = ak.correct_option_key;
    }
    essayKeyMap[ak.exam_question_id] = {
      model_answer: ak.model_answer,
      grading_rubric: ak.grading_rubric,
    };
  }

  const answerMap: Record<string, { selected_option?: string | null; answer_text?: string | null }> = {};
  for (const ans of answers) {
    answerMap[ans.exam_question_id] = {
      selected_option: ans.selected_option,
      answer_text: ans.answer_text,
    };
  }

  const nowIso = new Date().toISOString();
  let totalMCScore = 0;
  const gradesToSave: {
    attempt_id: string;
    exam_question_id: string;
    awarded_points: number;
    feedback: string;
    graded_by: string | null;
    graded_at: string;
  }[] = [];

  for (const q of mcQuestions) {
    const studentAns = answerMap[q.id]?.selected_option;
    const correctKey = mcKeyMap[q.id];
    const isCorrect = Boolean(studentAns && correctKey && studentAns === correctKey);
    const awarded = isCorrect ? Number(q.points) : 0;
    totalMCScore += awarded;

    gradesToSave.push({
      attempt_id: attemptId,
      exam_question_id: q.id,
      awarded_points: awarded,
      feedback: isCorrect ? 'Chính xác' : `Sai (Đáp án đúng: ${correctKey || 'N/A'})`,
      graded_by: null,
      graded_at: nowIso,
    });
  }

  let totalEssayScore = 0;
  if (autoGradeEssay && essayQuestions.length > 0) {
    for (const q of essayQuestions) {
      const studentAnsText = answerMap[q.id]?.answer_text;
      const expectedObj = essayKeyMap[q.id];
      const expectedText = expectedObj?.model_answer || expectedObj?.grading_rubric || '';
      const isMatch = checkEssayAnswerMatch(studentAnsText, expectedText);
      const awarded = isMatch ? Number(q.points) : 0;
      totalEssayScore += awarded;

      gradesToSave.push({
        attempt_id: attemptId,
        exam_question_id: q.id,
        awarded_points: awarded,
        feedback: isMatch
          ? 'Chính xác (Khớp với đáp án mẫu).'
          : 'Chưa chính xác (Không khớp với đáp án mẫu).',
        graded_by: null,
        graded_at: nowIso,
      });
    }
  }

  const hasUnscoredEssay = essayQuestions.length > 0 && !autoGradeEssay;
  const isFullyGraded = !hasUnscoredEssay;
  const finalStatus = isFullyGraded ? 'completed' : 'pending_grading';
  const finalTotalScore = Math.round((totalMCScore + totalEssayScore) * 100) / 100;
  const examTitle = examObj?.title || 'Đề thi';

  try {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      if (gradesToSave.length > 0) {
        await manager.getRepository(StudentAnswerGradeSchema).save(gradesToSave);
      }

      await manager.getRepository(ExamAttemptSchema).update(
        { id: attemptId },
        {
          submitted_at: nowIso,
          status: finalStatus,
        },
      );

      if (isFullyGraded) {
        await manager.getRepository(AttemptResultSchema).save({
          attempt_id: attemptId,
          total_score: finalTotalScore,
          released_at: nowIso,
          graded_by: null,
          updated_at: nowIso,
        });
      }

      await manager.getRepository(NotificationSchema).insert({
        user_id: user.id,
        title: 'Đã nộp bài thi thành công',
        message: isFullyGraded
          ? `Bạn đã hoàn thành bài thi "${examTitle}". Điểm số đạt được: ${finalTotalScore} điểm${autoGradeEssay && essayQuestions.length > 0 ? ' (Đã tự động đối chiếu điểm trắc nghiệm & tự luận)' : ''}.`
          : `Bạn đã hoàn thành bài thi "${examTitle}". Điểm trắc nghiệm tạm tính: ${totalMCScore}. Bài tự luận đang chờ giảng viên chấm.`,
        data: { exam_id: examId, attempt_id: attemptId },
        created_at: nowIso,
        read_at: null,
      });
    });
  } catch (err) {
    console.error('Failed to submit attempt:', err);
    return { status: 'error', message: 'Không thể cập nhật trạng thái nộp bài.' };
  }

  revalidatePath('/student/results');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/exams');
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath('/teacher/grading');

  return {
    status: 'success',
    message: isFullyGraded
      ? `Đã nộp bài thành công! Điểm của bạn: ${finalTotalScore} điểm.`
      : 'Đã nộp bài thành công! Bài thi tự luận đang chờ giảng viên chấm.',
    totalScore: isFullyGraded ? finalTotalScore : totalMCScore,
    isFullyGraded,
  };
}

export type LogViolationResult = {
  status: 'success' | 'error';
  message: string;
};

/**
 * Server Action ghi nhận vi phạm rời khỏi tab thi (hoặc mất focus) của sinh viên.
 */
export async function logExamTabViolationAction(
  attemptId: string,
  examId: string,
  violationCount: number,
  reason: string = 'tab_switch',
): Promise<LogViolationResult> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const [attemptRepo, procRepo, notifRepo] = await Promise.all([
    getRepo(ExamAttemptSchema),
    getRepo(ExamProctoringLogSchema),
    getRepo(NotificationSchema),
  ]);

  const attempt = await attemptRepo.findOne({
    where: { id: attemptId, student_id: user.id, exam_id: examId },
  });

  if (!attempt || attempt.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi không khả dụng để ghi log.' };
  }

  const nowIso = new Date().toISOString();

  try {
    await procRepo.insert({
      attempt_id: attemptId,
      exam_id: examId,
      student_id: user.id,
      violation_type: reason,
      switch_count: violationCount,
      details: { timestamp: nowIso },
      created_at: nowIso,
    });
  } catch (logErr) {
    console.warn('Could not insert into exam_proctoring_logs:', logErr);
  }

  try {
    const reasonText =
      {
        tab_switch: 'Rời tab hoặc chuyển cửa sổ',
        fullscreen_exit: 'Thoát toàn màn hình',
        camera_blocked: 'Camera bị che khuất',
      }[reason] || reason;

    await notifRepo.insert({
      user_id: user.id,
      title: 'Cảnh báo vi phạm quy chế thi',
      message: `Thí sinh vi phạm lần thứ ${violationCount} (Lý do: ${reasonText}).`,
      data: {
        type: 'exam_proctoring_violation',
        attempt_id: attemptId,
        exam_id: examId,
        student_id: user.id,
        switch_count: violationCount,
        violated_at: nowIso,
      },
      created_at: nowIso,
      read_at: null,
    });
  } catch (notifErr) {
    console.warn('Could not record violation notification:', notifErr);
  }

  return { status: 'success', message: 'Đã lưu log vi phạm thành công.' };
}
