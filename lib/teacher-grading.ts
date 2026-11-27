import { sanitizeVietnameseText } from '@/lib/utils';
import 'server-only';

import { revalidatePath } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import { In } from 'typeorm';
import { z } from 'zod';
import { getCurrentUser, getCurrentRoleRecord } from '@/lib/auth-cache';
import { getDataSource, getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ClassMembershipSchema,
  ClassSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  ExamProctoringLogSchema,
  ExamQuestionSchema,
  ExamSchema,
  NotificationSchema,
  ProfileSchema,
  StudentAnswerGradeSchema,
  StudentAnswerSchema,
  SubjectSchema,
  UserRoleSchema,
  UserSchema,
} from '@/lib/db/entities';

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
  essayQuestions: EssayQuestionGradingItem[];
  mcQuestions: MultipleChoiceSummaryItem[];
  mcAwardedScore: number;
  mcTotalScore: number;
  essayMaxScore: number;
  currentTotalScore: number | null;
  releasedAt: string | null;
  proctoring?: {
    tabSwitchCount: number;
    hasViolations: boolean;
    breakdown?: {
      tabSwitches: number;
      fullscreenExits: number;
      cameraBlocked: number;
    };
  };
};

/**
 * Đọc log giám thị của 1 lượt thi.
 * Ưu tiên bảng exam_proctoring_logs, nếu rỗng thì dự phòng bằng notifications.
 */
async function loadAttemptProctoring(
  attemptId: string,
): Promise<NonNullable<TeacherGradingPageData['proctoring']>> {
  let proctoring: NonNullable<TeacherGradingPageData['proctoring']> = {
    tabSwitchCount: 0,
    hasViolations: false,
  };

  try {
    const procRepo = await getRepo(ExamProctoringLogSchema);
    const procLogs = await procRepo.find({
      where: { attempt_id: attemptId },
      order: { created_at: 'DESC' },
    });

    if (procLogs.length > 0) {
      let maxCount = 0;
      let tabSwitches = 0;
      let fullscreenExits = 0;
      let cameraBlocked = 0;

      for (const log of procLogs) {
        const count = Number(log.switch_count || 0);
        if (count > maxCount) maxCount = count;
        if (log.violation_type === 'fullscreen_exit') fullscreenExits++;
        else if (log.violation_type === 'camera_blocked') cameraBlocked++;
        else tabSwitches++;
      }

      proctoring = {
        tabSwitchCount: Math.max(maxCount, procLogs.length),
        hasViolations: true,
        breakdown: {
          tabSwitches,
          fullscreenExits,
          cameraBlocked,
        },
      };
    } else {
      const notifRepo = await getRepo(NotificationSchema);
      const notifs = await notifRepo
        .createQueryBuilder('n')
        .where('n.data LIKE :typePat', { typePat: '%exam_proctoring_violation%' })
        .andWhere('n.data LIKE :attemptPat', { attemptPat: `%${attemptId}%` })
        .getMany();

      const matched = notifs.filter(
        (n) =>
          n.data?.type === 'exam_proctoring_violation' &&
          String(n.data?.attempt_id ?? '').toLowerCase() === attemptId.toLowerCase(),
      );

      if (matched.length > 0) {
        const counts = matched.map((n) => Number(n.data?.switch_count || 1));
        const maxCount = Math.max(...counts, 0);
        proctoring = {
          tabSwitchCount: maxCount,
          hasViolations: maxCount > 0,
          breakdown: {
            tabSwitches: maxCount,
            fullscreenExits: 0,
            cameraBlocked: 0,
          },
        };
      }
    }
  } catch (procErr) {
    console.warn('Could not read proctoring logs:', procErr);
  }

  return proctoring;
}

export async function getTeacherGradingData(attemptId: string): Promise<TeacherGradingPageData> {
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
    attemptRepo,
    examRepo,
    subjectRepo,
    questionRepo,
    answerRepo,
    gradeRepo,
    resultRepo,
    keyRepo,
  ] = await Promise.all([
    getRepo(ProfileSchema),
    getRepo(ExamAttemptSchema),
    getRepo(ExamSchema),
    getRepo(SubjectSchema),
    getRepo(ExamQuestionSchema),
    getRepo(StudentAnswerSchema),
    getRepo(StudentAnswerGradeSchema),
    getRepo(AttemptResultSchema),
    getRepo(ExamAnswerKeySchema),
  ]);

  const [teacherProfile, attempt] = await Promise.all([
    profileRepo.findOne({ where: { id: user.id } }),
    attemptRepo.findOne({ where: { id: attemptId } }),
  ]);

  const teacherName = sanitizeVietnameseText(teacherProfile?.full_name) || user.email || 'Giảng viên';

  if (!attempt) {
    notFound();
  }

  const [
    studentRecord,
    examRecord,
    rawQuestions,
    rawAnswers,
    rawGrades,
    result,
    proctoring,
  ] = await Promise.all([
    profileRepo.findOne({ where: { id: attempt.student_id } }),
    examRepo.findOne({ where: { id: attempt.exam_id } }),
    questionRepo.find({
      where: { exam_id: attempt.exam_id },
      order: { position: 'ASC' },
    }),
    answerRepo.find({ where: { attempt_id: attemptId } }),
    gradeRepo.find({ where: { attempt_id: attemptId } }),
    resultRepo.findOne({ where: { attempt_id: attemptId } }),
    loadAttemptProctoring(attemptId),
  ]);

  const questionIds = rawQuestions.map((q) => q.id);
  const [subjectRecord, rawKeys] = await Promise.all([
    examRecord?.subject_id ? subjectRepo.findOne({ where: { id: examRecord.subject_id } }) : Promise.resolve(null),
    questionIds.length > 0 ? keyRepo.find({ where: { exam_question_id: In(questionIds) } }) : Promise.resolve([]),
  ]);

  const answerMap = new Map(rawAnswers.map((a) => [a.exam_question_id, a]));
  const gradeMap = new Map(rawGrades.map((g) => [g.exam_question_id, g]));
  const keyMap = new Map(rawKeys.map((k) => [k.exam_question_id, k]));

  const essayQuestions: EssayQuestionGradingItem[] = [];
  const mcQuestions: MultipleChoiceSummaryItem[] = [];

  let mcAwardedScore = 0;
  let mcTotalScore = 0;
  let essayMaxScore = 0;

  for (const q of rawQuestions) {
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
  studentEmail: string;
  className: string;
  examTitle: string;
  subjectName: string;
  subjectCode: string;
  essayCount: number;
  mcScore: number | null;
  essayScore: number | null;
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
    questionRepo,
    attemptRepo,
    resultRepo,
    procRepo,
    userRepo,
    membershipRepo,
    classRepo,
    gradeRepo,
  ] = await Promise.all([
    getRepo(ProfileSchema),
    getRepo(ExamSchema),
    getRepo(SubjectSchema),
    getRepo(ExamQuestionSchema),
    getRepo(ExamAttemptSchema),
    getRepo(AttemptResultSchema),
    getRepo(ExamProctoringLogSchema),
    getRepo(UserSchema),
    getRepo(ClassMembershipSchema),
    getRepo(ClassSchema),
    getRepo(StudentAnswerGradeSchema),
  ]);

  const [teacherProfile, exams] = await Promise.all([
    profileRepo.findOne({ where: { id: user.id } }),
    examRepo.find({ where: { created_by: user.id } }),
  ]);

  const teacherName = sanitizeVietnameseText(teacherProfile?.full_name) || user.email || 'Giảng viên';

  if (exams.length === 0) {
    return {
      teacherName,
      teacherId: user.id,
      pendingAttempts: [],
      completedAttempts: [],
      totalPendingCount: 0,
      totalCompletedCount: 0,
    };
  }

  const examIds = exams.map((e) => e.id);
  const subjectIds = Array.from(new Set(exams.map((e) => e.subject_id)));

  const [subjects, examQuestions, rawAttempts] = await Promise.all([
    subjectRepo.find({ where: { id: In(subjectIds) } }),
    questionRepo.find({ where: { exam_id: In(examIds) } }),
    attemptRepo.find({
      where: {
        exam_id: In(examIds),
        status: In(['pending_grading', 'completed']),
      },
      order: { submitted_at: 'DESC' },
    }),
  ]);

  if (rawAttempts.length === 0) {
    return {
      teacherName,
      teacherId: user.id,
      pendingAttempts: [],
      completedAttempts: [],
      totalPendingCount: 0,
      totalCompletedCount: 0,
    };
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const essayCountByExam = new Map<string, number>();
  for (const q of examQuestions) {
    if (q.question_type === 'essay') {
      essayCountByExam.set(q.exam_id, (essayCountByExam.get(q.exam_id) ?? 0) + 1);
    }
  }

  const examMap = new Map<
    string,
    {
      title: string;
      subjectName: string;
      subjectCode: string;
      essayCount: number;
    }
  >();

  for (const e of exams) {
    const subj = subjectMap.get(e.subject_id);
    examMap.set(e.id, {
      title: e.title,
      subjectName: subj?.name || 'Môn học',
      subjectCode: subj?.code || '',
      essayCount: essayCountByExam.get(e.id) ?? 0,
    });
  }

  const attemptIds = rawAttempts.map((a) => a.id);
  const studentIds = Array.from(new Set(rawAttempts.map((a) => a.student_id)));

  const [students, results, procLogs, users, memberships, grades] = await Promise.all([
    profileRepo.find({ where: { id: In(studentIds) } }),
    resultRepo.find({ where: { attempt_id: In(attemptIds) } }),
    procRepo.find({ where: { attempt_id: In(attemptIds) } }),
    userRepo.find({ where: { id: In(studentIds) } }),
    membershipRepo.find({ where: { student_id: In(studentIds) } }),
    gradeRepo.find({ where: { attempt_id: In(attemptIds) } }),
  ]);

  const classIds = Array.from(new Set(memberships.map((m) => m.class_id)));
  const classes = classIds.length > 0 ? await classRepo.find({ where: { id: In(classIds) } }) : [];
  const classNameMap = new Map(classes.map((c) => [c.id, c.name]));

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const resultMap = new Map(results.map((r) => [r.attempt_id, r]));
  const authEmailMap = new Map(users.map((u) => [u.id, u.email]));

  const proctoringMap = new Map<string, number>();
  for (const log of procLogs) {
    const current = proctoringMap.get(log.attempt_id) || 0;
    const count = Number(log.switch_count || 0);
    if (count > current) {
      proctoringMap.set(log.attempt_id, count);
    }
  }

  const studentClassMap = new Map<string, string[]>();
  for (const m of memberships) {
    const className = classNameMap.get(m.class_id);
    if (className) {
      const list = studentClassMap.get(m.student_id) || [];
      if (!list.includes(className)) {
        list.push(className);
        studentClassMap.set(m.student_id, list);
      }
    }
  }

  const essayScoresMap = new Map<string, number>();
  for (const g of grades) {
    const cur = essayScoresMap.get(g.attempt_id) || 0;
    essayScoresMap.set(g.attempt_id, cur + Number(g.awarded_points || 0));
  }

  const pendingAttempts: TeacherGradingQueueItem[] = [];
  const completedAttempts: TeacherGradingQueueItem[] = [];

  for (const a of rawAttempts) {
    const examInfo = examMap.get(a.exam_id);
    const student = studentMap.get(a.student_id);
    const result = resultMap.get(a.id);

    const totalScoreNum = result && result.total_score !== null ? Number(result.total_score) : null;
    const essayScoreNum = essayScoresMap.has(a.id)
      ? Number(essayScoresMap.get(a.id)!.toFixed(2))
      : examInfo?.essayCount === 0
        ? 0
        : null;

    let mcScoreNum: number | null = null;
    if (totalScoreNum !== null && essayScoreNum !== null) {
      mcScoreNum = Number(Math.max(0, totalScoreNum - essayScoreNum).toFixed(2));
    } else if (totalScoreNum !== null && (examInfo?.essayCount ?? 0) === 0) {
      mcScoreNum = totalScoreNum;
    }

    const classesList = studentClassMap.get(a.student_id) || [];
    const className = classesList.length > 0 ? classesList.join(', ') : 'Chưa xếp lớp';

    const item: TeacherGradingQueueItem = {
      attemptId: a.id,
      examId: a.exam_id,
      attemptNo: a.attempt_no,
      status: a.status as 'pending_grading' | 'completed',
      submittedAt: a.submitted_at,
      studentName: student?.full_name ? sanitizeVietnameseText(student.full_name) : 'Sinh viên',
      studentCode: student?.student_code || null,
      studentEmail: authEmailMap.get(a.student_id) || 'Chưa xác thực email',
      className,
      examTitle: examInfo?.title || 'Đề thi',
      subjectName: examInfo?.subjectName || 'Môn học',
      subjectCode: examInfo?.subjectCode || '',
      essayCount: examInfo?.essayCount || 0,
      mcScore: mcScoreNum,
      essayScore: essayScoreNum,
      totalScore: totalScoreNum,
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

export type GradeSubmissionItem = {
  questionId: string;
  awardedPoints: number;
  feedback?: string | null;
};

export type SaveEssayGradesPayload = {
  attemptId: string;
  examId: string;
  studentId: string;
  grades: GradeSubmissionItem[];
  releaseResult: boolean;
};

export type SaveEssayGradesResult = {
  status: 'success' | 'error';
  message: string;
  newTotalScore?: number;
  isReleased?: boolean;
};

export const gradeItemSchema = z.object({
  questionId: z.string().uuid('ID câu hỏi không hợp lệ.'),
  awardedPoints: z.coerce.number().min(0, 'Điểm không được là số âm.'),
  feedback: z.string().max(2000, 'Nhận xét không được quá 2000 ký tự.').nullable().optional(),
});

export const saveEssayGradesSchema = z.object({
  attemptId: z.string().uuid('Mã lượt thi không hợp lệ.'),
  examId: z.string().uuid('Mã đề thi không hợp lệ.'),
  studentId: z.string().uuid('Mã sinh viên không hợp lệ.'),
  grades: z.array(gradeItemSchema).min(1, 'Danh sách điểm không được để trống.'),
  releaseResult: z.boolean(),
});

/**
 * Hàm nghiệp vụ lưu điểm tự luận và cập nhật kết quả bài thi.
 * Được dùng chung bởi cả REST Route Handler và Server Action.
 */
export async function saveEssayGrades(
  payload: SaveEssayGradesPayload,
): Promise<SaveEssayGradesResult> {
  try {
    const parseResult = saveEssayGradesSchema.safeParse(payload);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(', ');
      return { status: 'error', message: `Dữ liệu không hợp lệ: ${errorMsg}` };
    }

    const { attemptId, examId, studentId, grades, releaseResult } = parseResult.data;

    const { user, error: authError } = await getCurrentUser();
    if (authError || !user) {
      return { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const roleRepo = await getRepo(UserRoleSchema);
    const roleRecord = await roleRepo.findOne({ where: { user_id: user.id } });

    if (!roleRecord || (roleRecord.role !== 'teacher' && roleRecord.role !== 'admin')) {
      return { status: 'error', message: 'Bạn không có quyền chấm bài thi này.' };
    }

    const [examRepo, questionRepo] = await Promise.all([
      getRepo(ExamSchema),
      getRepo(ExamQuestionSchema),
    ]);

    const [examData, questionList] = await Promise.all([
      examRepo.findOne({ where: { id: examId } }),
      questionRepo.find({ where: { exam_id: examId } }),
    ]);

    const examTitle = examData?.title || 'Đề thi';
    const maxPointsMap = new Map(questionList.map((q) => [q.id, Number(q.points) || 1]));

    for (const item of grades) {
      const maxPoints = maxPointsMap.get(item.questionId) ?? 10;
      if (item.awardedPoints > maxPoints) {
        return {
          status: 'error',
          message: `Điểm chấm (${item.awardedPoints}) vượt quá điểm tối đa (${maxPoints}) của câu hỏi.`,
        };
      }
    }

    const nowIso = new Date().toISOString();
    const gradesByQuestion = new Map(grades.map((item) => [item.questionId, item]));
    const uniqueGrades = Array.from(gradesByQuestion.values());

    const ds = await getDataSource();
    const { totalScore, releasedAtValue } = await ds.transaction(async (manager) => {
      const ansRepo = manager.getRepository(StudentAnswerSchema);
      const gradeRepo = manager.getRepository(StudentAnswerGradeSchema);
      const keyRepo = manager.getRepository(ExamAnswerKeySchema);
      const resultRepo = manager.getRepository(AttemptResultSchema);
      const attemptRepo = manager.getRepository(ExamAttemptSchema);

      if (uniqueGrades.length > 0) {
        const qIds = uniqueGrades.map((item) => item.questionId);
        const existingAnswers = await ansRepo.find({
          where: { attempt_id: attemptId, exam_question_id: In(qIds) },
        });
        const answeredIds = new Set(existingAnswers.map((row) => row.exam_question_id));

        const missingAnswers = uniqueGrades
          .filter((item) => !answeredIds.has(item.questionId))
          .map((item) => ({
            attempt_id: attemptId,
            exam_id: examId,
            exam_question_id: item.questionId,
            selected_option: null,
            answer_text: '',
            created_at: nowIso,
            updated_at: nowIso,
          }));

        if (missingAnswers.length > 0) {
          await ansRepo.insert(missingAnswers);
        }

        await gradeRepo.save(
          uniqueGrades.map((item) => ({
            attempt_id: attemptId,
            exam_question_id: item.questionId,
            awarded_points: item.awardedPoints,
            feedback: item.feedback?.trim() || null,
            graded_by: user.id,
            graded_at: nowIso,
          })),
        );
      }

      // Tính tổng điểm: Trắc nghiệm + Tự luận
      const mcQuestions = questionList.filter((q) => q.question_type === 'multiple_choice');
      let mcAwardedScore = 0;

      if (mcQuestions.length > 0) {
        const mcIds = mcQuestions.map((q) => q.id);
        const [keys, answers, existingMcGrades] = await Promise.all([
          keyRepo.find({ where: { exam_question_id: In(mcIds) } }),
          ansRepo.find({ where: { attempt_id: attemptId, exam_question_id: In(mcIds) } }),
          gradeRepo.find({ where: { attempt_id: attemptId, exam_question_id: In(mcIds) } }),
        ]);

        const keyMap = new Map(keys.map((k) => [k.exam_question_id, k.correct_option_key]));
        const ansMap = new Map(answers.map((a) => [a.exam_question_id, a.selected_option]));
        const gradeMap = new Map(existingMcGrades.map((g) => [g.exam_question_id, Number(g.awarded_points)]));

        for (const q of mcQuestions) {
          const qPoints = Number(q.points) || 1;
          if (gradeMap.has(q.id)) {
            mcAwardedScore += gradeMap.get(q.id)!;
          } else {
            const correctKey = keyMap.get(q.id);
            const studentKey = ansMap.get(q.id);
            if (correctKey && studentKey && correctKey === studentKey) {
              mcAwardedScore += qPoints;
            }
          }
        }
      }

      const essayScore = uniqueGrades.reduce((sum, g) => sum + (Number(g.awardedPoints) || 0), 0);
      const computedTotal = Math.round((mcAwardedScore + essayScore) * 100) / 100;

      const currentResult = await resultRepo.findOne({ where: { attempt_id: attemptId } });
      const releasedAt = releaseResult ? nowIso : currentResult?.released_at || null;

      await resultRepo.save({
        attempt_id: attemptId,
        total_score: computedTotal,
        released_at: releasedAt,
        graded_by: user.id,
        updated_at: nowIso,
      });

      if (releaseResult) {
        await attemptRepo.update({ id: attemptId }, { status: 'completed' });

        await manager.getRepository(NotificationSchema).insert({
          user_id: studentId,
          title: 'Bài thi đã có kết quả chính thức',
          message: `Giảng viên đã hoàn thành chấm điểm bài thi "${examTitle}". Tổng điểm của bạn: ${computedTotal} điểm.`,
          data: { exam_id: examId, attempt_id: attemptId, total_score: computedTotal },
          created_at: nowIso,
          read_at: null,
        });
      }

      return { totalScore: computedTotal, releasedAtValue: releasedAt };
    });

    try {
      revalidatePath('/student/results');
      revalidatePath('/student/dashboard');
      revalidatePath('/student/exams');
      revalidatePath(`/student/exams/${examId}`);
      revalidatePath('/teacher/grading');
      revalidatePath(`/teacher/grading/${attemptId}`);
    } catch (revErr) {
      console.warn('revalidatePath error in saveEssayGrades:', revErr);
    }

    return {
      status: 'success',
      message: releaseResult
        ? `Đã chốt điểm và công bố kết quả bài thi thành công! Tổng điểm: ${totalScore} điểm.`
        : `Đã lưu tạm điểm số và nhận xét thành công! Tổng điểm hiện tại: ${totalScore} điểm.`,
      newTotalScore: totalScore,
      isReleased: Boolean(releasedAtValue),
    };
  } catch (err) {
    console.error('saveEssayGrades error:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi lưu điểm.',
    };
  }
}
