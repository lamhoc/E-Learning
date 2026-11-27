import 'server-only';

import { In, Not } from 'typeorm';
import { requireRole } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AttemptResultSchema,
  ClassMaterialSchema,
  ClassMembershipSchema,
  ClassSchema,
  ExamAttemptSchema,
  ExamClassSchema,
  ExamSchema,
  NotificationSchema,
  ProfileSchema,
  SubjectSchema,
} from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';
import type { ClassMaterialItem } from '@/lib/class-materials';
import { getStudentAssignments, type StudentAssignmentItem } from '@/lib/assignments';
import {
  isCameraRequired,
  cleanExamInstructions,
  isAutoGradeEssay,
  isShowAnswersAfterSubmit,
} from '@/lib/exam-auto-grade';

type Related<T> = T | T[] | null;

export type StudentClass = {
  id: string;
  name: string;
  class_code: string;
  academic_year: string;
  subject: Related<{ name: string }>;
};

export type StudentExam = {
  id: string;
  title: string;
  instructions: string | null;
  duration_minutes: number;
  max_attempts: number;
  available_from: string | null;
  available_until: string | null;
  require_camera?: boolean;
  auto_grade_essay?: boolean;
  show_answers_after_submit?: boolean;
  subject: Related<{ name: string }>;
};

export type StudentAttempt = {
  id: string;
  exam_id: string;
  attempt_no: number;
  started_at: string;
  submitted_at: string | null;
  status: 'in_progress' | 'pending_grading' | 'completed' | 'voided';
  exam: Related<{ title: string; subject: Related<{ name: string }> }>;
  result: Related<{ total_score: number | string; released_at: string | null }>;
};

export type StudentNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export type StudentDashboardData = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  classes: StudentClass[];
  materials: ClassMaterialItem[];
  assignments: StudentAssignmentItem[];
  openExams: StudentExam[];
  attempts: StudentAttempt[];
  submittedAttemptCount: number;
  notifications: StudentNotification[];
  hasDataError: boolean;
};

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const { user } = await requireRole('student');

  try {
    const [
      profileRepo,
      membershipRepo,
      classRepo,
      subjectRepo,
      examClassRepo,
      examRepo,
      attemptRepo,
      resultRepo,
      notifRepo,
      materialRepo,
    ] = await Promise.all([
      getRepo(ProfileSchema),
      getRepo(ClassMembershipSchema),
      getRepo(ClassSchema),
      getRepo(SubjectSchema),
      getRepo(ExamClassSchema),
      getRepo(ExamSchema),
      getRepo(ExamAttemptSchema),
      getRepo(AttemptResultSchema),
      getRepo(NotificationSchema),
      getRepo(ClassMaterialSchema),
    ]);

    const [
      profile,
      memberships,
      recentAttempts,
      submittedAttemptCount,
      notifications,
      assignments,
    ] = await Promise.all([
      profileRepo.findOne({ where: { id: user.id } }),
      membershipRepo.find({
        where: { student_id: user.id },
        order: { enrolled_at: 'DESC' },
      }),
      attemptRepo.find({
        where: { student_id: user.id },
        order: { started_at: 'DESC' },
        take: 10,
      }),
      attemptRepo.count({
        where: { student_id: user.id, status: Not('in_progress') },
      }),
      notifRepo.find({
        where: { user_id: user.id },
        order: { created_at: 'DESC' },
        take: 5,
      }),
      getStudentAssignments(user.id),
    ]);

    const enrolledClassIds = memberships.map((m) => m.class_id);

    const [rawClasses, examClassLinks, rawMaterials] = await Promise.all([
      enrolledClassIds.length > 0
        ? classRepo.find({ where: { id: In(enrolledClassIds) } })
        : Promise.resolve([]),
      enrolledClassIds.length > 0
        ? examClassRepo.find({ where: { class_id: In(enrolledClassIds) } })
        : Promise.resolve([]),
      enrolledClassIds.length > 0
        ? materialRepo.find({
            where: { class_id: In(enrolledClassIds) },
            order: { week_number: 'ASC', created_at: 'DESC' },
          })
        : Promise.resolve([]),
    ]);

    const classById = new Map(rawClasses.map((c) => [c.id, c]));
    const activeClasses = enrolledClassIds
      .map((cid) => classById.get(cid))
      .filter((c): c is NonNullable<typeof c> => Boolean(c && !c.archived_at));

    const allowedExamIds = Array.from(new Set(examClassLinks.map((ec) => ec.exam_id)));
    const attemptExamIds = Array.from(new Set(recentAttempts.map((a) => a.exam_id)));
    const allExamIds = Array.from(new Set([...allowedExamIds, ...attemptExamIds]));

    const [allExams, attemptResults] = await Promise.all([
      allExamIds.length > 0 ? examRepo.find({ where: { id: In(allExamIds) } }) : Promise.resolve([]),
      recentAttempts.length > 0
        ? resultRepo.find({ where: { attempt_id: In(recentAttempts.map((a) => a.id)) } })
        : Promise.resolve([]),
    ]);

    const subjectIds = Array.from(
      new Set([
        ...activeClasses.map((c) => c.subject_id),
        ...allExams.map((e) => e.subject_id),
      ]),
    );
    const subjects =
      subjectIds.length > 0 ? await subjectRepo.find({ where: { id: In(subjectIds) } }) : [];

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const examMap = new Map(allExams.map((e) => [e.id, e]));
    const resultMap = new Map(attemptResults.map((r) => [r.attempt_id, r]));

    const classes: StudentClass[] = activeClasses.map((c) => ({
      id: c.id,
      name: c.name,
      class_code: c.class_code,
      academic_year: c.academic_year,
      subject: subjectMap.has(c.subject_id) ? { name: subjectMap.get(c.subject_id)!.name } : null,
    }));

    const now = Date.now();
    const publishedAllowedExams = allowedExamIds
      .map((id) => examMap.get(id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e && e.status === 'published'))
      .sort((a, b) => {
        if (!a.available_from && !b.available_from) return 0;
        if (!a.available_from) return 1;
        if (!b.available_from) return -1;
        return Date.parse(a.available_from) - Date.parse(b.available_from);
      })
      .slice(0, 50);

    const exams: StudentExam[] = publishedAllowedExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      instructions: cleanExamInstructions(exam.instructions),
      duration_minutes: exam.duration_minutes,
      max_attempts: exam.max_attempts,
      available_from: exam.available_from,
      available_until: exam.available_until,
      require_camera: isCameraRequired(exam),
      auto_grade_essay: isAutoGradeEssay(exam),
      show_answers_after_submit: isShowAnswersAfterSubmit(exam),
      subject: subjectMap.has(exam.subject_id) ? { name: subjectMap.get(exam.subject_id)!.name } : null,
    }));

    const openExams = exams.filter((exam) => {
      const startsAt = exam.available_from ? Date.parse(exam.available_from) : Number.NEGATIVE_INFINITY;
      const endsAt = exam.available_until ? Date.parse(exam.available_until) : Number.POSITIVE_INFINITY;
      return startsAt <= now && now < endsAt;
    });

    const materials: ClassMaterialItem[] = rawMaterials.map((row) => ({
      id: row.id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      title: row.title || 'Tài liệu không tên',
      description: row.description,
      materialType: row.material_type,
      fileUrl: row.file_url,
      fileName: row.file_name,
      fileSizeBytes: row.file_size_bytes,
      mimeType: row.mime_type,
      weekNumber: row.week_number || 1,
      createdAt: row.created_at,
    }));

    const attempts: StudentAttempt[] = recentAttempts
      .filter((att) => att.status !== 'in_progress' || Boolean(att.submitted_at))
      .slice(0, 8)
      .map((att) => {
        const exam = examMap.get(att.exam_id);
        const resultObj = resultMap.get(att.id);
        const totalScoreNum =
          resultObj && resultObj.total_score !== null && Number.isFinite(Number(resultObj.total_score))
            ? Math.round(Number(resultObj.total_score) * 100) / 100
            : null;

        return {
          id: att.id,
          exam_id: att.exam_id,
          attempt_no: att.attempt_no,
          started_at: att.started_at,
          submitted_at: att.submitted_at,
          status: att.status,
          exam: exam
            ? {
                title: exam.title,
                subject: subjectMap.has(exam.subject_id)
                  ? { name: subjectMap.get(exam.subject_id)!.name }
                  : null,
              }
            : null,
          result:
            totalScoreNum !== null
              ? { total_score: totalScoreNum, released_at: resultObj?.released_at ?? null }
              : null,
        };
      });

    return {
      studentId: user.id,
      studentName: sanitizeVietnameseText(profile?.full_name || user.email || 'Sinh viên'),
      studentCode: profile?.student_code ?? null,
      classes,
      materials,
      assignments,
      openExams,
      attempts,
      submittedAttemptCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        created_at: n.created_at,
        read_at: n.read_at,
      })),
      hasDataError: false,
    };
  } catch (err) {
    console.error('getStudentDashboardData error:', err);
    return {
      studentId: user.id,
      studentName: user.email || 'Sinh viên',
      studentCode: null,
      classes: [],
      materials: [],
      assignments: [],
      openExams: [],
      attempts: [],
      submittedAttemptCount: 0,
      notifications: [],
      hasDataError: true,
    };
  }
}
