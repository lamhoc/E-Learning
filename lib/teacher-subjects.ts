import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getCachedTeacherAssignedSubjectIds } from '@/lib/data-cache';

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
  const { user, role, supabase } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  if (role === 'student') {
    redirect('/student/dashboard');
  }
  if (role !== 'admin' && role !== 'teacher') {
    redirect('/login');
  }

  const { fullName } = await getCurrentProfile();
  const teacherName = fullName || user.email?.split('@')[0] || 'Giảng viên';

  let subjectIds: string[] | null = null;
  let lookupError: string | undefined;

  if (role === 'teacher') {
    try {
      subjectIds = await getCachedTeacherAssignedSubjectIds(user.id);
    } catch (err: unknown) {
      lookupError = err instanceof Error ? err.message : 'Lỗi truy vấn môn học';
      subjectIds = [];
    }
  }

  // Nếu giảng viên chưa được phân công môn nào
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

  let subjectsQuery = supabase
    .from('subjects')
    .select('id, code, name, description, archived_at')
    .order('name', { ascending: true });

  if (subjectIds !== null) {
    subjectsQuery = subjectsQuery.in('id', subjectIds);
  }
  if (role !== 'admin') {
    subjectsQuery = subjectsQuery.is('archived_at', null);
  }

  const [subjectsResult, classesResult, questionsResult, examsResult] = await Promise.all([
    subjectsQuery,
    supabase
      .from('classes')
      .select('id, name, class_code, academic_year, subject_id')
      .eq('teacher_id', user.id)
      .is('archived_at', null),
    supabase
      .from('question_bank')
      .select('id, subject_id')
      .eq('created_by', user.id)
      .is('archived_at', null),
    supabase
      .from('exams')
      .select('id, subject_id')
      .eq('created_by', user.id),
  ]);

  if (subjectsResult.error) {
    lookupError = subjectsResult.error.message;
  }

  const rawSubjects = (subjectsResult.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
  }>;

  const allClasses = classesResult.data ?? [];
  const allQuestions = questionsResult.data ?? [];
  const allExams = examsResult.data ?? [];

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

