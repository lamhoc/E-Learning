'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Vui lòng đăng nhập để bắt đầu bài thi.' };
  }

  const adminClient = createAdminClient();

  // 1. Fetch Exam Detail
  const { data: exam, error: examError } = await adminClient
    .from('exams')
    .select('id, title, duration_minutes, max_attempts, available_from, available_until, status')
    .eq('id', examId)
    .maybeSingle();

  if (examError || !exam || exam.status !== 'published') {
    return { status: 'error', message: 'Đề thi hiện không khả dụng.' };
  }

  const now = Date.now();
  const startsAt = exam.available_from ? Date.parse(exam.available_from) : Number.NEGATIVE_INFINITY;
  const endsAtLimit = exam.available_until ? Date.parse(exam.available_until) : Number.POSITIVE_INFINITY;

  if (now < startsAt || now >= endsAtLimit) {
    return { status: 'error', message: 'Hiện không nằm trong khung giờ làm bài của đề thi.' };
  }

  // 2. Check Existing Attempts
  const { data: existingAttempts, error: attError } = await adminClient
    .from('exam_attempts')
    .select('id, attempt_no, started_at, ends_at, status')
    .eq('exam_id', examId)
    .eq('student_id', user.id)
    .order('attempt_no', { ascending: false });

  if (attError) {
    return { status: 'error', message: 'Không thể kiểm tra lịch sử thi.' };
  }

  const attempts = existingAttempts ?? [];

  // Check if an attempt is currently in_progress and not expired
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

  // Check remaining attempts
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

  // Cap ends_at by available_until if earlier
  if (exam.available_until) {
    const untilDate = new Date(exam.available_until);
    if (untilDate < calculatedEndsAt) {
      calculatedEndsAt = untilDate;
    }
  }

  // 3. Insert New Attempt Record
  const { data: newAttempt, error: insertError } = await adminClient
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      student_id: user.id,
      attempt_no: nextAttemptNo,
      started_at: startedAt.toISOString(),
      ends_at: calculatedEndsAt.toISOString(),
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (insertError || !newAttempt) {
    console.error('Failed to start exam attempt:', insertError);
    return { status: 'error', message: 'Không thể khởi tạo lượt thi mới. Hãy thử lại.' };
  }

  revalidatePath(`/student/exams/${examId}`);
  revalidatePath('/student/dashboard');

  return {
    status: 'success',
    message: 'Bắt đầu làm bài thi thành công.',
    attemptId: newAttempt.id,
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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const adminClient = createAdminClient();

  // Verify attempt validity
  const { data: attempt, error: attError } = await adminClient
    .from('exam_attempts')
    .select('id, ends_at, status, student_id')
    .eq('id', attemptId)
    .eq('exam_id', examId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (attError || !attempt || attempt.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi này không ở trạng thái làm bài.' };
  }

  if (Date.now() >= Date.parse(attempt.ends_at)) {
    return { status: 'error', message: 'Thời gian làm bài thi đã kết thúc.' };
  }

  // Upsert Answer
  const { error: upsertError } = await adminClient
    .from('student_answers')
    .upsert(
      {
        attempt_id: attemptId,
        exam_id: examId,
        exam_question_id: questionId,
        selected_option: answer.selectedOption ?? null,
        answer_text: answer.answerText ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'attempt_id,exam_question_id',
      },
    );

  if (upsertError) {
    console.error('Failed to save student answer:', upsertError);
    return { status: 'error', message: 'Không thể lưu câu trả lời.' };
  }

  return { status: 'success', message: 'Đã lưu đáp án.' };
}

export async function submitExamAttemptAction(
  attemptId: string,
  examId: string,
): Promise<SubmitAttemptResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const adminClient = createAdminClient();

  // 1. Verify Attempt & Fetch Exam Config (với Zero-Crash Fallback cho auto_grade_essay)
  let attemptRecord: {
    id: string;
    status: string;
    student_id: string;
    exam: unknown;
  } | null = null;

  const firstAttemptQuery = await adminClient
    .from('exam_attempts')
    .select('id, status, student_id, exam:exams(id, title, instructions, require_camera, auto_grade_essay)')
    .eq('id', attemptId)
    .eq('exam_id', examId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (firstAttemptQuery.error || !firstAttemptQuery.data) {
    const fallbackAttemptQuery = await adminClient
      .from('exam_attempts')
      .select('id, status, student_id, exam:exams(id, title, instructions, require_camera)')
      .eq('id', attemptId)
      .eq('exam_id', examId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (fallbackAttemptQuery.error || !fallbackAttemptQuery.data) {
      return { status: 'error', message: 'Lượt thi đã được nộp hoặc không thể nộp bài.' };
    }
    attemptRecord = fallbackAttemptQuery.data;
  } else {
    attemptRecord = firstAttemptQuery.data;
  }

  if (attemptRecord.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi đã được nộp hoặc không thể nộp bài.' };
  }

  const rawExam = attemptRecord.exam as
    | {
        id?: string;
        title?: string;
        instructions?: string | null;
        require_camera?: boolean | null;
        auto_grade_essay?: boolean | null;
      }
    | {
        id?: string;
        title?: string;
        instructions?: string | null;
        require_camera?: boolean | null;
        auto_grade_essay?: boolean | null;
      }[]
    | null;
  const examObj = Array.isArray(rawExam) ? rawExam[0] : rawExam;
  const autoGradeEssay = isAutoGradeEssay(examObj);

  // 2. Fetch Questions of Exam
  const { data: questions } = await adminClient
    .from('exam_questions')
    .select('id, question_type, points')
    .eq('exam_id', examId);

  const questionList = questions ?? [];
  const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
  const essayQuestions = questionList.filter((q) => q.question_type === 'essay');

  // 3. Fetch Answer Keys for Auto-Grading (MC & Essay)
  const { data: answerKeys } = await adminClient
    .from('exam_answer_keys')
    .select('exam_question_id, correct_option_key, model_answer, grading_rubric');

  const mcKeyMap: Record<string, string> = {};
  const essayKeyMap: Record<string, { model_answer?: string | null; grading_rubric?: string | null }> = {};

  (answerKeys ?? []).forEach((ak) => {
    if (ak.correct_option_key) {
      mcKeyMap[ak.exam_question_id] = ak.correct_option_key;
    }
    essayKeyMap[ak.exam_question_id] = {
      model_answer: ak.model_answer,
      grading_rubric: ak.grading_rubric,
    };
  });

  // 4. Fetch Student Answers
  const { data: answers } = await adminClient
    .from('student_answers')
    .select('exam_question_id, selected_option, answer_text')
    .eq('attempt_id', attemptId);

  const answerMap: Record<string, { selected_option?: string | null; answer_text?: string | null }> = {};
  (answers ?? []).forEach((ans) => {
    answerMap[ans.exam_question_id] = {
      selected_option: ans.selected_option,
      answer_text: ans.answer_text,
    };
  });

  // 5. Grade Multiple Choice Questions
  let totalMCScore = 0;
  const gradesToInsert: {
    attempt_id: string;
    exam_question_id: string;
    awarded_points: number;
    feedback: string;
    graded_at: string;
  }[] = [];

  for (const q of mcQuestions) {
    const studentAns = answerMap[q.id]?.selected_option;
    const correctKey = mcKeyMap[q.id];
    const isCorrect = Boolean(studentAns && correctKey && studentAns === correctKey);
    const awarded = isCorrect ? Number(q.points) : 0;
    totalMCScore += awarded;

    gradesToInsert.push({
      attempt_id: attemptId,
      exam_question_id: q.id,
      awarded_points: awarded,
      feedback: isCorrect ? 'Chính xác' : `Sai (Đáp án đúng: ${correctKey || 'N/A'})`,
      graded_at: new Date().toISOString(),
    });
  }

  // 6. Grade Essay Questions if Auto-Grade is enabled
  let totalEssayScore = 0;
  if (autoGradeEssay && essayQuestions.length > 0) {
    for (const q of essayQuestions) {
      const studentAnsText = answerMap[q.id]?.answer_text;
      const expectedObj = essayKeyMap[q.id];
      const expectedText = expectedObj?.model_answer || expectedObj?.grading_rubric || '';
      const isMatch = checkEssayAnswerMatch(studentAnsText, expectedText);
      const awarded = isMatch ? Number(q.points) : 0;
      totalEssayScore += awarded;

      gradesToInsert.push({
        attempt_id: attemptId,
        exam_question_id: q.id,
        awarded_points: awarded,
        feedback: isMatch
          ? 'Chính xác (Khớp với đáp án mẫu).'
          : 'Chưa chính xác (Không khớp với đáp án mẫu).',
        graded_at: new Date().toISOString(),
      });
    }
  }

  if (gradesToInsert.length > 0) {
    await adminClient.from('student_answer_grades').upsert(gradesToInsert, {
      onConflict: 'attempt_id,exam_question_id',
    });
  }

  // 7. Finalize Attempt Status & Compute Final Score
  const hasUnscoredEssay = essayQuestions.length > 0 && !autoGradeEssay;
  const isFullyGraded = !hasUnscoredEssay;
  const finalStatus = isFullyGraded ? 'completed' : 'pending_grading';
  const finalTotalScore = totalMCScore + totalEssayScore;

  const { error: updateAttemptErr } = await adminClient
    .from('exam_attempts')
    .update({
      submitted_at: new Date().toISOString(),
      status: finalStatus,
    })
    .eq('id', attemptId);

  if (updateAttemptErr) {
    console.error('Failed to submit attempt:', updateAttemptErr);
    return { status: 'error', message: 'Không thể cập nhật trạng thái nộp bài.' };
  }

  // If fully graded (100% Multiple Choice OR Auto-Graded Essays), release result immediately
  if (isFullyGraded) {
    await adminClient.from('attempt_results').upsert(
      {
        attempt_id: attemptId,
        total_score: finalTotalScore,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id' },
    );
  }

  // 8. Insert Notification for Student
  const examTitle = examObj?.title || 'Đề thi';
  try {
    await adminClient.from('notifications').insert({
      user_id: user.id,
      title: 'Đã nộp bài thi thành công',
      message: isFullyGraded
        ? `Bạn đã hoàn thành bài thi "${examTitle}". Điểm số đạt được: ${finalTotalScore} điểm${autoGradeEssay && essayQuestions.length > 0 ? ' (Đã tự động đối chiếu điểm trắc nghiệm & tự luận)' : ''}.`
        : `Bạn đã hoàn thành bài thi "${examTitle}". Điểm trắc nghiệm tạm tính: ${totalMCScore}. Bài tự luận đang chờ giảng viên chấm.`,
      data: { exam_id: examId, attempt_id: attemptId },
    });
  } catch (notifErr) {
    console.warn('Could not record notification:', notifErr);
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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const adminClient = createAdminClient();

  // 1. Kiểm tra lượt thi có thuộc sinh viên và đang in_progress không
  const { data: attempt, error: attemptError } = await adminClient
    .from('exam_attempts')
    .select('id, student_id, exam_id, status')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .eq('exam_id', examId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi không khả dụng để ghi log.' };
  }

  // 2. Thử ghi log vào bảng chuyên trách exam_proctoring_logs
  try {
    await adminClient.from('exam_proctoring_logs').insert({
      attempt_id: attemptId,
      exam_id: examId,
      student_id: user.id,
      violation_type: reason,
      switch_count: violationCount,
      details: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (logErr) {
    console.warn('Could not insert into exam_proctoring_logs, continuing with notification fallback:', logErr);
  }

  // 3. Ghi log bổ sung vào bảng notifications để đảm bảo luôn lưu vết bền vững
  try {
    await adminClient.from('notifications').insert({
      user_id: user.id,
      title: 'Cảnh báo vi phạm quy chế thi',
      message: `Thí sinh vi phạm lần thứ ${violationCount} (Lý do: ${{ tab_switch: 'Rời tab hoặc chuyển cửa sổ', fullscreen_exit: 'Thoát toàn màn hình', camera_blocked: 'Camera bị che khuất' }[reason] || reason}).`,
      data: {
        type: 'exam_proctoring_violation',
        attempt_id: attemptId,
        exam_id: examId,
        student_id: user.id,
        switch_count: violationCount,
        violated_at: new Date().toISOString(),
      },
    });
  } catch (notifErr) {
    console.warn('Could not record violation notification:', notifErr);
  }

  return { status: 'success', message: 'Đã lưu log vi phạm thành công.' };
}

