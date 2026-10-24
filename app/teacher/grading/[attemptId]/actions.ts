'use server';

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
  awardedPoints: z.coerce.number().min(0, 'Điểm không được là số âm.'),
  feedback: z.string().max(2000, 'Nhận xét không được quá 2000 ký tự.').nullable().optional(),
});

export const saveEssayGradesSchema = z.object({
  attemptId: z.string().uuid('Mã lượt thi không hợp lệ.'),
  examId: z.string().uuid('Mã đề thi không hợp lệ.'),
  studentId: z.string().uuid('Mã sinh viên không hợp lệ.'),
  grades: z.array(gradeItemSchema).min(1, 'Danh sách điểm không được để trống.'),
  releaseResult: z.boolean(),
});

function getDbClient(supabase: Awaited<ReturnType<typeof createClient>>) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  }
  return supabase;
}

export async function saveEssayGradesAction(
  payload: SaveEssayGradesPayload
): Promise<SaveEssayGradesResult> {
  try {
    // 1. Xác thực schema với Zod trên máy chủ
    const parseResult = saveEssayGradesSchema.safeParse(payload);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(', ');
      return { status: 'error', message: `Dữ liệu không hợp lệ: ${errorMsg}` };
    }

    const { attemptId, examId, studentId, grades, releaseResult } = parseResult.data;

    // 2. Xác thực phiên đăng nhập & vai trò giảng viên
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

    const dbClient = getDbClient(supabase);

    // 3. Kiểm tra thông tin đề thi & điểm tối đa của từng câu hỏi
    const { data: examData } = await dbClient
      .from('exams')
      .select('id, title')
      .eq('id', examId)
      .maybeSingle();

    const examTitle = examData?.title || 'Đề thi';

    const { data: examQuestions } = await dbClient
      .from('exam_questions')
      .select('id, points, question_type')
      .eq('exam_id', examId);

    const questionList = examQuestions ?? [];
    const maxPointsMap = new Map(questionList.map((q) => [q.id, Number(q.points) || 1]));

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

    const nowIso = new Date().toISOString();

    // 4. Lưu câu trả lời & điểm số vào student_answer_grades
    for (const item of grades) {
      // Đảm bảo có bản ghi trong student_answers trước khi lưu student_answer_grades (tránh vi phạm FK)
      // Nếu đã có bản ghi, không ghi đè answer_text bài làm của sinh viên
      const { data: existingAnswer } = await dbClient
        .from('student_answers')
        .select('id')
        .eq('attempt_id', attemptId)
        .eq('exam_question_id', item.questionId)
        .maybeSingle();

      if (!existingAnswer) {
        const { error: insAnsErr } = await dbClient.from('student_answers').insert({
          attempt_id: attemptId,
          exam_id: examId,
          exam_question_id: item.questionId,
          answer_text: '',
          updated_at: nowIso,
        });
        if (insAnsErr) {
          console.warn('Notice inserting blank student_answer:', insAnsErr.message);
        }
      }

      // Cập nhật/Insert vào bảng student_answer_grades
      const { error: gradeErr } = await dbClient
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
        return { status: 'error', message: `Lỗi khi lưu điểm câu hỏi tự luận: ${gradeErr.message}` };
      }
    }

    // 5. Tính tổng điểm toàn bộ bài thi: Điểm trắc nghiệm + Điểm tự luận
    // a) Điểm trắc nghiệm (so sánh student_answers với exam_answer_keys)
    const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
    let mcAwardedScore = 0;

    if (mcQuestions.length > 0) {
      const mcIds = mcQuestions.map((q) => q.id);
      const [{ data: keys }, { data: answers }, { data: existingGrades }] = await Promise.all([
        dbClient.from('exam_answer_keys').select('exam_question_id, correct_option_key').in('exam_question_id', mcIds),
        dbClient.from('student_answers').select('exam_question_id, selected_option').eq('attempt_id', attemptId).in('exam_question_id', mcIds),
        dbClient.from('student_answer_grades').select('exam_question_id, awarded_points').eq('attempt_id', attemptId).in('exam_question_id', mcIds),
      ]);

      const keyMap = new Map((keys ?? []).map((k) => [k.exam_question_id, k.correct_option_key]));
      const ansMap = new Map((answers ?? []).map((a) => [a.exam_question_id, a.selected_option]));
      const gradeMap = new Map((existingGrades ?? []).map((g) => [g.exam_question_id, Number(g.awarded_points)]));

      for (const q of mcQuestions) {
        const qPoints = Number(q.points) || 1;
        if (gradeMap.has(q.id)) {
          mcAwardedScore += gradeMap.get(q.id)!;
        } else {
          const correctKey = keyMap.get(q.id);
          const studentKey = ansMap.get(q.id);
          if (correctKey && studentKey && correctKey === studentKey) {
            mcAwardedScore += qPoints;
          }
        }
      }
    }

    // b) Điểm tự luận từ danh sách điểm vừa chấm
    const essayScore = grades.reduce((sum, g) => sum + (Number(g.awardedPoints) || 0), 0);

    // c) Tổng điểm chuẩn xác
    const totalScore = Math.round((mcAwardedScore + essayScore) * 100) / 100;

    // 6. Cập nhật kết quả vào attempt_results và quản lý released_at
    const { data: currentResult } = await dbClient
      .from('attempt_results')
      .select('released_at')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    const releasedAtValue = releaseResult ? nowIso : currentResult?.released_at || null;

    const { error: resultErr } = await dbClient
      .from('attempt_results')
      .upsert(
        {
          attempt_id: attemptId,
          total_score: totalScore,
          released_at: releasedAtValue,
          graded_by: user.id,
          updated_at: nowIso,
        },
        { onConflict: 'attempt_id' }
      );

    if (resultErr) {
      console.error('Failed to update attempt_results:', resultErr);
      return { status: 'error', message: `Lỗi khi cập nhật kết quả bài thi: ${resultErr.message}` };
    }

    // 7. Chốt trạng thái bài thi thành 'completed' khi công bố điểm
    if (releaseResult) {
      await dbClient
        .from('exam_attempts')
        .update({
          status: 'completed',
        })
        .eq('id', attemptId);

      // Gửi thông báo đến sinh viên
      try {
        await dbClient.from('notifications').insert({
          user_id: studentId,
          title: 'Bài thi đã có kết quả chính thức',
          message: `Giảng viên đã hoàn thành chấm điểm bài thi "${examTitle}". Tổng điểm của bạn: ${totalScore} điểm.`,
          data: { exam_id: examId, attempt_id: attemptId, total_score: totalScore },
        });
      } catch (notifErr) {
        console.warn('Could not insert student grading notification:', notifErr);
      }
    }

    // Trả về kết quả JSON trực tiếp, không gọi revalidatePath để tránh kích hoạt
    // luồng re-render Server Component của Next.js có thể gây lỗi Minified React Error #441.
    // Client component sẽ nhận JSON và cập nhật trạng thái UI mượt mà.

    return {
      status: 'success',
      message: releaseResult
        ? `Đã chốt điểm và công bố kết quả bài thi thành công! Tổng điểm: ${totalScore} điểm.`
        : `Đã lưu tạm điểm số và nhận xét thành công! Tổng điểm hiện tại: ${totalScore} điểm.`,
      newTotalScore: totalScore,
      isReleased: Boolean(releasedAtValue),
    };
  } catch (err) {
    console.error('saveEssayGradesAction error:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi lưu điểm.',
    };
  }
}
