import 'server-only';

import { In, IsNull, Not } from 'typeorm';
import { getCurrentUser, getCurrentRoleRecord } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  ExamQuestionSchema,
  ExamSchema,
  StudentAnswerGradeSchema,
  StudentAnswerSchema,
} from '@/lib/db/entities';

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
  const { user, error: authError } = await getCurrentUser();

  if (authError) {
    console.error('Failed to authenticate AI exam tutor request:', authError);
    throw new ExamTutorError('Không thể xác minh phiên đăng nhập.', 401);
  }
  if (!user) throw new ExamTutorError('Vui lòng đăng nhập để dùng gia sư AI.', 401);

  const { data: roleRecord, error: roleError } = await getCurrentRoleRecord();

  if (roleError) {
    console.error('Failed to load role for AI exam tutor:', roleError);
    throw new ExamTutorError('Không thể xác minh quyền tài khoản.', 500);
  }
  if (roleRecord?.role !== 'student') {
    throw new ExamTutorError('Tính năng này chỉ dành cho sinh viên.', 403);
  }

  const [attemptRepo, examRepo, resultRepo] = await Promise.all([
    getRepo(ExamAttemptSchema),
    getRepo(ExamSchema),
    getRepo(AttemptResultSchema),
  ]);

  const attempt = await attemptRepo.findOne({
    where: { id: attemptId, student_id: user.id },
  });

  if (!attempt) throw new ExamTutorError('Không tìm thấy lượt thi của bạn.', 404);

  const [exam, result] = await Promise.all([
    examRepo.findOne({ where: { id: attempt.exam_id } }),
    resultRepo.findOne({ where: { attempt_id: attemptId, released_at: Not(IsNull()) } }),
  ]);

  if (!result?.released_at || !['pending_grading', 'completed'].includes(attempt.status)) {
    throw new ExamTutorError('Gia sư AI sẽ khả dụng sau khi kết quả được công bố.', 403);
  }

  return {
    user,
    attempt,
    examTitle: exam?.title ?? 'bài thi',
  };
}

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
  const [questionRepo, keyRepo, answerRepo, gradeRepo] = await Promise.all([
    getRepo(ExamQuestionSchema),
    getRepo(ExamAnswerKeySchema),
    getRepo(StudentAnswerSchema),
    getRepo(StudentAnswerGradeSchema),
  ]);

  const questionList = await questionRepo.find({
    where: { exam_id: examId },
    order: { position: 'ASC' },
  });

  const questionIds = questionList.map((question) => question.id);
  if (questionIds.length === 0) return [];

  const [keysData, answersData, gradesData] = await Promise.all([
    keyRepo.find({ where: { exam_question_id: In(questionIds) } }),
    answerRepo.find({ where: { attempt_id: attemptId } }),
    gradeRepo.find({ where: { attempt_id: attemptId } }),
  ]);

  const keys = new Map(keysData.map((record) => [record.exam_question_id, record]));
  const answers = new Map(answersData.map((record) => [record.exam_question_id, record]));
  const grades = new Map(gradesData.map((record) => [record.exam_question_id, record]));

  return questionList
    .flatMap((question) => {
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
    })
    .slice(0, 30);
}
