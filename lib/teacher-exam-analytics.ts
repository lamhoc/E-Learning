import 'server-only';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type ExamScoreDistributionItem = {
  range: string;
  label: string;
  count: number;
  percentage: number;
  fillColor: string;
};

export type StudentExamResultItem = {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  studentEmail: string;
  attemptNo: number;
  mcScore: number;
  essayScore: number;
  totalScore: number;
  isPassed: boolean;
  submittedAt: string | null;
  releasedAt: string;
};

export type TeacherExamAnalyticsData = {
  teacherName: string;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    status: string;
    createdAt: string;
    subjectName: string;
    subjectCode: string;
    classes: string[];
    totalQuestions: number;
    mcCount: number;
    essayCount: number;
    maxScore: number;
  };
  metrics: {
    totalGraded: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    passedCount: number;
  };
  distribution: ExamScoreDistributionItem[];
  studentResults: StudentExamResultItem[];
};

export async function getTeacherExamAnalytics(examId: string): Promise<TeacherExamAnalyticsData> {
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

  const adminClient = createAdminClient();

  // 1. Lấy thông tin chi tiết đề thi
  const { data: examRecord, error: examError } = await adminClient
    .from('exams')
    .select(`
      id, title, duration_minutes, status, created_at, created_by,
      subject:subjects(id, name, code),
      exam_classes(
        class:classes(id, name)
      )
    `)
    .eq('id', examId)
    .maybeSingle();

  if (examError || !examRecord) {
    console.error('Failed to load exam for analytics:', examError);
    redirect('/teacher/dashboard');
  }

  // Nếu là giáo viên, kiểm tra quyền quản lý đề
  if (userRole === 'teacher' && examRecord.created_by !== user.id) {
    const { data: assignment } = await adminClient
      .from('teacher_subject_assignments')
      .select('teacher_id')
      .eq('teacher_id', user.id)
      .eq('subject_id', (examRecord.subject as unknown as { id: string })?.id)
      .maybeSingle();

    if (!assignment) {
      redirect('/teacher/dashboard');
    }
  }

  const rawSubject = examRecord.subject as unknown as
    | { id: string; name: string; code: string }
    | Array<{ id: string; name: string; code: string }>
    | null;
  const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;

  const rawClasses = examRecord.exam_classes as unknown as Array<{
    class: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }> | null;

  const classes = (rawClasses ?? []).flatMap((ec) => {
    const c = ec.class;
    if (!c) return [];
    if (Array.isArray(c)) {
      return c.map((item) => item?.name).filter(Boolean) as string[];
    }
    return typeof c === 'object' && 'name' in c && c.name ? [c.name] : [];
  });

  // 2. Lấy danh sách câu hỏi trong đề
  const { data: rawQuestions } = await adminClient
    .from('exam_questions')
    .select('id, position, question_type, points')
    .eq('exam_id', examId)
    .order('position', { ascending: true });

  const questionList = rawQuestions ?? [];
  const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
  const essayQuestions = questionList.filter((q) => q.question_type === 'essay');
  const maxScore = questionList.reduce((acc, q) => acc + Number(q.points || 0), 0);

  // 3. Lấy đáp án đúng cho các câu trắc nghiệm
  const mcQuestionIds = mcQuestions.map((q) => q.id);
  const { data: rawAnswerKeys } = mcQuestionIds.length
    ? await adminClient
        .from('exam_answer_keys')
        .select('exam_question_id, correct_option_key')
        .in('exam_question_id', mcQuestionIds)
    : { data: [] };

  const correctKeyMap = new Map(
    (rawAnswerKeys ?? []).map((k) => [k.exam_question_id, k.correct_option_key]),
  );

  // 4. Lấy tất cả lượt thi của đề
  const { data: rawAttempts } = await adminClient
    .from('exam_attempts')
    .select(`
      id, student_id, attempt_no, submitted_at, status,
      student:profiles(id, full_name, student_code)
    `)
    .eq('exam_id', examId);

  const attemptList = rawAttempts ?? [];
  const attemptIds = attemptList.map((a) => a.id);

  if (attemptIds.length === 0) {
    return {
      teacherName,
      exam: {
        id: examRecord.id,
        title: examRecord.title,
        durationMinutes: examRecord.duration_minutes,
        status: examRecord.status,
        createdAt: examRecord.created_at,
        subjectName: subject?.name ?? 'Môn học',
        subjectCode: subject?.code ?? 'MH',
        classes,
        totalQuestions: questionList.length,
        mcCount: mcQuestions.length,
        essayCount: essayQuestions.length,
        maxScore,
      },
      metrics: {
        totalGraded: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        passedCount: 0,
      },
      distribution: [
        { range: '0 - 2', label: '0 - 2.9 (Kém)', count: 0, percentage: 0, fillColor: '#f43f5e' },
        { range: '3 - 4', label: '3.0 - 4.9 (Yếu)', count: 0, percentage: 0, fillColor: '#f59e0b' },
        { range: '5 - 6', label: '5.0 - 6.9 (Trung bình)', count: 0, percentage: 0, fillColor: '#0ea5e9' },
        { range: '7 - 8', label: '7.0 - 8.9 (Khá)', count: 0, percentage: 0, fillColor: '#10b981' },
        { range: '9 - 10', label: '9.0 - 10 (Giỏi)', count: 0, percentage: 0, fillColor: '#17372e' },
      ],
      studentResults: [],
    };
  }

  // 5. Lấy kết quả đã chấm (released_at is not null)
  const { data: rawResults } = await adminClient
    .from('attempt_results')
    .select('attempt_id, total_score, released_at')
    .in('attempt_id', attemptIds)
    .not('released_at', 'is', null);

  const releasedResultMap = new Map((rawResults ?? []).map((r) => [r.attempt_id, r]));

  // Lọc chỉ các lượt thi đã có kết quả công bố
  const gradedAttempts = attemptList.filter((a) => releasedResultMap.has(a.id));
  const gradedAttemptIds = gradedAttempts.map((a) => a.id);

  // 6. Lấy câu trả lời và điểm số chi tiết từng câu của các lượt thi đã chấm
  const [answersRes, gradesRes, authUsersRes] = await Promise.all([
    gradedAttemptIds.length && mcQuestionIds.length
      ? adminClient
          .from('student_answers')
          .select('attempt_id, exam_question_id, selected_option')
          .in('attempt_id', gradedAttemptIds)
          .in('exam_question_id', mcQuestionIds)
      : { data: [] },
    gradedAttemptIds.length && essayQuestions.length
      ? adminClient
          .from('student_answer_grades')
          .select('attempt_id, exam_question_id, awarded_points')
          .in('attempt_id', gradedAttemptIds)
      : { data: [] },
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const authEmailMap = new Map((authUsersRes.data?.users ?? []).map((u) => [u.id, u.email ?? '']));

  // Gom câu trả lời trắc nghiệm theo attemptId
  const answersByAttempt = new Map<string, Array<{ exam_question_id: string; selected_option: string | null }>>();
  for (const ans of answersRes.data ?? []) {
    const list = answersByAttempt.get(ans.attempt_id) || [];
    list.push(ans);
    answersByAttempt.set(ans.attempt_id, list);
  }

  // Gom điểm tự luận theo attemptId
  const essayGradesByAttempt = new Map<string, Array<{ exam_question_id: string; awarded_points: number }>>();
  for (const grade of gradesRes.data ?? []) {
    const list = essayGradesByAttempt.get(grade.attempt_id) || [];
    list.push({
      exam_question_id: grade.exam_question_id,
      awarded_points: Number(grade.awarded_points || 0),
    });
    essayGradesByAttempt.set(grade.attempt_id, list);
  }

  // Tính điểm trắc nghiệm và tự luận cho từng lượt thi
  const questionPointMap = new Map(questionList.map((q) => [q.id, Number(q.points || 0)]));

  const studentResults: StudentExamResultItem[] = gradedAttempts.map((attempt) => {
    const result = releasedResultMap.get(attempt.id)!;
    const student = Array.isArray(attempt.student) ? attempt.student[0] : attempt.student;

    // Tính điểm trắc nghiệm
    const studentAnswers = answersByAttempt.get(attempt.id) || [];
    let mcScore = 0;
    for (const ans of studentAnswers) {
      const correctKey = correctKeyMap.get(ans.exam_question_id);
      if (ans.selected_option && correctKey && ans.selected_option === correctKey) {
        mcScore += questionPointMap.get(ans.exam_question_id) || 0;
      }
    }

    // Tính điểm tự luận
    const essayGrades = essayGradesByAttempt.get(attempt.id) || [];
    const essayScore = essayGrades.reduce((acc, g) => acc + g.awarded_points, 0);

    const totalScore = Number(result.total_score || 0);

    return {
      attemptId: attempt.id,
      studentId: attempt.student_id,
      studentName: student?.full_name || 'Sinh viên',
      studentCode: student?.student_code || null,
      studentEmail: authEmailMap.get(attempt.student_id) || 'Chưa xác thực email',
      attemptNo: attempt.attempt_no,
      mcScore: Number(mcScore.toFixed(2)),
      essayScore: Number(essayScore.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      isPassed: totalScore >= 5.0,
      submittedAt: attempt.submitted_at,
      releasedAt: result.released_at,
    };
  });

  // 7. Thống kê tổng hợp
  const totalGraded = studentResults.length;
  const scores = studentResults.map((r) => r.totalScore);
  const averageScore = totalGraded ? Number((scores.reduce((a, b) => a + b, 0) / totalGraded).toFixed(2)) : 0;
  const highestScore = totalGraded ? Math.max(...scores) : 0;
  const lowestScore = totalGraded ? Math.min(...scores) : 0;
  const passedCount = studentResults.filter((r) => r.isPassed).length;
  const passRate = totalGraded ? Number(((passedCount / totalGraded) * 100).toFixed(1)) : 0;

  // 8. Phân bố phổ điểm 5 khoảng: 0-2, 3-4, 5-6, 7-8, 9-10
  let bucket02 = 0;
  let bucket34 = 0;
  let bucket56 = 0;
  let bucket78 = 0;
  let bucket910 = 0;

  for (const score of scores) {
    if (score < 3.0) {
      bucket02++;
    } else if (score < 5.0) {
      bucket34++;
    } else if (score < 7.0) {
      bucket56++;
    } else if (score < 9.0) {
      bucket78++;
    } else {
      bucket910++;
    }
  }

  const calcPct = (count: number) => (totalGraded ? Number(((count / totalGraded) * 100).toFixed(1)) : 0);

  const distribution: ExamScoreDistributionItem[] = [
    {
      range: '0 - 2',
      label: '0 - 2.9 (Kém)',
      count: bucket02,
      percentage: calcPct(bucket02),
      fillColor: '#f43f5e', // rose
    },
    {
      range: '3 - 4',
      label: '3.0 - 4.9 (Yếu)',
      count: bucket34,
      percentage: calcPct(bucket34),
      fillColor: '#f59e0b', // amber
    },
    {
      range: '5 - 6',
      label: '5.0 - 6.9 (Trung bình)',
      count: bucket56,
      percentage: calcPct(bucket56),
      fillColor: '#0284c7', // sky
    },
    {
      range: '7 - 8',
      label: '7.0 - 8.9 (Khá)',
      count: bucket78,
      percentage: calcPct(bucket78),
      fillColor: '#10b981', // emerald
    },
    {
      range: '9 - 10',
      label: '9.0 - 10 (Giỏi)',
      count: bucket910,
      percentage: calcPct(bucket910),
      fillColor: '#17372e', // brand dark green
    },
  ];

  return {
    teacherName,
    exam: {
      id: examRecord.id,
      title: examRecord.title,
      durationMinutes: examRecord.duration_minutes,
      status: examRecord.status,
      createdAt: examRecord.created_at,
      subjectName: subject?.name ?? 'Môn học',
      subjectCode: subject?.code ?? 'MH',
      classes,
      totalQuestions: questionList.length,
      mcCount: mcQuestions.length,
      essayCount: essayQuestions.length,
      maxScore,
    },
    metrics: {
      totalGraded,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      passedCount,
    },
    distribution,
    studentResults,
  };
}
