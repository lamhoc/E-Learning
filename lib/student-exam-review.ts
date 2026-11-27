import 'server-only';

import { In } from 'typeorm';
import { getCurrentUser } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  ExamQuestionSchema,
  ExamSchema,
  StudentAnswerGradeSchema,
  StudentAnswerSchema,
  SubjectSchema,
} from '@/lib/db/entities';
import { isShowAnswersAfterSubmit } from '@/lib/exam-auto-grade';
import { shuffleExamQuestions } from '@/lib/exam-shuffle';
import type { StudentExamQuestion, ExamQuestionOption } from '@/lib/student-exam';

export type AttemptReviewOption = {
  key: 'A' | 'B' | 'C' | 'D';
  displayKey: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type AttemptReviewQuestion = {
  questionNumber: number;
  questionId: string;
  questionType: 'multiple_choice' | 'essay';
  questionText: string;
  options: AttemptReviewOption[];
  maxPoints: number;
  studentOption: 'A' | 'B' | 'C' | 'D' | null;
  studentText: string | null;
  awardedPoints: number | null;
  teacherFeedback: string | null;
  correctOption?: 'A' | 'B' | 'C' | 'D' | null;
  modelAnswer?: string | null;
  rubric?: string | null;
  explanation?: string | null;
  isCorrect?: boolean | null;
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
  attemptId: string,
): Promise<{ status: 'success'; data: AttemptReviewData } | { status: 'error'; message: string }> {
  try {
    const { user, error: authErr } = await getCurrentUser();

    if (authErr || !user) {
      return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const [
      attemptRepo,
      examRepo,
      subjectRepo,
      resultRepo,
      questionRepo,
      answerRepo,
      gradeRepo,
      keyRepo,
    ] = await Promise.all([
      getRepo(ExamAttemptSchema),
      getRepo(ExamSchema),
      getRepo(SubjectSchema),
      getRepo(AttemptResultSchema),
      getRepo(ExamQuestionSchema),
      getRepo(StudentAnswerSchema),
      getRepo(StudentAnswerGradeSchema),
      getRepo(ExamAnswerKeySchema),
    ]);

    const attempt = await attemptRepo.findOne({ where: { id: attemptId } });
    if (!attempt) {
      return { status: 'error', message: 'Không tìm thấy lượt làm bài thi này.' };
    }

    if (attempt.student_id !== user.id) {
      return { status: 'error', message: 'Bạn không có quyền truy cập bài làm của thí sinh khác.' };
    }

    const [rawExam, resultRecord, rawQuestionsData, rawAnswers, rawGrades] = await Promise.all([
      examRepo.findOne({ where: { id: attempt.exam_id } }),
      resultRepo.findOne({ where: { attempt_id: attemptId } }),
      questionRepo.find({ where: { exam_id: attempt.exam_id }, order: { position: 'ASC' } }),
      answerRepo.find({ where: { attempt_id: attemptId } }),
      gradeRepo.find({ where: { attempt_id: attemptId } }),
    ]);

    if (!rawExam) {
      return { status: 'error', message: 'Không tìm thấy dữ liệu đề thi gốc.' };
    }

    if (rawQuestionsData.length === 0) {
      return { status: 'error', message: 'Không thể nạp danh sách câu hỏi của đề thi.' };
    }

    const showAnswers = isShowAnswersAfterSubmit(rawExam);
    const qIds = rawQuestionsData.map((q) => q.id);

    const [subjectRecord, rawKeys] = await Promise.all([
      subjectRepo.findOne({ where: { id: rawExam.subject_id } }),
      showAnswers ? keyRepo.find({ where: { exam_question_id: In(qIds) } }) : Promise.resolve([]),
    ]);

    const subjectName = subjectRecord?.name || 'Môn học';

    const parsedQuestions: StudentExamQuestion[] = rawQuestionsData.map((q) => {
      let optionsList: ExamQuestionOption[] = [];
      if (Array.isArray(q.options)) {
        optionsList = q.options.map((opt) => ({
          key: (String(opt.key || '').toUpperCase() as 'A' | 'B' | 'C' | 'D') || 'A',
          text: String(opt.text || ''),
        }));
      }

      return {
        id: q.id,
        position: q.position,
        question_type: q.question_type,
        question_text: q.question_text,
        options: optionsList,
        points: Number(q.points) || 1,
      };
    });

    const shuffledQuestions = shuffleExamQuestions(parsedQuestions, attemptId);

    const studentAnswerMap = new Map(
      rawAnswers.map((ans) => [
        ans.exam_question_id,
        {
          selectedOption: ans.selected_option as 'A' | 'B' | 'C' | 'D' | null,
          answerText: ans.answer_text,
        },
      ]),
    );

    const gradesMap = new Map(
      rawGrades.map((g) => [
        g.exam_question_id,
        {
          awardedPoints: g.awarded_points !== null ? Number(g.awarded_points) : null,
          feedback: g.feedback || null,
        },
      ]),
    );

    const answerKeyMap = new Map(
      rawKeys.map((k) => [
        k.exam_question_id,
        {
          correctOptionKey: (k.correct_option_key?.toUpperCase() as 'A' | 'B' | 'C' | 'D') || null,
          modelAnswer: k.model_answer || null,
          gradingRubric: k.grading_rubric || null,
          explanation: k.explanation || null,
        },
      ]),
    );

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
        const isAnswered = Boolean(studentText && studentText.trim());
        if (!isAnswered) {
          unansweredCount++;
          isCorrect = false;
        } else if (awardedPoints !== null) {
          if (awardedPoints >= q.points || awardedPoints > 0) {
            isCorrect = true;
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
      resultRecord && resultRecord.total_score !== null ? Number(resultRecord.total_score) : null;

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
