import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
  savedAnswers: Record<string, { selected_option?: 'A' | 'B' | 'C' | 'D' | null; answer_text?: string | null }>;
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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 1. Fetch Exam Detail
  const { data: examData, error: examError } = await supabase
    .from('exams')
    .select('id, title, instructions, duration_minutes, max_attempts, available_from, available_until, status, subject:subjects(id, name, code)')
    .eq('id', examId)
    .maybeSingle();

  if (examError || !examData) {
    redirect('/student/dashboard');
  }

  const subjectRecord = Array.isArray(examData.subject) ? examData.subject[0] : examData.subject;
  const exam: StudentExamDetail = {
    id: examData.id,
    title: examData.title,
    instructions: examData.instructions,
    duration_minutes: examData.duration_minutes,
    max_attempts: examData.max_attempts,
    available_from: examData.available_from,
    available_until: examData.available_until,
    status: examData.status,
    subject: subjectRecord ?? null,
  };

  // 2. Fetch User Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const studentName = profile?.full_name || user.email || 'Sinh viên';

  // 3. Fetch Questions of the Exam
  const { data: questionsData, error: qError } = await supabase
    .from('exam_questions')
    .select('id, position, question_type, question_text, options, points')
    .eq('exam_id', examId)
    .order('position', { ascending: true });

  const rawQuestions = (questionsData ?? []) as {
    id: string;
    position: number;
    question_type: 'multiple_choice' | 'essay';
    question_text: string;
    options: unknown;
    points: number | string;
  }[];

  const questions: StudentExamQuestion[] = rawQuestions.map((q) => {
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
      question_type: q.question_type,
      question_text: q.question_text,
      options: optionsList,
      points: Number(q.points) || 1,
    };
  });

  // 4. Fetch Attempts of this Student for this Exam
  const { data: attemptsData } = await supabase
    .from('exam_attempts')
    .select('id, attempt_no, started_at, ends_at, submitted_at, status, result:attempt_results(total_score, released_at)')
    .eq('exam_id', examId)
    .eq('student_id', user.id)
    .order('attempt_no', { ascending: false });

  const rawAttempts = (attemptsData ?? []) as {
    id: string;
    attempt_no: number;
    started_at: string;
    ends_at: string;
    submitted_at: string | null;
    status: 'in_progress' | 'pending_grading' | 'completed' | 'voided';
    result: { total_score: number | string; released_at: string | null } | { total_score: number | string; released_at: string | null }[] | null;
  }[];

  const attempts: AttemptHistoryItem[] = rawAttempts.map((att) => {
    const resultObj = Array.isArray(att.result) ? att.result[0] : att.result;
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

  // Check for any currently active in_progress attempt
  const now = Date.now();
  const currentActive = rawAttempts.find((att) => {
    if (att.status !== 'in_progress') return false;
    const ends = Date.parse(att.ends_at);
    return ends > now;
  });

  let activeAttempt: ActiveAttemptData | null = null;
  if (currentActive) {
    // Fetch saved answers for this attempt
    const { data: answersData } = await supabase
      .from('student_answers')
      .select('exam_question_id, selected_option, answer_text')
      .eq('attempt_id', currentActive.id);

    const savedMap: Record<string, { selected_option?: 'A' | 'B' | 'C' | 'D' | null; answer_text?: string | null }> = {};
    (answersData ?? []).forEach((ans) => {
      savedMap[ans.exam_question_id] = {
        selected_option: ans.selected_option as 'A' | 'B' | 'C' | 'D' | null,
        answer_text: ans.answer_text,
      };
    });

    activeAttempt = {
      id: currentActive.id,
      attempt_no: currentActive.attempt_no,
      started_at: currentActive.started_at,
      ends_at: currentActive.ends_at,
      status: 'in_progress',
      savedAnswers: savedMap,
    };
  }

  // Calculate timing & permissions
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
