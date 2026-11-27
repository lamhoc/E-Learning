import { sanitizeVietnameseText } from '@/lib/utils';
import {
  isCameraRequired,
  cleanExamInstructions,
  isAutoGradeEssay,
  isShowAnswersAfterSubmit,
} from '@/lib/exam-auto-grade';
import 'server-only';

import { redirect } from 'next/navigation';
import { In } from 'typeorm';
import { getCurrentUser } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ExamAttemptSchema,
  ExamQuestionSchema,
  ExamSchema,
  ProfileSchema,
  StudentAnswerSchema,
  SubjectSchema,
} from '@/lib/db/entities';

export type ExamQuestionOption = {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type StudentExamQuestion = {
  id: string;
  position: number;
  question_type: 'multiple_choice' | 'essay';
  question_text: string;
  options: ExamQuestionOption[];
  points: number;
};

export type StudentExamDetail = {
  id: string;
  title: string;
  instructions: string | null;
  duration_minutes: number;
  max_attempts: number;
  available_from: string | null;
  available_until: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
  require_camera?: boolean;
  auto_grade_essay?: boolean;
  show_answers_after_submit?: boolean;
  subject: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type AttemptHistoryItem = {
  id: string;
  attempt_no: number;
  started_at: string;
  submitted_at: string | null;
  status: 'in_progress' | 'pending_grading' | 'completed' | 'voided';
  total_score: number | null;
  released_at: string | null;
};

export type ActiveAttemptData = {
  id: string;
  attempt_no: number;
  started_at: string;
  ends_at: string;
  status: 'in_progress';
  savedAnswers: Record<
    string,
    { selected_option?: 'A' | 'B' | 'C' | 'D' | null; answer_text?: string | null }
  >;
  tabSwitchCount?: number;
};

export type StudentExamPageData = {
  exam: StudentExamDetail;
  questions: StudentExamQuestion[];
  studentName: string;
  studentId: string;
  attempts: AttemptHistoryItem[];
  activeAttempt: ActiveAttemptData | null;
  canStartNewAttempt: boolean;
  remainingAttempts: number;
  isOpenNow: boolean;
};

export async function getStudentExamPageData(examId: string): Promise<StudentExamPageData> {
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login');
  }

  const [
    examRepo,
    subjectRepo,
    profileRepo,
    questionRepo,
    attemptRepo,
    resultRepo,
    answerRepo,
  ] = await Promise.all([
    getRepo(ExamSchema),
    getRepo(SubjectSchema),
    getRepo(ProfileSchema),
    getRepo(ExamQuestionSchema),
    getRepo(ExamAttemptSchema),
    getRepo(AttemptResultSchema),
    getRepo(StudentAnswerSchema),
  ]);

  const [rawExam, profile, rawQuestions, rawAttempts] = await Promise.all([
    examRepo.findOne({ where: { id: examId } }),
    profileRepo.findOne({ where: { id: user.id } }),
    questionRepo.find({
      where: { exam_id: examId },
      order: { position: 'ASC' },
    }),
    attemptRepo.find({
      where: { exam_id: examId, student_id: user.id },
      order: { attempt_no: 'DESC' },
    }),
  ]);

  if (!rawExam) {
    redirect('/student/dashboard');
  }

  const attemptIds = rawAttempts.map((a) => a.id);
  const [subjectRecord, results] = await Promise.all([
    subjectRepo.findOne({ where: { id: rawExam.subject_id } }),
    attemptIds.length > 0 ? resultRepo.find({ where: { attempt_id: In(attemptIds) } }) : Promise.resolve([]),
  ]);

  const exam: StudentExamDetail = {
    id: rawExam.id,
    title: rawExam.title,
    instructions: cleanExamInstructions(rawExam.instructions),
    duration_minutes: rawExam.duration_minutes,
    max_attempts: rawExam.max_attempts,
    available_from: rawExam.available_from,
    available_until: rawExam.available_until,
    status: rawExam.status,
    subject: subjectRecord
      ? { id: subjectRecord.id, name: subjectRecord.name, code: subjectRecord.code }
      : null,
    require_camera: isCameraRequired(rawExam),
    auto_grade_essay: isAutoGradeEssay(rawExam),
    show_answers_after_submit: isShowAnswersAfterSubmit(rawExam),
  };

  const studentName = sanitizeVietnameseText(profile?.full_name) || user.email || 'Sinh viên';

  const questions: StudentExamQuestion[] = rawQuestions.map((q) => {
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

  const resultMap = new Map(results.map((r) => [r.attempt_id, r]));

  const attempts: AttemptHistoryItem[] = rawAttempts.map((att) => {
    const resultObj = resultMap.get(att.id);
    return {
      id: att.id,
      attempt_no: att.attempt_no,
      started_at: att.started_at,
      submitted_at: att.submitted_at,
      status: att.status,
      total_score: resultObj?.total_score != null ? Number(resultObj.total_score) : null,
      released_at: resultObj?.released_at ?? null,
    };
  });

  const now = Date.now();
  const currentActive = rawAttempts.find((att) => {
    if (att.status !== 'in_progress') return false;
    return Date.parse(att.ends_at) > now;
  });

  let activeAttempt: ActiveAttemptData | null = null;
  if (currentActive) {
    const answersData = await answerRepo.find({ where: { attempt_id: currentActive.id } });
    const savedMap: Record<
      string,
      { selected_option?: 'A' | 'B' | 'C' | 'D' | null; answer_text?: string | null }
    > = {};

    for (const ans of answersData) {
      savedMap[ans.exam_question_id] = {
        selected_option: ans.selected_option as 'A' | 'B' | 'C' | 'D' | null,
        answer_text: ans.answer_text,
      };
    }

    activeAttempt = {
      id: currentActive.id,
      attempt_no: currentActive.attempt_no,
      started_at: currentActive.started_at,
      ends_at: currentActive.ends_at,
      status: 'in_progress',
      savedAnswers: savedMap,
      tabSwitchCount: 0,
    };
  }

  const startsAt = exam.available_from ? Date.parse(exam.available_from) : Number.NEGATIVE_INFINITY;
  const endsAt = exam.available_until ? Date.parse(exam.available_until) : Number.POSITIVE_INFINITY;
  const isOpenNow = startsAt <= now && now < endsAt && exam.status === 'published';

  const usedAttempts = attempts.filter((a) => a.status !== 'voided').length;
  const remainingAttempts = Math.max(0, exam.max_attempts - usedAttempts);
  const canStartNewAttempt = isOpenNow && remainingAttempts > 0 && !activeAttempt;

  return {
    exam,
    questions,
    studentName,
    studentId: user.id,
    attempts,
    activeAttempt,
    canStartNewAttempt,
    remainingAttempts,
    isOpenNow,
  };
}
