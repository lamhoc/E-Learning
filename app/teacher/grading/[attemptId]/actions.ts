'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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

// Zod Schema xác thực dữ liệu gửi lên Server Action
export const gradeItemSchema = z.object({
  questionId: z.string().uuid('ID câu hỏi không hợp lệ.'),
  awardedPoints: z.number().min(0, 'Điểm không được là số âm.'),
  feedback: z.string().max(2000, 'Nhận xét không được quá 2000 ký tự.').nullable().optional(),
});

export const saveEssayGradesSchema = z.object({
  attemptId: z.string().uuid('Mã lượt thi không hợp lệ.'),
  examId: z.string().uuid('Mã đề thi không hợp lệ.'),
  studentId: z.string().uuid('Mã sinh viên không hợp lệ.'),
  grades: z.array(gradeItemSchema).min(1, 'Danh sách điểm không được để trống.'),
  releaseResult: z.boolean(),
});

export async function saveEssayGradesAction(
  payload: SaveEssayGradesPayload
): Promise<SaveEssayGradesResult> {
  // 1. Xác thực schema với Zod trên máy chủ
  const parseResult = saveEssayGradesSchema.safeParse(payload);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => i.message).join(', ');
    return { status: 'error', message: `Dữ liệu không hợp lệ: ${errorMsg}` };
  }

  const { attemptId, examId, studentId, grades, releaseResult } = parseResult.data;

  // 2. Xác thực phiên đăng nhập & vai trò
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

  const adminClient = createAdminClient();

  // 3. Kiểm tra đề thi & điểm tối đa của từng câu hỏi
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

  // Xác thực điểm không vượt quá điểm tối đa của câu hỏi
  for (const item of grades) {
    const maxPoints = maxPointsMap.get(item.questionId) ?? 10;
    if (item.awardedPoints > maxPoints) {
      return {
        status: 'error',
        message: `Điểm chấm (${item.awardedPoints}) vượt quá điểm tối đa (${maxPoints}) của câu hỏi.`,
      };
    }
  }

  try {
    const nowIso = new Date().toISOString();

    // 4. Lưu câu trả lời & điểm số vào student_answer_grades
    for (const item of grades) {
      // Đảm bảo có bản ghi trong student_answers (khóa ngoại)
      await adminClient
        .from('student_answers')
        .upsert(
          {
            attempt_id: attemptId,
            exam_id: examId,
            exam_question_id: item.questionId,
            updated_at: nowIso,
          },
          { onConflict: 'attempt_id,exam_question_id' }
        );

      // Cập nhật/Insert vào bảng student_answer_grades
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
          { onConflict: 'attempt_id,exam_question_id' }
        );

      if (gradeErr) {
        console.error('Failed to save student_answer_grades:', gradeErr);
        return { status: 'error', message: 'Lỗi khi lưu điểm câu hỏi tự luận vào CSDL.' };
      }
    }

    // 5. Tính tổng điểm toàn bộ bài thi (Điểm trắc nghiệm + Điểm tự luận)
    const { data: allGrades } = await adminClient
      .from('student_answer_grades')
      .select('awarded_points')
      .eq('attempt_id', attemptId);

    const totalScore = (allGrades ?? []).reduce(
      (acc, g) => acc + (Number(g.awarded_points) || 0),
      0
    );
    const roundedTotalScore = Math.round(totalScore * 100) / 100;

    // 6. Cập nhật kết quả vào attempt_results và set released_at
    const { data: currentResult } = await adminClient
      .from('attempt_results')
      .select('released_at')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    const releasedAtValue = releaseResult ? nowIso : currentResult?.released_at || null;

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
        { onConflict: 'attempt_id' }
      );

    if (resultErr) {
      console.error('Failed to update attempt_results:', resultErr);
      return { status: 'error', message: 'Lỗi khi cập nhật tổng kết quả điểm bài thi.' };
    }

    // 7. Chốt trạng thái bài thi thành 'completed' khi công bố điểm
    if (releaseResult) {
      await adminClient
        .from('exam_attempts')
        .update({
          status: 'completed',
        })
        .eq('id', attemptId);

      // Gửi thông báo đến sinh viên
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
        ? `Đã chốt điểm và công bố kết quả bài thi thành công! Tổng điểm: ${roundedTotalScore} điểm.`
        : `Đã lưu tạm điểm số và nhận xét thành công! Tổng điểm hiện tại: ${roundedTotalScore} điểm.`,
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
