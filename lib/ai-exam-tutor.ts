import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export class ExamTutorError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ExamTutorError';
  }
}

export async function authorizeReleasedAttempt(attemptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Failed to authenticate AI exam tutor request:', authError);
    throw new ExamTutorError('Không thể xác minh phiên đăng nhập.', 401);
  }
  if (!user) throw new ExamTutorError('Vui lòng đăng nhập để dùng gia sư AI.', 401);

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError) {
    console.error('Failed to load role for AI exam tutor:', roleError);
    throw new ExamTutorError('Không thể xác minh quyền tài khoản.', 500);
  }
  if (roleRecord?.role !== 'student') {
    throw new ExamTutorError('Tính năng này chỉ dành cho sinh viên.', 403);
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, student_id, status, exam:exams(title)')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (attemptError) {
    console.error('Failed to verify AI tutor attempt ownership:', attemptError);
    throw new ExamTutorError('Không thể tải lượt thi này.', 500);
  }
  if (!attempt) throw new ExamTutorError('Không tìm thấy lượt thi của bạn.', 404);

  const { data: result, error: resultError } = await supabase
    .from('attempt_results')
    .select('released_at')
    .eq('attempt_id', attemptId)
    .not('released_at', 'is', null)
    .maybeSingle();

  if (resultError) {
    console.error('Failed to verify released exam result for AI tutor:', resultError);
    throw new ExamTutorError('Không thể xác minh kết quả bài thi.', 500);
  }
  if (!result?.released_at || !['pending_grading', 'completed'].includes(attempt.status)) {
    throw new ExamTutorError('Gia sư AI sẽ khả dụng sau khi kết quả được công bố.', 403);
  }

  const exam = Array.isArray(attempt.exam) ? attempt.exam[0] : attempt.exam;

  return {
    supabase,
    user,
    attempt,
    examTitle: exam?.title ?? 'bài thi',
  };
}

type ExamQuestionRecord = {
  id: string;
  position: number;
  question_type: 'multiple_choice' | 'essay';
  question_text: string;
  options: unknown;
  points: number | string;
};

type AnswerKeyRecord = {
  exam_question_id: string;
  correct_option_key: string | null;
  model_answer: string | null;
  grading_rubric: string | null;
  explanation: string | null;
};

type StudentAnswerRecord = {
  exam_question_id: string;
  selected_option: string | null;
  answer_text: string | null;
};

type GradeRecord = {
  exam_question_id: string;
  awarded_points: number | string;
  feedback: string | null;
};

function parseOptions(value: unknown): { key: string; text: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((option) => {
    if (!option || typeof option !== 'object') return [];
    const item = option as Record<string, unknown>;
    if (typeof item.key !== 'string' || typeof item.text !== 'string') return [];
    return [{ key: item.key, text: item.text }];
  });
}

function trimContext(value: string | null | undefined, maxLength = 3000) {
  return value?.slice(0, maxLength) ?? null;
}

export async function getIncorrectQuestionContext(examId: string, attemptId: string) {
  const adminClient = createAdminClient();
  const { data: questions, error: questionsError } = await adminClient
    .from('exam_questions')
    .select('id, position, question_type, question_text, options, points')
    .eq('exam_id', examId)
    .order('position', { ascending: true });

  if (questionsError) {
    console.error('Failed to load exam questions for AI tutor:', questionsError);
    throw new ExamTutorError('Không thể tải câu hỏi của bài thi.', 500);
  }

  const questionList = (questions ?? []) as ExamQuestionRecord[];
  const questionIds = questionList.map((question) => question.id);
  if (questionIds.length === 0) return [];

  const [keysResult, answersResult, gradesResult] = await Promise.all([
    adminClient
      .from('exam_answer_keys')
      .select('exam_question_id, correct_option_key, model_answer, grading_rubric, explanation')
      .in('exam_question_id', questionIds),
    adminClient
      .from('student_answers')
      .select('exam_question_id, selected_option, answer_text')
      .eq('attempt_id', attemptId),
    adminClient
      .from('student_answer_grades')
      .select('exam_question_id, awarded_points, feedback')
      .eq('attempt_id', attemptId),
  ]);

  if (keysResult.error || answersResult.error || gradesResult.error) {
    console.error('Failed to load answer context for AI tutor:', {
      keys: keysResult.error,
      answers: answersResult.error,
      grades: gradesResult.error,
    });
    throw new ExamTutorError('Không thể tải đáp án và bài làm để giải thích.', 500);
  }

  const keys = new Map(
    ((keysResult.data ?? []) as AnswerKeyRecord[]).map((record) => [record.exam_question_id, record]),
  );
  const answers = new Map(
    ((answersResult.data ?? []) as StudentAnswerRecord[]).map((record) => [
      record.exam_question_id,
      record,
    ]),
  );
  const grades = new Map(
    ((gradesResult.data ?? []) as GradeRecord[]).map((record) => [
      record.exam_question_id,
      record,
    ]),
  );

  return questionList.flatMap((question) => {
    const key = keys.get(question.id);
    const answer = answers.get(question.id);
    const grade = grades.get(question.id);
    const options = parseOptions(question.options);
    const points = Number(question.points);
    let isIncorrect = false;
    let studentAnswer: string;
    let correctAnswer: string | null;

    if (question.question_type === 'multiple_choice') {
      const selectedOption = answer?.selected_option ?? null;
      const correctOption = key?.correct_option_key ?? null;
      isIncorrect = !selectedOption || !correctOption || selectedOption !== correctOption;
      studentAnswer = selectedOption
        ? `${selectedOption}. ${options.find((option) => option.key === selectedOption)?.text ?? ''}`.trim()
        : 'Không trả lời';
      correctAnswer = correctOption
        ? `${correctOption}. ${options.find((option) => option.key === correctOption)?.text ?? ''}`.trim()
        : null;
    } else {
      const awardedPoints = grade ? Number(grade.awarded_points) : 0;
      isIncorrect = !Number.isFinite(points) || awardedPoints < points;
      studentAnswer = answer?.answer_text?.trim() || 'Không trả lời';
      correctAnswer = key?.model_answer ?? null;
    }

    if (!isIncorrect) return [];

    return [
      {
        question: trimContext(question.question_text),
        type: question.question_type,
        options: options.map((option) => ({
          key: option.key,
          text: trimContext(option.text, 1000),
        })),
        studentAnswer: trimContext(studentAnswer),
        correctAnswer: trimContext(correctAnswer),
        rubric: trimContext(key?.grading_rubric),
        teacherFeedback: trimContext(grade?.feedback),
        awardedPoints: grade ? Number(grade.awarded_points) : null,
        maxPoints: points,
        explanation: trimContext(key?.explanation),
      },
    ];
  }).slice(0, 30);
}
