import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isShowAnswersAfterSubmit } from '@/lib/exam-auto-grade';
import { shuffleExamQuestions } from '@/lib/exam-shuffle';
import type { StudentExamQuestion, ExamQuestionOption } from '@/lib/student-exam';

export type AttemptReviewOption = {
  key: 'A' | 'B' | 'C' | 'D';
  displayKey: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type AttemptReviewQuestion = {
  questionNumber: number; // 1..N (theo thứ tự thí sinh đã làm)
  questionId: string;
  questionType: 'multiple_choice' | 'essay';
  questionText: string;
  options: AttemptReviewOption[];
  maxPoints: number;
  studentOption: 'A' | 'B' | 'C' | 'D' | null;
  studentText: string | null;
  awardedPoints: number | null;
  teacherFeedback: string | null;
  // Các trường chỉ trả về khi showAnswers === true:
  correctOption?: 'A' | 'B' | 'C' | 'D' | null;
  modelAnswer?: string | null;
  rubric?: string | null;
  explanation?: string | null;
  isCorrect?: boolean | null; // true = đúng, false = sai, null = chờ chấm / bỏ trống
};

export type AttemptReviewData = {
  attemptId: string;
  attemptNo: number;
  examTitle: string;
  subjectName: string;
  submittedAt: string | null;
  totalScore: number | null;
  showAnswers: boolean;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questions: AttemptReviewQuestion[];
};

export async function getStudentAttemptReviewData(
  attemptId: string
): Promise<{ status: 'success'; data: AttemptReviewData } | { status: 'error'; message: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // 1. Lấy thông tin lượt thi
    const { data: attempt, error: attemptErr } = await adminClient
      .from('exam_attempts')
      .select(`
        id, exam_id, attempt_no, student_id, submitted_at, status,
        exam:exams(
          id, title, instructions, show_answers_after_submit,
          subject:subjects(name)
        ),
        result:attempt_results(total_score, released_at)
      `)
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return { status: 'error', message: 'Không tìm thấy lượt làm bài thi này.' };
    }

    // Bảo mật: Thí sinh chỉ được xem bài làm của chính mình
    if (attempt.student_id !== user.id) {
      return { status: 'error', message: 'Bạn không có quyền truy cập bài làm của thí sinh khác.' };
    }

    const rawExam = Array.isArray(attempt.exam) ? attempt.exam[0] : attempt.exam;
    if (!rawExam) {
      return { status: 'error', message: 'Không tìm thấy dữ liệu đề thi gốc.' };
    }

    const rawSubject = rawExam.subject as unknown as { name: string } | { name: string }[] | null;
    const subjectName = Array.isArray(rawSubject)
      ? rawSubject[0]?.name || 'Môn học'
      : rawSubject?.name || 'Môn học';

    const showAnswers = isShowAnswersAfterSubmit(rawExam);

    // 2. Lấy toàn bộ câu hỏi của đề thi
    const { data: rawQuestionsData, error: qErr } = await adminClient
      .from('exam_questions')
      .select('id, position, question_type, question_text, options, points')
      .eq('exam_id', rawExam.id)
      .order('position', { ascending: true });

    if (qErr || !rawQuestionsData || rawQuestionsData.length === 0) {
      return { status: 'error', message: 'Không thể nạp danh sách câu hỏi của đề thi.' };
    }

    const parsedQuestions: StudentExamQuestion[] = rawQuestionsData.map((q) => {
      let optionsList: ExamQuestionOption[] = [];
      if (Array.isArray(q.options)) {
        optionsList = q.options.map((opt: unknown) => {
          if (typeof opt === 'object' && opt !== null) {
            const item = opt as Record<string, unknown>;
            return {
              key: (String(item.key || '').toUpperCase() as 'A' | 'B' | 'C' | 'D') || 'A',
              text: String(item.text || ''),
            };
          }
          return { key: 'A', text: String(opt) };
        });
      }

      return {
        id: q.id,
        position: q.position,
        question_type: q.question_type as 'multiple_choice' | 'essay',
        question_text: q.question_text,
        options: optionsList,
        points: Number(q.points) || 1,
      };
    });

    // 3. Tái lập đúng thứ tự câu hỏi và phương án A-B-C-D theo Seed Shuffle của attempt
    const shuffledQuestions = shuffleExamQuestions(parsedQuestions, attemptId);

    // 4. Lấy câu trả lời của học sinh
    const { data: rawAnswers } = await adminClient
      .from('student_answers')
      .select('exam_question_id, selected_option, answer_text')
      .eq('attempt_id', attemptId);

    const studentAnswerMap = new Map(
      (rawAnswers ?? []).map((ans) => [
        ans.exam_question_id,
        {
          selectedOption: ans.selected_option as 'A' | 'B' | 'C' | 'D' | null,
          answerText: ans.answer_text,
        },
      ])
    );

    // 5. Lấy điểm và feedback của từng câu
    const { data: rawGrades } = await adminClient
      .from('student_answer_grades')
      .select('exam_question_id, awarded_points, feedback')
      .eq('attempt_id', attemptId);

    const gradesMap = new Map(
      (rawGrades ?? []).map((g) => [
        g.exam_question_id,
        {
          awardedPoints: g.awarded_points !== null ? Number(g.awarded_points) : null,
          feedback: g.feedback || null,
        },
      ])
    );

    // 6. Nếu BẬT xem đáp án: Lấy bảng đáp án đúng
    let answerKeyMap = new Map<
      string,
      {
        correctOptionKey: 'A' | 'B' | 'C' | 'D' | null;
        modelAnswer: string | null;
        gradingRubric: string | null;
        explanation: string | null;
      }
    >();

    if (showAnswers) {
      const qIds = rawQuestionsData.map((q) => q.id);
      const { data: rawKeys } = await adminClient
        .from('exam_answer_keys')
        .select('exam_question_id, correct_option_key, model_answer, grading_rubric, explanation')
        .in('exam_question_id', qIds);

      if (rawKeys) {
        answerKeyMap = new Map(
          rawKeys.map((k) => [
            k.exam_question_id,
            {
              correctOptionKey: (k.correct_option_key?.toUpperCase() as 'A' | 'B' | 'C' | 'D') || null,
              modelAnswer: k.model_answer || null,
              gradingRubric: k.grading_rubric || null,
              explanation: k.explanation || null,
            },
          ])
        );
      }
    }

    // 7. Tổng hợp danh sách câu hỏi đối chiếu
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questions: AttemptReviewQuestion[] = shuffledQuestions.map((q, idx) => {
      const studentAns = studentAnswerMap.get(q.id);
      const grade = gradesMap.get(q.id);
      const key = answerKeyMap.get(q.id);

      const studentOption = studentAns?.selectedOption ?? null;
      const studentText = studentAns?.answerText ?? null;
      const awardedPoints = grade?.awardedPoints ?? null;
      const teacherFeedback = grade?.feedback ?? null;

      let isCorrect: boolean | null = null;

      if (q.question_type === 'multiple_choice') {
        const isAnswered = Boolean(studentOption);
        if (!isAnswered) {
          unansweredCount++;
          isCorrect = false;
        } else if (showAnswers && key) {
          if (key.correctOptionKey && studentOption === key.correctOptionKey) {
            isCorrect = true;
            correctCount++;
          } else {
            isCorrect = false;
            incorrectCount++;
          }
        }
      } else {
        // Tự luận
        const isAnswered = Boolean(studentText && studentText.trim());
        if (!isAnswered) {
          unansweredCount++;
          isCorrect = false;
        } else if (awardedPoints !== null) {
          if (awardedPoints >= q.points) {
            isCorrect = true;
            correctCount++;
          } else if (awardedPoints > 0) {
            isCorrect = true; // Một phần điểm
            correctCount++;
          } else {
            isCorrect = false;
            incorrectCount++;
          }
        }
      }

      const item: AttemptReviewQuestion = {
        questionNumber: idx + 1,
        questionId: q.id,
        questionType: q.question_type,
        questionText: q.question_text,
        options: q.options.map((opt) => ({
          key: opt.originalKey,
          displayKey: opt.displayKey,
          text: opt.text,
        })),
        maxPoints: q.points,
        studentOption,
        studentText,
        awardedPoints,
        teacherFeedback,
      };

      // Bảo mật Server-side: Chỉ gán đáp án và lời giải khi showAnswers === true
      if (showAnswers && key) {
        item.correctOption = key.correctOptionKey;
        item.modelAnswer = key.modelAnswer;
        item.rubric = key.gradingRubric;
        item.explanation = key.explanation;
        item.isCorrect = isCorrect;
      }

      return item;
    });

    const totalScore =
      attempt.result && attempt.result.length > 0 && attempt.result[0]?.total_score !== null
        ? Number(attempt.result[0].total_score)
        : null;

    return {
      status: 'success',
      data: {
        attemptId: attempt.id,
        attemptNo: attempt.attempt_no,
        examTitle: rawExam.title,
        subjectName,
        submittedAt: attempt.submitted_at,
        totalScore,
        showAnswers,
        totalQuestions: questions.length,
        correctCount,
        incorrectCount,
        unansweredCount,
        questions,
      },
    };
  } catch (err) {
    console.error('getStudentAttemptReviewData exception:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi tải bài thi.',
    };
  }
}
