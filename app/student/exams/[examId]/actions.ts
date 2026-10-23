'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // 1. Verify Attempt
  const { data: attempt, error: attError } = await adminClient
    .from('exam_attempts')
    .select('id, status, student_id, exam:exams(title)')
    .eq('id', attemptId)
    .eq('exam_id', examId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (attError || !attempt || attempt.status !== 'in_progress') {
    return { status: 'error', message: 'Lượt thi đã được nộp hoặc không thể nộp bài.' };
  }

  // 2. Fetch Questions of Exam
  const { data: questions } = await adminClient
    .from('exam_questions')
    .select('id, question_type, points')
    .eq('exam_id', examId);

  const questionList = questions ?? [];
  const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
  const essayQuestions = questionList.filter((q) => q.question_type === 'essay');

  // 3. Fetch Answer Keys for Multiple Choice Auto-Grading
  const { data: answerKeys } = await adminClient
    .from('exam_answer_keys')
    .select('exam_question_id, correct_option_key');

  const keyMap: Record<string, string> = {};
  (answerKeys ?? []).forEach((ak) => {
    if (ak.correct_option_key) {
      keyMap[ak.exam_question_id] = ak.correct_option_key;
    }
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
  const gradesToInsert = [];

  for (const q of mcQuestions) {
    const studentAns = answerMap[q.id]?.selected_option;
    const correctKey = keyMap[q.id];
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

  if (gradesToInsert.length > 0) {
    await adminClient.from('student_answer_grades').upsert(gradesToInsert, {
      onConflict: 'attempt_id,exam_question_id',
    });
  }

  // 6. Finalize Attempt Status
  const hasEssay = essayQuestions.length > 0;
  const finalStatus = hasEssay ? 'pending_grading' : 'completed';

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

  // If 100% Multiple Choice, release final result immediately
  if (!hasEssay) {
    await adminClient.from('attempt_results').upsert(
      {
        attempt_id: attemptId,
        total_score: totalMCScore,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id' },
    );
  }

  // 7. Insert Notification for Student
  const rawExam = attempt.exam as { title?: string } | { title?: string }[] | null;
  const examTitle = (Array.isArray(rawExam) ? rawExam[0]?.title : rawExam?.title) || 'Đề thi';
  try {
    await adminClient.from('notifications').insert({
      user_id: user.id,
      title: 'Đã nộp bài thi thành công',
      message: hasEssay
        ? `Bạn đã hoàn thành bài thi "${examTitle}". Điểm trắc nghiệm tạm tính: ${totalMCScore}. Bài tự luận đang chờ giảng viên chấm.`
        : `Bạn đã hoàn thành bài thi "${examTitle}". Điểm số đạt được: ${totalMCScore} điểm.`,
      data: { exam_id: examId, attempt_id: attemptId },
    });
  } catch (notifErr) {
    console.warn('Could not record notification:', notifErr);
  }

  revalidatePath(`/student/exams/${examId}`);
  revalidatePath('/student/dashboard');

  return {
    status: 'success',
    message: hasEssay
      ? 'Đã nộp bài thành công! Bài thi tự luận đang chờ giảng viên chấm.'
      : `Đã nộp bài thành công! Điểm của bạn: ${totalMCScore} điểm.`,
    totalScore: totalMCScore,
    isFullyGraded: !hasEssay,
  };
}
