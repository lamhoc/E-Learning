import 'server-only';

import { redirect } from 'next/navigation';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getCachedTeacherAssignedSubjectIds } from '@/lib/data-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  ExamSchema,
  QuestionBankSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';

export type SubjectClassSummary = {
  id: string;
  name: string;
  class_code: string;
  academic_year: string;
};

export type TeacherSubjectItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  classes: SubjectClassSummary[];
  classesCount: number;
  questionsCount: number;
  examsCount: number;
};

export type TeacherSubjectsData = {
  teacherId: string;
  teacherName: string;
  userRole: 'admin' | 'teacher';
  subjects: TeacherSubjectItem[];
  totalAssignedSubjects: number;
  totalClassesCount: number;
  totalQuestionsCount: number;
  totalExamsCount: number;
  errorMessage?: string;
};

export async function getTeacherSubjectsData(): Promise<TeacherSubjectsData> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) redirect('/login');
  if (role === 'student') redirect('/student/dashboard');
  if (role !== 'admin' && role !== 'teacher') redirect('/login');

  const { fullName } = await getCurrentProfile();
  const teacherName = fullName || user.email?.split('@')[0] || 'Giảng viên';

  const ds = await getDataSource();
  let subjectIds: string[] | null = null;
  let lookupError: string | undefined;

  if (role === 'teacher') {
    try {
      subjectIds = await getCachedTeacherAssignedSubjectIds(user.id);
    } catch (err: unknown) {
      lookupError = err instanceof Error ? err.message : 'Lỗi cache phân môn';
      subjectIds = null;
    }

    if (!subjectIds || subjectIds.length === 0) {
      const directAssignments = await ds.getRepository(TeacherSubjectAssignmentSchema).find({
        select: { subject_id: true },
        where: { teacher_id: user.id },
      });
      subjectIds = directAssignments.map((row) => row.subject_id);
      if (subjectIds.length > 0) lookupError = undefined;
    }
  }

  if (role === 'teacher' && subjectIds && subjectIds.length === 0) {
    return {
      teacherId: user.id,
      teacherName,
      userRole: role,
      subjects: [],
      totalAssignedSubjects: 0,
      totalClassesCount: 0,
      totalQuestionsCount: 0,
      totalExamsCount: 0,
      errorMessage: lookupError,
    };
  }

  const subjectWhere: Record<string, unknown> = {};
  if (subjectIds !== null) subjectWhere.id = In(subjectIds);
  if (role !== 'admin') subjectWhere.archived_at = IsNull();

  const classWhere: Record<string, unknown> = { archived_at: IsNull() };
  const questionWhere: Record<string, unknown> = { archived_at: IsNull() };
  const examWhere: Record<string, unknown> = {};

  if (role !== 'admin') {
    classWhere.teacher_id = user.id;
    questionWhere.created_by = user.id;
    examWhere.created_by = user.id;
  }

  const [rawSubjects, allClasses, allQuestions, allExams] = await Promise.all([
    ds.getRepository(SubjectSchema).find({
      select: { id: true, code: true, name: true, description: true, archived_at: true },
      where: subjectWhere,
      order: { name: 'ASC' },
    }),
    ds.getRepository(ClassSchema).find({
      select: { id: true, name: true, class_code: true, academic_year: true, subject_id: true },
      where: classWhere,
    }),
    ds.getRepository(QuestionBankSchema).find({
      select: { id: true, subject_id: true },
      where: questionWhere,
    }),
    ds.getRepository(ExamSchema).find({
      select: { id: true, subject_id: true },
      where: examWhere,
    }),
  ]);

  const subjects: TeacherSubjectItem[] = rawSubjects.map((s) => {
    const sClasses = allClasses.filter((c) => c.subject_id === s.id);
    const sQuestions = allQuestions.filter((q) => q.subject_id === s.id);
    const sExams = allExams.filter((e) => e.subject_id === s.id);

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      classes: sClasses.map((c) => ({
        id: c.id,
        name: c.name,
        class_code: c.class_code,
        academic_year: c.academic_year,
      })),
      classesCount: sClasses.length,
      questionsCount: sQuestions.length,
      examsCount: sExams.length,
    };
  });

  return {
    teacherId: user.id,
    teacherName,
    userRole: role,
    subjects,
    totalAssignedSubjects: subjects.length,
    totalClassesCount: allClasses.length,
    totalQuestionsCount: allQuestions.length,
    totalExamsCount: allExams.length,
    errorMessage: lookupError,
  };
}
