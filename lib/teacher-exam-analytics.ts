import { sanitizeVietnameseText } from '@/lib/utils';
import { isCameraRequired } from '@/lib/exam-camera';
import { isShowAnswersAfterSubmit } from '@/lib/exam-auto-grade';
import 'server-only';

import { redirect } from 'next/navigation';
import { In } from 'typeorm';
import { getCurrentUser, getCurrentRoleRecord } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ClassMembershipSchema,
  ClassSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  ExamClassSchema,
  ExamProctoringLogSchema,
  ExamQuestionSchema,
  ExamSchema,
  ProfileSchema,
  StudentAnswerGradeSchema,
  StudentAnswerSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
  UserSchema,
} from '@/lib/db/entities';

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
    requireCamera: boolean;
    showAnswersAfterSubmit: boolean;
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
  const { user, error: authError } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: roleRecord, error: roleError } = await getCurrentRoleRecord();

  const userRole = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !userRole || (userRole !== 'teacher' && userRole !== 'admin')) {
    redirect('/subjects');
  }

  const [
    profileRepo,
    examRepo,
    subjectRepo,
    examClassRepo,
    classRepo,
    assignmentRepo,
    questionRepo,
    keyRepo,
    attemptRepo,
    resultRepo,
    answerRepo,
    gradeRepo,
    userRepo,
    membershipRepo,
    procRepo,
  ] = await Promise.all([
    getRepo(ProfileSchema),
    getRepo(ExamSchema),
    getRepo(SubjectSchema),
    getRepo(ExamClassSchema),
    getRepo(ClassSchema),
    getRepo(TeacherSubjectAssignmentSchema),
    getRepo(ExamQuestionSchema),
    getRepo(ExamAnswerKeySchema),
    getRepo(ExamAttemptSchema),
    getRepo(AttemptResultSchema),
    getRepo(StudentAnswerSchema),
    getRepo(StudentAnswerGradeSchema),
    getRepo(UserSchema),
    getRepo(ClassMembershipSchema),
    getRepo(ExamProctoringLogSchema),
  ]);

  const [teacherProfile, examRecord] = await Promise.all([
    profileRepo.findOne({ where: { id: user.id } }),
    examRepo.findOne({ where: { id: examId } }),
  ]);

  const teacherName = sanitizeVietnameseText(teacherProfile?.full_name) || user.email || 'Giảng viên';

  if (!examRecord) {
    redirect('/teacher/dashboard');
  }

  if (userRole === 'teacher' && examRecord.created_by !== user.id) {
    const assignment = await assignmentRepo.findOne({
      where: { teacher_id: user.id, subject_id: examRecord.subject_id },
    });
    if (!assignment) {
      redirect('/teacher/dashboard');
    }
  }

  const [subject, examClassLinks, questionList, attemptList] = await Promise.all([
    subjectRepo.findOne({ where: { id: examRecord.subject_id } }),
    examClassRepo.find({ where: { exam_id: examId } }),
    questionRepo.find({ where: { exam_id: examId }, order: { position: 'ASC' } }),
    attemptRepo.find({ where: { exam_id: examId }, order: { submitted_at: 'DESC' } }),
  ]);

  const examClassIds = examClassLinks.map((ec) => ec.class_id);
  const examClasses =
    examClassIds.length > 0 ? await classRepo.find({ where: { id: In(examClassIds) } }) : [];
  const classes = examClasses.map((c) => c.name);

  const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
  const essayQuestions = questionList.filter((q) => q.question_type === 'essay');
  const maxScore = questionList.reduce((acc, q) => acc + Number(q.points || 0), 0);

  const mcQuestionIds = mcQuestions.map((q) => q.id);
  const rawAnswerKeys =
    mcQuestionIds.length > 0
      ? await keyRepo.find({ where: { exam_question_id: In(mcQuestionIds) } })
      : [];

  const correctKeyMap = new Map(rawAnswerKeys.map((k) => [k.exam_question_id, k.correct_option_key]));
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
        requireCamera: isCameraRequired(examRecord),
        showAnswersAfterSubmit: isShowAnswersAfterSubmit(examRecord),
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

  const studentIds = Array.from(new Set(attemptList.map((a) => a.student_id)));

  const [students, rawResults, rawAnswers, rawGrades, authUsers, memberships, proctoringLogs] =
    await Promise.all([
      profileRepo.find({ where: { id: In(studentIds) } }),
      resultRepo.find({ where: { attempt_id: In(attemptIds) } }),
      mcQuestionIds.length > 0
        ? answerRepo.find({
            where: { attempt_id: In(attemptIds), exam_question_id: In(mcQuestionIds) },
          })
        : Promise.resolve([]),
      essayQuestions.length > 0
        ? gradeRepo.find({ where: { attempt_id: In(attemptIds) } })
        : Promise.resolve([]),
      userRepo.find({ where: { id: In(studentIds) } }),
      membershipRepo.find({ where: { student_id: In(studentIds) } }),
      procRepo.find({ where: { attempt_id: In(attemptIds) } }),
    ]);

  const memberClassIds = Array.from(new Set(memberships.map((m) => m.class_id)));
  const memberClasses =
    memberClassIds.length > 0 ? await classRepo.find({ where: { id: In(memberClassIds) } }) : [];
  const memberClassNameMap = new Map(memberClasses.map((c) => [c.id, c.name]));

  const studentProfileMap = new Map(students.map((s) => [s.id, s]));
  const resultMap = new Map(rawResults.map((r) => [r.attempt_id, r]));
  const authEmailMap = new Map(authUsers.map((u) => [u.id, u.email]));

  const studentClassMap = new Map<string, string[]>();
  for (const m of memberships) {
    const className = memberClassNameMap.get(m.class_id);
    if (className) {
      const list = studentClassMap.get(m.student_id) || [];
      if (!list.includes(className)) {
        list.push(className);
        studentClassMap.set(m.student_id, list);
      }
    }
  }

  const violationCountMap = new Map<string, number>();
  for (const log of proctoringLogs) {
    const cur = violationCountMap.get(log.attempt_id) || 0;
    const val = Number(log.switch_count || 0);
    if (val > cur) {
      violationCountMap.set(log.attempt_id, val);
    }
  }

  const answersByAttempt = new Map<
    string,
    Array<{ exam_question_id: string; selected_option: string | null }>
  >();
  for (const ans of rawAnswers) {
    const list = answersByAttempt.get(ans.attempt_id) || [];
    list.push({ exam_question_id: ans.exam_question_id, selected_option: ans.selected_option });
    answersByAttempt.set(ans.attempt_id, list);
  }

  const essayGradesByAttempt = new Map<
    string,
    Array<{ exam_question_id: string; awarded_points: number }>
  >();
  for (const grade of rawGrades) {
    const list = essayGradesByAttempt.get(grade.attempt_id) || [];
    list.push({
      exam_question_id: grade.exam_question_id,
      awarded_points: Number(grade.awarded_points || 0),
    });
    essayGradesByAttempt.set(grade.attempt_id, list);
  }

  const questionPointMap = new Map(questionList.map((q) => [q.id, Number(q.points || 0)]));

  const studentResults: StudentExamResultItem[] = attemptList.map((attempt) => {
    const result = resultMap.get(attempt.id);
    const student = studentProfileMap.get(attempt.student_id);

    const studentAnswers = answersByAttempt.get(attempt.id) || [];
    let mcScore = 0;
    for (const ans of studentAnswers) {
      const correctKey = correctKeyMap.get(ans.exam_question_id);
      if (ans.selected_option && correctKey && ans.selected_option === correctKey) {
        mcScore += questionPointMap.get(ans.exam_question_id) || 0;
      }
    }

    const essayGrades = essayGradesByAttempt.get(attempt.id) || [];
    const essayScore = essayGrades.reduce((acc, g) => acc + g.awarded_points, 0);

    let totalScore = 0;
    if (result && result.total_score !== null) {
      totalScore = Number(result.total_score);
    } else {
      totalScore = Number((mcScore + essayScore).toFixed(2));
    }

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
    const displayClass =
      assignedClasses.length > 0 ? assignedClasses.join(', ') : classes.join(', ') || 'Chưa xếp lớp';

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

  const submittedResults = studentResults.filter((r) => r.submittedAt !== null);
  const totalGraded = submittedResults.length;
  const scores = submittedResults.map((r) => r.totalScore);
  const averageScore = totalGraded
    ? Number((scores.reduce((a, b) => a + b, 0) / totalGraded).toFixed(2))
    : 0;
  const medianScore = calculateMedian(scores);
  const highestScore = totalGraded ? Math.max(...scores) : 0;
  const lowestScore = totalGraded ? Math.min(...scores) : 0;
  const passedCount = submittedResults.filter((r) => r.isPassed).length;
  const passRate = totalGraded ? Number(((passedCount / totalGraded) * 100).toFixed(1)) : 0;

  let bucket02 = 0;
  let bucket34 = 0;
  let bucket56 = 0;
  let bucket78 = 0;
  let bucket910 = 0;

  for (const score of scores) {
    if (score < 3.0) bucket02++;
    else if (score < 5.0) bucket34++;
    else if (score < 7.0) bucket56++;
    else if (score < 9.0) bucket78++;
    else bucket910++;
  }

  const calcPct = (count: number) =>
    totalGraded ? Number(((count / totalGraded) * 100).toFixed(1)) : 0;

  const distribution: ExamScoreDistributionItem[] = [
    { range: '0 - 2.9', label: '0 - 2.9 (Kém)', count: bucket02, percentage: calcPct(bucket02), fillColor: '#f43f5e' },
    { range: '3.0 - 4.9', label: '3.0 - 4.9 (Yếu)', count: bucket34, percentage: calcPct(bucket34), fillColor: '#f59e0b' },
    { range: '5.0 - 6.9', label: '5.0 - 6.9 (Trung bình)', count: bucket56, percentage: calcPct(bucket56), fillColor: '#0ea5e9' },
    { range: '7.0 - 8.9', label: '7.0 - 8.9 (Khá)', count: bucket78, percentage: calcPct(bucket78), fillColor: '#10b981' },
    { range: '9.0 - 10', label: '9.0 - 10 (Giỏi)', count: bucket910, percentage: calcPct(bucket910), fillColor: '#154C99' },
  ];

  const sortedAttempts = [...submittedResults].sort((a, b) => b.totalScore - a.totalScore);
  const totalSubmissions = sortedAttempts.length;
  const groupSize = totalSubmissions > 0 ? Math.max(1, Math.round(totalSubmissions * 0.27)) : 0;

  const highGroupAttemptIds = new Set(sortedAttempts.slice(0, groupSize).map((a) => a.attemptId));
  const lowGroupAttemptIds = new Set(
    totalSubmissions >= 2
      ? sortedAttempts.slice(Math.max(groupSize, totalSubmissions - groupSize)).map((a) => a.attemptId)
      : sortedAttempts.map((a) => a.attemptId),
  );

  const answerLookup = new Map<string, string>();
  for (const ans of rawAnswers) {
    if (ans.selected_option) {
      answerLookup.set(`${ans.attempt_id}_${ans.exam_question_id}`, ans.selected_option);
    }
  }

  const essayLookup = new Map<string, number>();
  for (const grade of rawGrades) {
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

    const averageScoreQ = totalResponses > 0 ? Number((totalScoreAwarded / totalResponses).toFixed(2)) : 0;
    const correctPercentage = totalResponses > 0 ? Number(((correctResponses / totalResponses) * 100).toFixed(1)) : 0;

    let difficultyIndex = 0;
    if (qType === 'multiple_choice') {
      difficultyIndex = totalResponses > 0 ? Number((correctResponses / totalResponses).toFixed(2)) : 0;
    } else {
      difficultyIndex = qPoints > 0 && totalResponses > 0 ? Number((averageScoreQ / qPoints).toFixed(2)) : 0;
    }

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

    let difficultyLabel: 'Dễ' | 'Chuẩn' | 'Khó' = 'Chuẩn';
    if (difficultyIndex > 0.8) difficultyLabel = 'Dễ';
    else if (difficultyIndex < 0.3) difficultyLabel = 'Khó';

    let discriminationLabel: 'Phân hóa rất tốt' | 'Phân hóa tốt' | 'Tạm được' | 'Phân hóa kém' = 'Phân hóa tốt';
    if (discriminationIndex >= 0.4) discriminationLabel = 'Phân hóa rất tốt';
    else if (discriminationIndex >= 0.3) discriminationLabel = 'Phân hóa tốt';
    else if (discriminationIndex >= 0.2) discriminationLabel = 'Tạm được';
    else discriminationLabel = 'Phân hóa kém';

    let overallEvaluation: 'Câu quá dễ' | 'Câu chuẩn (Phân hóa tốt)' | 'Câu khó / Cần xem lại' | 'Chưa đủ dữ liệu' =
      'Câu chuẩn (Phân hóa tốt)';
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
      averageScore: averageScoreQ,
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
      requireCamera: isCameraRequired(examRecord),
      showAnswersAfterSubmit: isShowAnswersAfterSubmit(examRecord),
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
