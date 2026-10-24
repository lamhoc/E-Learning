import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type EssayQuestionGradingItem = {
  questionId: string;
  position: number;
  questionText: string;
  points: number;
  modelAnswer: string | null;
  gradingRubric: string | null;
  explanation: string | null;
  studentAnswerText: string | null;
  currentAwardedPoints: number | null;
  currentFeedback: string | null;
  gradedAt: string | null;
};

export type MultipleChoiceSummaryItem = {
  questionId: string;
  position: number;
  questionText: string;
  points: number;
  correctOptionKey: string | null;
  studentSelectedOption: string | null;
  isCorrect: boolean;
  awardedPoints: number;
};

export type TeacherGradingPageData = {
  attemptId: string;
  examId: string;
  attemptNo: number;
  status: 'in_progress' | 'pending_grading' | 'completed' | 'voided';
  startedAt: string;
  submittedAt: string | null;
  student: {
    id: string;
    fullName: string;
    studentCode: string | null;
  };
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    subjectName: string;
    subjectCode: string;
  };
  teacherName: string;
  // Questions split by type
  essayQuestions: EssayQuestionGradingItem[];
  mcQuestions: MultipleChoiceSummaryItem[];
  // Score statistics
  mcAwardedScore: number;
  mcTotalScore: number;
  essayMaxScore: number;
  currentTotalScore: number | null;
  releasedAt: string | null;
  proctoring?: {
    tabSwitchCount: number;
    hasViolations: boolean;
  };
};

export async function getTeacherGradingData(attemptId: string): Promise<TeacherGradingPageData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !userRole || (userRole !== 'teacher' && userRole !== 'admin')) {
    redirect('/subjects');
  }

  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const teacherName = teacherProfile?.full_name ?? user.email ?? 'Giảng viên';

  // Use Admin Client if service role key is present, otherwise fall back to authenticated supabase client
  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  // 1. Fetch Attempt Record
  const { data: attempt, error: attemptError } = await adminClient
    .from('exam_attempts')
    .select(`
      id, exam_id, student_id, attempt_no, started_at, submitted_at, status,
      student:profiles!exam_attempts_student_id_fkey(id, full_name, student_code),
      exam:exams!exam_attempts_exam_id_fkey(
        id, title, duration_minutes,
        subject:subjects!exams_subject_id_fkey(name, code)
      )
    `)
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    console.error('Failed to load attempt for grading:', attemptError);
    redirect('/teacher/dashboard');
  }

  const examRecord = Array.isArray(attempt.exam) ? attempt.exam[0] : attempt.exam;
  const studentRecord = Array.isArray(attempt.student) ? attempt.student[0] : attempt.student;
  const subjectRecord = examRecord && typeof examRecord === 'object' && 'subject' in examRecord
    ? (Array.isArray(examRecord.subject) ? examRecord.subject[0] : examRecord.subject)
    : null;

  // 2. Fetch All Exam Questions
  const { data: rawQuestions } = await adminClient
    .from('exam_questions')
    .select('id, position, question_type, question_text, points')
    .eq('exam_id', attempt.exam_id)
    .order('position', { ascending: true });

  const questionList = rawQuestions ?? [];

  // 3. Fetch Answer Keys for this Exam
  const questionIds = questionList.map((q) => q.id);
  const { data: rawKeys } = await adminClient
    .from('exam_answer_keys')
    .select('exam_question_id, correct_option_key, model_answer, grading_rubric, explanation')
    .in('exam_question_id', questionIds);

  const keyMap = new Map((rawKeys ?? []).map((k) => [k.exam_question_id, k]));

  // 4. Fetch Student's Answers for this Attempt
  const { data: rawAnswers } = await adminClient
    .from('student_answers')
    .select('exam_question_id, selected_option, answer_text')
    .eq('attempt_id', attemptId);

  const answerMap = new Map((rawAnswers ?? []).map((a) => [a.exam_question_id, a]));

  // 5. Fetch Existing Grades for this Attempt
  const { data: rawGrades } = await adminClient
    .from('student_answer_grades')
    .select('exam_question_id, awarded_points, feedback, graded_at')
    .eq('attempt_id', attemptId);

  const gradeMap = new Map((rawGrades ?? []).map((g) => [g.exam_question_id, g]));

  // 6. Fetch Attempt Result
  const { data: result } = await adminClient
    .from('attempt_results')
    .select('total_score, released_at')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  // 7. Partition Essay vs Multiple Choice Questions
  const essayQuestions: EssayQuestionGradingItem[] = [];
  const mcQuestions: MultipleChoiceSummaryItem[] = [];

  let mcAwardedScore = 0;
  let mcTotalScore = 0;
  let essayMaxScore = 0;

  for (const q of questionList) {
    const qPoints = Number(q.points) || 1;
    const ansKey = keyMap.get(q.id);
    const studentAns = answerMap.get(q.id);
    const existingGrade = gradeMap.get(q.id);

    if (q.question_type === 'essay') {
      essayMaxScore += qPoints;
      essayQuestions.push({
        questionId: q.id,
        position: q.position,
        questionText: q.question_text,
        points: qPoints,
        modelAnswer: ansKey?.model_answer || null,
        gradingRubric: ansKey?.grading_rubric || null,
        explanation: ansKey?.explanation || null,
        studentAnswerText: studentAns?.answer_text || null,
        currentAwardedPoints: existingGrade ? Number(existingGrade.awarded_points) : null,
        currentFeedback: existingGrade?.feedback || null,
        gradedAt: existingGrade?.graded_at || null,
      });
    } else {
      mcTotalScore += qPoints;
      const correctKey = ansKey?.correct_option_key || null;
      const studentKey = studentAns?.selected_option || null;
      const isCorrect = Boolean(correctKey && studentKey && correctKey === studentKey);
      const awarded = existingGrade
        ? Number(existingGrade.awarded_points)
        : isCorrect
          ? qPoints
          : 0;

      mcAwardedScore += awarded;

      mcQuestions.push({
        questionId: q.id,
        position: q.position,
        questionText: q.question_text,
        points: qPoints,
        correctOptionKey: correctKey,
        studentSelectedOption: studentKey,
        isCorrect,
        awardedPoints: awarded,
      });
    }
  }

  // 6. Proctoring logs
  let proctoring = {
    tabSwitchCount: 0,
    hasViolations: false,
  };

  try {
    const { data: procLogs } = await adminClient
      .from('exam_proctoring_logs')
      .select('switch_count')
      .eq('attempt_id', attemptId)
      .order('switch_count', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (procLogs && typeof procLogs === 'object' && 'switch_count' in procLogs && procLogs.switch_count) {
      const count = Number(procLogs.switch_count);
      proctoring = {
        tabSwitchCount: count,
        hasViolations: count > 0,
      };
    } else {
      const { data: notifs } = await adminClient
        .from('notifications')
        .select('data')
        .eq('data->>type', 'exam_proctoring_violation')
        .eq('data->>attempt_id', attemptId);

      if (notifs && notifs.length > 0) {
        const counts = notifs.map((n) => Number((n.data as Record<string, unknown>)?.switch_count || 1));
        const maxCount = Math.max(...counts, 0);
        proctoring = {
          tabSwitchCount: maxCount,
          hasViolations: maxCount > 0,
        };
      }
    }
  } catch (procErr) {
    console.warn('Could not read proctoring logs:', procErr);
  }

  return {
    attemptId: attempt.id,
    examId: attempt.exam_id,
    attemptNo: attempt.attempt_no,
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    student: {
      id: studentRecord?.id || attempt.student_id,
      fullName: studentRecord?.full_name || 'Sinh viên',
      studentCode: studentRecord?.student_code ?? null,
    },
    exam: {
      id: examRecord?.id || attempt.exam_id,
      title: examRecord?.title || 'Đề thi',
      durationMinutes: examRecord?.duration_minutes || 45,
      subjectName: subjectRecord?.name || 'Môn học',
      subjectCode: subjectRecord?.code || '',
    },
    teacherName,
    essayQuestions,
    mcQuestions,
    mcAwardedScore,
    mcTotalScore,
    essayMaxScore,
    currentTotalScore: result ? Number(result.total_score) : null,
    releasedAt: result?.released_at ?? null,
    proctoring,
  };
}



export type TeacherGradingQueueItem = {
  attemptId: string;
  examId: string;
  attemptNo: number;
  status: 'pending_grading' | 'completed' | 'in_progress' | 'voided';
  submittedAt: string | null;
  studentName: string;
  studentCode: string | null;
  examTitle: string;
  subjectName: string;
  subjectCode: string;
  essayCount: number;
  totalScore: number | null;
  releasedAt: string | null;
  tabSwitchCount: number;
};

export type TeacherGradingQueueData = {
  teacherName: string;
  teacherId: string;
  pendingAttempts: TeacherGradingQueueItem[];
  completedAttempts: TeacherGradingQueueItem[];
  totalPendingCount: number;
  totalCompletedCount: number;
};

export async function getTeacherGradingQueue(): Promise<TeacherGradingQueueData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !userRole || (userRole !== 'teacher' && userRole !== 'admin')) {
    redirect('/subjects');
  }

  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const teacherName = teacherProfile?.full_name ?? user.email ?? 'Giảng viên';

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

  // 1. Lấy danh sách đề thi do giáo viên này tạo
  const { data: exams, error: examsError } = await adminClient
    .from('exams')
    .select(`
      id, title,
      subject:subjects(name, code),
      exam_questions(id, question_type)
    `)
    .eq('created_by', user.id);

  if (examsError || !exams || exams.length === 0) {
    return {
      teacherName,
      teacherId: user.id,
      pendingAttempts: [],
      completedAttempts: [],
      totalPendingCount: 0,
      totalCompletedCount: 0,
    };
  }

  // Lập bản đồ thông tin đề thi
  const examMap = new Map<string, {
    title: string;
    subjectName: string;
    subjectCode: string;
    essayCount: number;
  }>();

  for (const e of exams) {
    const questions = e.exam_questions ?? [];
    const essayCount = questions.filter((q) => q.question_type === 'essay').length;
    const subj = Array.isArray(e.subject) ? e.subject[0] : e.subject;
    examMap.set(e.id, {
      title: e.title,
      subjectName: subj?.name || 'Môn học',
      subjectCode: subj?.code || '',
      essayCount,
    });
  }

  const examIds = Array.from(examMap.keys());

  // 2. Lấy tất cả lượt thi của các đề này (pending_grading hoặc completed)
  const { data: rawAttempts, error: attemptsError } = await adminClient
    .from('exam_attempts')
    .select(`
      id, exam_id, student_id, attempt_no, status, submitted_at,
      student:profiles!exam_attempts_student_id_fkey(id, full_name, student_code),
      result:attempt_results(total_score, released_at)
    `)
    .in('exam_id', examIds)
    .in('status', ['pending_grading', 'completed'])
    .order('submitted_at', { ascending: false });

  if (attemptsError || !rawAttempts) {
    return {
      teacherName,
      teacherId: user.id,
      pendingAttempts: [],
      completedAttempts: [],
      totalPendingCount: 0,
      totalCompletedCount: 0,
    };
  }

  // 3. Lấy thông tin vi phạm tab switch proctoring nếu có
  const attemptIds = rawAttempts.map((a) => a.id);
  const proctoringMap = new Map<string, number>();

  if (attemptIds.length > 0) {
    try {
      const { data: procLogs } = await adminClient
        .from('exam_proctoring_logs')
        .select('attempt_id, switch_count')
        .in('attempt_id', attemptIds);

      if (procLogs) {
        for (const log of procLogs) {
          const current = proctoringMap.get(log.attempt_id) || 0;
          if (log.switch_count > current) {
            proctoringMap.set(log.attempt_id, log.switch_count);
          }
        }
      }
    } catch {
      // Bỏ qua nếu bảng proctoring logs chưa tồn tại
    }
  }

  const pendingAttempts: TeacherGradingQueueItem[] = [];
  const completedAttempts: TeacherGradingQueueItem[] = [];

  for (const a of rawAttempts) {
    const examInfo = examMap.get(a.exam_id);
    const student = Array.isArray(a.student) ? a.student[0] : a.student;
    const result = Array.isArray(a.result) ? a.result[0] : a.result;

    const item: TeacherGradingQueueItem = {
      attemptId: a.id,
      examId: a.exam_id,
      attemptNo: a.attempt_no,
      status: a.status as 'pending_grading' | 'completed',
      submittedAt: a.submitted_at,
      studentName: student?.full_name || 'Sinh viên',
      studentCode: student?.student_code || null,
      examTitle: examInfo?.title || 'Đề thi',
      subjectName: examInfo?.subjectName || 'Môn học',
      subjectCode: examInfo?.subjectCode || '',
      essayCount: examInfo?.essayCount || 0,
      totalScore: result ? Number(result.total_score) : null,
      releasedAt: result?.released_at || null,
      tabSwitchCount: proctoringMap.get(a.id) || 0,
    };

    if (a.status === 'pending_grading') {
      pendingAttempts.push(item);
    } else {
      completedAttempts.push(item);
    }
  }

  return {
    teacherName,
    teacherId: user.id,
    pendingAttempts,
    completedAttempts,
    totalPendingCount: pendingAttempts.length,
    totalCompletedCount: completedAttempts.length,
  };
}
