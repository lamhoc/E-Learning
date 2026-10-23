'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type GradeSubmissionItem = {
  questionId: string;
  awardedPoints: number;
  feedback?: string | null;
};

export type SaveEssayGradesPayload = {
  attemptId: string;
  examId: string;
  studentId: string;
  grades: GradeSubmissionItem[];
  releaseResult: boolean;
};

export type SaveEssayGradesResult = {
  status: 'success' | 'error';
  message: string;
  newTotalScore?: number;
  isReleased?: boolean;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function saveEssayGradesAction(
  payload: SaveEssayGradesPayload,
): Promise<SaveEssayGradesResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleRecord || (roleRecord.role !== 'teacher' && roleRecord.role !== 'admin')) {
    return { status: 'error', message: 'Bạn không có quyền chấm bài thi này.' };
  }

  const { attemptId, examId, studentId, grades, releaseResult } = payload;

  if (!uuidPattern.test(attemptId) || !uuidPattern.test(examId)) {
    return { status: 'error', message: 'Mã bài thi hoặc lượt thi không hợp lệ.' };
  }

  const adminClient = createAdminClient();

  // 1. Fetch Exam & Questions to validate points limit
  const { data: examData } = await adminClient
    .from('exams')
    .select('id, title')
    .eq('id', examId)
    .maybeSingle();

  const examTitle = examData?.title || 'Đề thi';

  const { data: examQuestions } = await adminClient
    .from('exam_questions')
    .select('id, points')
    .eq('exam_id', examId);

  const maxPointsMap = new Map((examQuestions ?? []).map((q) => [q.id, Number(q.points) || 1]));

  // Validate points range for each essay question
  for (const item of grades) {
    const maxPoints = maxPointsMap.get(item.questionId) ?? 10;
    if (item.awardedPoints < 0) {
      return { status: 'error', message: 'Điểm số không được là số âm.' };
    }
    if (item.awardedPoints > maxPoints) {
      return {
        status: 'error',
        message: `Điểm chấm (${item.awardedPoints}) vượt quá điểm tối đa (${maxPoints}) của câu hỏi.`,
      };
    }
  }

  try {
    const nowIso = new Date().toISOString();

    // 2. Ensure each essay question has a row in student_answers (foreign key constraint)
    for (const item of grades) {
      await adminClient
        .from('student_answers')
        .upsert(
          {
            attempt_id: attemptId,
            exam_id: examId,
            exam_question_id: item.questionId,
            updated_at: nowIso,
          },
          { onConflict: 'attempt_id,exam_question_id' },
        );

      // 3. Upsert into student_answer_grades
      const { error: gradeErr } = await adminClient
        .from('student_answer_grades')
        .upsert(
          {
            attempt_id: attemptId,
            exam_question_id: item.questionId,
            awarded_points: item.awardedPoints,
            feedback: item.feedback?.trim() || null,
            graded_by: user.id,
            graded_at: nowIso,
          },
          { onConflict: 'attempt_id,exam_question_id' },
        );

      if (gradeErr) {
        console.error('Failed to save student_answer_grades:', gradeErr);
        return { status: 'error', message: 'Lỗi khi lưu điểm câu hỏi tự luận.' };
      }
    }

    // 4. Calculate New Total Score from all questions (MC + Essay)
    const { data: allGrades } = await adminClient
      .from('student_answer_grades')
      .select('awarded_points')
      .eq('attempt_id', attemptId);

    const totalScore = (allGrades ?? []).reduce(
      (acc, g) => acc + (Number(g.awarded_points) || 0),
      0,
    );
    const roundedTotalScore = Math.round(totalScore * 100) / 100;

    // 5. Update or Create attempt_results
    const { data: currentResult } = await adminClient
      .from('attempt_results')
      .select('released_at')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    const releasedAtValue = releaseResult
      ? nowIso
      : currentResult?.released_at || null;

    const { error: resultErr } = await adminClient
      .from('attempt_results')
      .upsert(
        {
          attempt_id: attemptId,
          total_score: roundedTotalScore,
          released_at: releasedAtValue,
          graded_by: user.id,
          updated_at: nowIso,
        },
        { onConflict: 'attempt_id' },
      );

    if (resultErr) {
      console.error('Failed to update attempt_results:', resultErr);
      return { status: 'error', message: 'Lỗi khi cập nhật tổng điểm bài thi.' };
    }

    // 6. Update attempt status if released
    if (releaseResult) {
      await adminClient
        .from('exam_attempts')
        .update({
          status: 'completed',
        })
        .eq('id', attemptId);

      // 7. Send notification to student
      try {
        await adminClient.from('notifications').insert({
          user_id: studentId,
          title: 'Bài thi đã có kết quả chính thức',
          message: `Giảng viên đã hoàn thành chấm điểm bài thi "${examTitle}". Tổng điểm của bạn: ${roundedTotalScore} điểm.`,
          data: { exam_id: examId, attempt_id: attemptId, total_score: roundedTotalScore },
        });
      } catch (notifErr) {
        console.warn('Could not insert student grading notification:', notifErr);
      }
    }

    revalidatePath(`/teacher/grading/${attemptId}`);
    revalidatePath('/teacher/dashboard');
    revalidatePath(`/student/exams/${examId}`);
    revalidatePath('/student/dashboard');

    return {
      status: 'success',
      message: releaseResult
        ? `Đã chốt điểm và công bố kết quả thành công! Tổng điểm: ${roundedTotalScore} điểm.`
        : `Đã lưu tạm điểm thành công! Tổng điểm hiện tại: ${roundedTotalScore} điểm.`,
      newTotalScore: roundedTotalScore,
      isReleased: Boolean(releasedAtValue),
    };
  } catch (err) {
    console.error('saveEssayGradesAction error:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi chấm bài.',
    };
  }
}

