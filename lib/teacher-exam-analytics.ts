import { sanitizeVietnameseText } from '@/lib/utils';
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
  className: string;
  attemptNo: number;
  mcScore: number;
  essayScore: number;
  totalScore: number;
  isPassed: boolean;
  submittedAt: string | null;
  releasedAt: string | null;
  violationCount: number;
  gradingStatus: string;
};

export type QuestionItemAnalysis = {
  questionId: string;
  position: number;
  questionType: 'multiple_choice' | 'essay';
  questionText: string;
  maxPoints: number;
  totalResponses: number;
  correctResponses: number;
  correctPercentage: number;
  averageScore: number;
  difficultyIndex: number; // P (0 - 1)
  discriminationIndex: number; // D (-1 to 1)
  difficultyLabel: 'Dễ' | 'Chuẩn' | 'Khó';
  discriminationLabel: 'Phân hóa rất tốt' | 'Phân hóa tốt' | 'Tạm được' | 'Phân hóa kém';
  overallEvaluation: 'Câu quá dễ' | 'Câu chuẩn (Phân hóa tốt)' | 'Câu khó / Cần xem lại' | 'Chưa đủ dữ liệu';
  badgeVariant: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
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
    medianScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    passedCount: number;
  };
  distribution: ExamScoreDistributionItem[];
  studentResults: StudentExamResultItem[];
  itemAnalysis: QuestionItemAnalysis[];
};

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
  return Number(sorted[mid].toFixed(2));
}

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

  const teacherName = sanitizeVietnameseText(teacherProfile?.full_name) || user.email || 'Giảng viên';

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

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
    .select('id, position, question_type, points, question_text')
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
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: false });

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
        medianScore: 0,
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
        { range: '9 - 10', label: '9.0 - 10 (Giỏi)', count: 0, percentage: 0, fillColor: '#154C99' },
      ],
      studentResults: [],
      itemAnalysis: questionList.map((q) => ({
        questionId: q.id,
        position: q.position,
        questionType: q.question_type as 'multiple_choice' | 'essay',
        questionText: q.question_text || `Câu hỏi ${q.position}`,
        maxPoints: Number(q.points || 0),
        totalResponses: 0,
        correctResponses: 0,
        correctPercentage: 0,
        averageScore: 0,
        difficultyIndex: 0,
        discriminationIndex: 0,
        difficultyLabel: 'Chuẩn',
        discriminationLabel: 'Phân hóa tốt',
        overallEvaluation: 'Chưa đủ dữ liệu',
        badgeVariant: 'slate',
      })),
    };
  }

  // 5. Lấy kết quả điểm (attempt_results), câu trả lời, điểm tự luận, emails, class memberships, vi phạm
  const studentIds = Array.from(new Set(attemptList.map((a) => a.student_id)));

  const [
    resultsRes,
    answersRes,
    gradesRes,
    authUsersRes,
    membershipsRes,
    proctoringLogsRes,
  ] = await Promise.all([
    adminClient
      .from('attempt_results')
      .select('attempt_id, total_score, released_at')
      .in('attempt_id', attemptIds),
    attemptIds.length && mcQuestionIds.length
      ? adminClient
          .from('student_answers')
          .select('attempt_id, exam_question_id, selected_option')
          .in('attempt_id', attemptIds)
          .in('exam_question_id', mcQuestionIds)
      : { data: [] },
    attemptIds.length && essayQuestions.length
      ? adminClient
          .from('student_answer_grades')
          .select('attempt_id, exam_question_id, awarded_points')
          .in('attempt_id', attemptIds)
      : { data: [] },
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    studentIds.length
      ? adminClient
          .from('class_memberships')
          .select('student_id, class:classes(name)')
          .in('student_id', studentIds)
      : { data: [] },
    attemptIds.length
      ? adminClient
          .from('exam_proctoring_logs')
          .select('attempt_id, switch_count')
          .in('attempt_id', attemptIds)
      : { data: [] },
  ]);

  const rawResults = resultsRes.data ?? [];
  const resultMap = new Map(rawResults.map((r) => [r.attempt_id, r]));

  // Lập bản đồ Email
  const authEmailMap = new Map((authUsersRes.data?.users ?? []).map((u) => [u.id, u.email ?? '']));

  // Lập bản đồ Lớp sinh viên
  const studentClassMap = new Map<string, string[]>();
  for (const m of membershipsRes.data ?? []) {
    const c = m.class as unknown as { name: string } | Array<{ name: string }> | null;
    const className = Array.isArray(c) ? c[0]?.name : c?.name;
    if (className) {
      const list = studentClassMap.get(m.student_id) || [];
      if (!list.includes(className)) {
        list.push(className);
        studentClassMap.set(m.student_id, list);
      }
    }
  }

  // Lập bản đồ Vi phạm
  const violationCountMap = new Map<string, number>();
  for (const log of proctoringLogsRes.data ?? []) {
    const cur = violationCountMap.get(log.attempt_id) || 0;
    const val = Number(log.switch_count || 0);
    if (val > cur) {
      violationCountMap.set(log.attempt_id, val);
    }
  }

  // Gom câu trả lời trắc nghiệm theo attemptId & questionId
  const answersByAttempt = new Map<string, Array<{ exam_question_id: string; selected_option: string | null }>>();
  for (const ans of answersRes.data ?? []) {
    const list = answersByAttempt.get(ans.attempt_id) || [];
    list.push(ans);
    answersByAttempt.set(ans.attempt_id, list);
  }

  // Gom điểm tự luận theo attemptId & questionId
  const essayGradesByAttempt = new Map<string, Array<{ exam_question_id: string; awarded_points: number }>>();
  for (const grade of gradesRes.data ?? []) {
    const list = essayGradesByAttempt.get(grade.attempt_id) || [];
    list.push({
      exam_question_id: grade.exam_question_id,
      awarded_points: Number(grade.awarded_points || 0),
    });
    essayGradesByAttempt.set(grade.attempt_id, list);
  }

  const questionPointMap = new Map(questionList.map((q) => [q.id, Number(q.points || 0)]));

  // 6. Xử lý danh sách kết quả sinh viên chi tiết
  const studentResults: StudentExamResultItem[] = attemptList.map((attempt) => {
    const result = resultMap.get(attempt.id);
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

    // Tính tổng điểm
    let totalScore = 0;
    if (result && result.total_score !== null) {
      totalScore = Number(result.total_score);
    } else {
      totalScore = Number((mcScore + essayScore).toFixed(2));
    }

    // Xác định trạng thái chấm
    let gradingStatus = 'Chưa công bố';
    if (result?.released_at) {
      gradingStatus = 'Đã công bố điểm';
    } else if (result) {
      gradingStatus = 'Đã chấm (Chưa công bố)';
    } else if (essayQuestions.length > 0) {
      gradingStatus = 'Chờ chấm tự luận';
    } else if (attempt.submitted_at) {
      gradingStatus = 'Đã nộp bài';
    }

    const assignedClasses = studentClassMap.get(attempt.student_id) || [];
    const displayClass = assignedClasses.length > 0 ? assignedClasses.join(', ') : (classes.join(', ') || 'Chưa xếp lớp');

    return {
      attemptId: attempt.id,
      studentId: attempt.student_id,
      studentName: student?.full_name ? sanitizeVietnameseText(student.full_name) : 'Sinh viên',
      studentCode: student?.student_code || null,
      studentEmail: authEmailMap.get(attempt.student_id) || 'Chưa xác thực email',
      className: displayClass,
      attemptNo: attempt.attempt_no,
      mcScore: Number(mcScore.toFixed(2)),
      essayScore: Number(essayScore.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      isPassed: totalScore >= 5.0,
      submittedAt: attempt.submitted_at,
      releasedAt: result?.released_at || null,
      violationCount: violationCountMap.get(attempt.id) || 0,
      gradingStatus,
    };
  });

  // 7. Thống kê tổng hợp (tính trên các bài thi đã nộp)
  const submittedResults = studentResults.filter((r) => r.submittedAt !== null);
  const totalGraded = submittedResults.length;
  const scores = submittedResults.map((r) => r.totalScore);
  const averageScore = totalGraded ? Number((scores.reduce((a, b) => a + b, 0) / totalGraded).toFixed(2)) : 0;
  const medianScore = calculateMedian(scores);
  const highestScore = totalGraded ? Math.max(...scores) : 0;
  const lowestScore = totalGraded ? Math.min(...scores) : 0;
  const passedCount = submittedResults.filter((r) => r.isPassed).length;
  const passRate = totalGraded ? Number(((passedCount / totalGraded) * 100).toFixed(1)) : 0;

  // 8. Phân bố phổ điểm 5 khoảng chuẩn
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
      range: '0 - 2.9',
      label: '0 - 2.9 (Kém)',
      count: bucket02,
      percentage: calcPct(bucket02),
      fillColor: '#f43f5e', // rose
    },
    {
      range: '3.0 - 4.9',
      label: '3.0 - 4.9 (Yếu)',
      count: bucket34,
      percentage: calcPct(bucket34),
      fillColor: '#f59e0b', // amber
    },
    {
      range: '5.0 - 6.9',
      label: '5.0 - 6.9 (Trung bình)',
      count: bucket56,
      percentage: calcPct(bucket56),
      fillColor: '#0ea5e9', // sky
    },
    {
      range: '7.0 - 8.9',
      label: '7.0 - 8.9 (Khá)',
      count: bucket78,
      percentage: calcPct(bucket78),
      fillColor: '#10b981', // emerald
    },
    {
      range: '9.0 - 10',
      label: '9.0 - 10 (Giỏi)',
      count: bucket910,
      percentage: calcPct(bucket910),
      fillColor: '#154C99', // brand navy
    },
  ];

  // 9. Phân tích Độ khó & Độ phân biệt từng câu hỏi (Item Analysis)
  // Sắp xếp các bài thi theo tổng điểm giảm dần để chia nhóm 27% cao nhất và 27% thấp nhất
  const sortedAttempts = [...submittedResults].sort((a, b) => b.totalScore - a.totalScore);
  const totalSubmissions = sortedAttempts.length;
  const groupSize = totalSubmissions > 0 ? Math.max(1, Math.round(totalSubmissions * 0.27)) : 0;

  const highGroupAttemptIds = new Set(sortedAttempts.slice(0, groupSize).map((a) => a.attemptId));
  const lowGroupAttemptIds = new Set(
    totalSubmissions >= 2
      ? sortedAttempts.slice(Math.max(groupSize, totalSubmissions - groupSize)).map((a) => a.attemptId)
      : sortedAttempts.map((a) => a.attemptId)
  );

  // Tạo map tra cứu câu trả lời theo [attemptId_questionId]
  const answerLookup = new Map<string, string>();
  for (const ans of answersRes.data ?? []) {
    if (ans.selected_option) {
      answerLookup.set(`${ans.attempt_id}_${ans.exam_question_id}`, ans.selected_option);
    }
  }

  // Tạo map tra cứu điểm tự luận theo [attemptId_questionId]
  const essayLookup = new Map<string, number>();
  for (const grade of gradesRes.data ?? []) {
    essayLookup.set(`${grade.attempt_id}_${grade.exam_question_id}`, Number(grade.awarded_points || 0));
  }

  const itemAnalysis: QuestionItemAnalysis[] = questionList.map((q) => {
    const qType = q.question_type as 'multiple_choice' | 'essay';
    const qPoints = Number(q.points || 1);
    const correctKey = correctKeyMap.get(q.id);

    let totalResponses = 0;
    let correctResponses = 0;
    let totalScoreAwarded = 0;
    let highGroupCorrect = 0;
    let lowGroupCorrect = 0;
    let highGroupScore = 0;
    let lowGroupScore = 0;

    for (const attempt of sortedAttempts) {
      const isHigh = highGroupAttemptIds.has(attempt.attemptId);
      const isLow = lowGroupAttemptIds.has(attempt.attemptId);

      if (qType === 'multiple_choice') {
        const selected = answerLookup.get(`${attempt.attemptId}_${q.id}`);
        if (selected !== undefined) {
          totalResponses++;
          const isCorrect = correctKey && selected === correctKey;
          if (isCorrect) {
            correctResponses++;
            totalScoreAwarded += qPoints;
            if (isHigh) highGroupCorrect++;
            if (isLow) lowGroupCorrect++;
          }
        }
      } else {
        // Tự luận
        const awarded = essayLookup.get(`${attempt.attemptId}_${q.id}`);
        if (awarded !== undefined) {
          totalResponses++;
          totalScoreAwarded += awarded;
          if (awarded >= qPoints * 0.5) {
            correctResponses++;
          }
          if (isHigh) highGroupScore += awarded;
          if (isLow) lowGroupScore += awarded;
        }
      }
    }

    const averageScore = totalResponses > 0 ? Number((totalScoreAwarded / totalResponses).toFixed(2)) : 0;
    const correctPercentage = totalResponses > 0 ? Number(((correctResponses / totalResponses) * 100).toFixed(1)) : 0;

    // Tính Chỉ số Độ khó P (Difficulty Index: 0 đến 1)
    let difficultyIndex = 0;
    if (qType === 'multiple_choice') {
      difficultyIndex = totalResponses > 0 ? Number((correctResponses / totalResponses).toFixed(2)) : 0;
    } else {
      difficultyIndex = qPoints > 0 && totalResponses > 0 ? Number((averageScore / qPoints).toFixed(2)) : 0;
    }

    // Tính Chỉ số Độ phân biệt D (Discrimination Index: -1 đến +1)
    let discriminationIndex = 0;
    if (groupSize > 0) {
      if (qType === 'multiple_choice') {
        discriminationIndex = Number(((highGroupCorrect - lowGroupCorrect) / groupSize).toFixed(2));
      } else {
        const highAvg = highGroupScore / groupSize;
        const lowAvg = lowGroupScore / groupSize;
        discriminationIndex = qPoints > 0 ? Number(((highAvg - lowAvg) / qPoints).toFixed(2)) : 0;
      }
    }

    // Đánh giá nhãn Độ khó
    let difficultyLabel: 'Dễ' | 'Chuẩn' | 'Khó' = 'Chuẩn';
    if (difficultyIndex > 0.8) {
      difficultyLabel = 'Dễ';
    } else if (difficultyIndex < 0.3) {
      difficultyLabel = 'Khó';
    }

    // Đánh giá nhãn Độ phân biệt
    let discriminationLabel: 'Phân hóa rất tốt' | 'Phân hóa tốt' | 'Tạm được' | 'Phân hóa kém' = 'Phân hóa tốt';
    if (discriminationIndex >= 0.4) {
      discriminationLabel = 'Phân hóa rất tốt';
    } else if (discriminationIndex >= 0.3) {
      discriminationLabel = 'Phân hóa tốt';
    } else if (discriminationIndex >= 0.2) {
      discriminationLabel = 'Tạm được';
    } else {
      discriminationLabel = 'Phân hóa kém';
    }

    // Nhãn tổng thể và Badge màu
    let overallEvaluation: 'Câu quá dễ' | 'Câu chuẩn (Phân hóa tốt)' | 'Câu khó / Cần xem lại' | 'Chưa đủ dữ liệu' = 'Câu chuẩn (Phân hóa tốt)';
    let badgeVariant: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' = 'emerald';

    if (totalResponses === 0) {
      overallEvaluation = 'Chưa đủ dữ liệu';
      badgeVariant = 'slate';
    } else if (discriminationIndex < 0.2) {
      overallEvaluation = 'Câu khó / Cần xem lại';
      badgeVariant = 'rose';
    } else if (difficultyIndex > 0.8) {
      overallEvaluation = 'Câu quá dễ';
      badgeVariant = 'blue';
    } else if (difficultyIndex < 0.3) {
      overallEvaluation = 'Câu khó / Cần xem lại';
      badgeVariant = 'amber';
    } else {
      overallEvaluation = 'Câu chuẩn (Phân hóa tốt)';
      badgeVariant = 'emerald';
    }

    return {
      questionId: q.id,
      position: q.position,
      questionType: qType,
      questionText: q.question_text || `Câu hỏi số ${q.position}`,
      maxPoints: qPoints,
      totalResponses,
      correctResponses,
      correctPercentage,
      averageScore,
      difficultyIndex,
      discriminationIndex,
      difficultyLabel,
      discriminationLabel,
      overallEvaluation,
      badgeVariant,
    };
  });

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
      medianScore,
      highestScore,
      lowestScore,
      passRate,
      passedCount,
    },
    distribution,
    studentResults,
    itemAnalysis,
  };
}
