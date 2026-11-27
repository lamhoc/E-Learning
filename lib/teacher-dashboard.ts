import 'server-only';

import { In, IsNull } from 'typeorm';
import { requireRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassMembershipSchema,
  ClassSchema,
  ExamAttemptSchema,
  ExamClassSchema,
  ExamQuestionSchema,
  ExamSchema,
  ProfileSchema,
  QuestionBankSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';

export type TeacherClass = {
  id: string;
  name: string;
  class_code: string;
  academic_year: string;
  subject: { name: string } | { name: string }[] | null;
};

export type TeacherSubject = { id: string; code: string; name: string };

export type TeacherExam = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  created_at: string;
  available_from: string | null;
  duration_minutes: number;
  subject: { name: string } | { name: string }[] | null;
  exam_questions: { id: string }[];
  exam_classes: { class_id: string }[];
};

export type SubmissionPoint = {
  day: string;
  submissions: number;
};

export type PendingGradingItem = {
  id: string;
  attemptNo: number;
  submittedAt: string | null;
  studentName: string;
  studentCode: string | null;
  examId: string;
  examTitle: string;
  subjectName: string;
};

export type TeacherDashboardData = {
  teacherId: string;
  teacherName: string;
  classes: TeacherClass[];
  assignedSubjects: TeacherSubject[];
  exams: TeacherExam[];
  classCount: number;
  enrollmentCount: number;
  questionCount: number;
  publishedExamCount: number;
  submissionCount: number;
  pendingGradingCount: number;
  pendingAttempts: PendingGradingItem[];
  submissionsByDay: SubmissionPoint[];
  errorMessage: string | null;
};

function getLastSevenDays() {
  const today = new Date();
  const currentDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(currentDay - (6 - index) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return {
      start,
      end,
      day: start.toLocaleDateString('vi-VN', { weekday: 'short', timeZone: 'UTC' }),
    };
  });
}

export async function getTeacherDashboardData(): Promise<TeacherDashboardData> {
  const { user } = await requireRole('teacher');
  const ds = await getDataSource();

  const [
    profileRow,
    rawClasses,
    recentExams,
    allExamIds,
    publishedExamCount,
    questionCount,
    assignmentsRows,
  ] = await Promise.all([
    ds.getRepository(ProfileSchema).findOne({ where: { id: user.id }, select: { full_name: true } }),
    ds.getRepository(ClassSchema).find({
      where: { teacher_id: user.id, archived_at: IsNull() },
      order: { created_at: 'DESC' },
    }),
    ds.getRepository(ExamSchema).find({
      where: { created_by: user.id },
      order: { created_at: 'DESC' },
      take: 8,
    }),
    ds.getRepository(ExamSchema).find({
      select: { id: true, title: true, subject_id: true },
      where: { created_by: user.id },
    }),
    ds.getRepository(ExamSchema).count({ where: { created_by: user.id, status: 'published' } }),
    ds.getRepository(QuestionBankSchema).count({
      where: { created_by: user.id, archived_at: IsNull() },
    }),
    ds.getRepository(TeacherSubjectAssignmentSchema).find({
      select: { subject_id: true },
      where: { teacher_id: user.id },
    }),
  ]);

  const subjectIds = Array.from(
    new Set([
      ...rawClasses.map((c) => c.subject_id),
      ...allExamIds.map((e) => e.subject_id),
      ...assignmentsRows.map((a) => a.subject_id),
    ]),
  );

  const recentExamIds = recentExams.map((e) => e.id);
  const classIds = rawClasses.map((c) => c.id);
  const examIds = allExamIds.map((e) => e.id);

  const sevenDaysList = getLastSevenDays();
  const earliestStart = sevenDaysList[0].start;
  const latestEnd = sevenDaysList[sevenDaysList.length - 1].end;

  const [
    subjectsRows,
    examQuestionsRows,
    examClassesRows,
    enrollmentCount,
    submissionCount,
    pendingGradingCount,
    pendingAttemptsRaw,
    weeklySubmissionsRaw,
  ] = await Promise.all([
    subjectIds.length
      ? ds.getRepository(SubjectSchema).find({ where: { id: In(subjectIds) } })
      : Promise.resolve([]),
    recentExamIds.length
      ? ds.getRepository(ExamQuestionSchema).find({
          select: { id: true, exam_id: true },
          where: { exam_id: In(recentExamIds) },
        })
      : Promise.resolve([]),
    recentExamIds.length
      ? ds.getRepository(ExamClassSchema).find({
          where: { exam_id: In(recentExamIds) },
        })
      : Promise.resolve([]),
    classIds.length
      ? ds.getRepository(ClassMembershipSchema).count({ where: { class_id: In(classIds) } })
      : Promise.resolve(0),
    examIds.length
      ? ds.getRepository(ExamAttemptSchema).count({
          where: { exam_id: In(examIds), status: In(['pending_grading', 'completed']) },
        })
      : Promise.resolve(0),
    examIds.length
      ? ds.getRepository(ExamAttemptSchema).count({
          where: { exam_id: In(examIds), status: 'pending_grading' },
        })
      : Promise.resolve(0),
    examIds.length
      ? ds.getRepository(ExamAttemptSchema).find({
          where: { exam_id: In(examIds), status: 'pending_grading' },
          order: { submitted_at: 'DESC' },
          take: 6,
        })
      : Promise.resolve([]),
    examIds.length
      ? ds
          .getRepository(ExamAttemptSchema)
          .createQueryBuilder('ea')
          .select(['ea.submitted_at'])
          .where('ea.exam_id IN (:...examIds)', { examIds })
          .andWhere('ea.status IN (:...statuses)', { statuses: ['pending_grading', 'completed'] })
          .andWhere('ea.submitted_at >= :start AND ea.submitted_at < :end', {
            start: earliestStart,
            end: latestEnd,
          })
          .getMany()
      : Promise.resolve([]),
  ]);

  const subjectMap = new Map(subjectsRows.map((s) => [s.id, s]));
  const examMap = new Map(allExamIds.map((e) => [e.id, e]));

  const classes: TeacherClass[] = rawClasses.map((c) => {
    const subj = subjectMap.get(c.subject_id);
    return {
      id: c.id,
      name: c.name,
      class_code: c.class_code,
      academic_year: c.academic_year,
      subject: subj ? { name: subj.name } : null,
    };
  });

  const assignedSubjectIdSet = new Set(assignmentsRows.map((a) => a.subject_id));
  const assignedSubjects: TeacherSubject[] = subjectsRows
    .filter((s) => assignedSubjectIdSet.has(s.id) && !s.archived_at)
    .map(({ id, code, name }) => ({ id, code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  const exams: TeacherExam[] = recentExams.map((e) => {
    const subj = subjectMap.get(e.subject_id);
    return {
      id: e.id,
      title: e.title,
      status: e.status,
      created_at: e.created_at,
      available_from: e.available_from,
      duration_minutes: e.duration_minutes,
      subject: subj ? { name: subj.name } : null,
      exam_questions: examQuestionsRows
        .filter((q) => q.exam_id === e.id)
        .map((q) => ({ id: q.id })),
      exam_classes: examClassesRows
        .filter((ec) => ec.exam_id === e.id)
        .map((ec) => ({ class_id: ec.class_id })),
    };
  });

  const pendingStudentIds = Array.from(new Set(pendingAttemptsRaw.map((a) => a.student_id)));
  const pendingStudentProfiles = pendingStudentIds.length
    ? await ds.getRepository(ProfileSchema).find({
        select: { id: true, full_name: true, student_code: true },
        where: { id: In(pendingStudentIds) },
      })
    : [];
  const studentMap = new Map(pendingStudentProfiles.map((p) => [p.id, p]));

  const pendingAttempts: PendingGradingItem[] = pendingAttemptsRaw.map((row) => {
    const student = studentMap.get(row.student_id);
    const exam = examMap.get(row.exam_id);
    const subject = exam ? subjectMap.get(exam.subject_id) : undefined;
    return {
      id: row.id,
      attemptNo: row.attempt_no,
      submittedAt: row.submitted_at,
      studentName: sanitizeVietnameseText(student?.full_name || 'Sinh viên'),
      studentCode: student?.student_code || null,
      examId: row.exam_id,
      examTitle: exam?.title || 'Đề thi',
      subjectName: subject?.name || 'Môn học',
    };
  });

  const submissionsByDay: SubmissionPoint[] = sevenDaysList.map(({ start, end, day }) => {
    const sTime = start.getTime();
    const eTime = end.getTime();
    const count = weeklySubmissionsRaw.filter((r) => {
      if (!r.submitted_at) return false;
      const t = new Date(r.submitted_at).getTime();
      return t >= sTime && t < eTime;
    }).length;
    return { day, submissions: count };
  });

  return {
    teacherId: user.id,
    teacherName: sanitizeVietnameseText(profileRow?.full_name || user.email || 'Giảng viên'),
    classes,
    assignedSubjects,
    exams,
    classCount: classes.length,
    enrollmentCount,
    questionCount,
    publishedExamCount,
    submissionCount,
    pendingGradingCount,
    pendingAttempts,
    submissionsByDay,
    errorMessage: null,
  };
}
