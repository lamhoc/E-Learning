import 'server-only';

import { redirect } from 'next/navigation';
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
      console.warn('[getTeacherSubjectsData] Cache fetch failed, fallback to direct query:', err);
      lookupError = err instanceof Error ? err.message : 'Lỗi cache phân môn';
      subjectIds = null;
    }

    // Fallback: Nếu cache trả về rỗng hoặc lỗi, truy vấn trực tiếp bằng client xác thực của người dùng
    if (!subjectIds || subjectIds.length === 0) {
      const { data: directAssignments, error: directError } = await supabase
        .from('teacher_subject_assignments')
        .select('subject_id')
        .eq('teacher_id', user.id);

      if (!directError && directAssignments && directAssignments.length > 0) {
        subjectIds = directAssignments.map((row) => row.subject_id as string);
        lookupError = undefined;
      } else {
        subjectIds = [];
      }
    }
  }

  // Nếu giảng viên thực sự chưa được phân công môn nào
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

  let classesQuery = supabase
    .from('classes')
    .select('id, name, class_code, academic_year, subject_id')
    .is('archived_at', null);

  let questionsQuery = supabase
    .from('question_bank')
    .select('id, subject_id')
    .is('archived_at', null);

  let examsQuery = supabase
    .from('exams')
    .select('id, subject_id');

  if (role !== 'admin') {
    classesQuery = classesQuery.eq('teacher_id', user.id);
    questionsQuery = questionsQuery.eq('created_by', user.id).is('archived_at', null);
    examsQuery = examsQuery.eq('created_by', user.id);
  }

  const [subjectsResult, classesResult, questionsResult, examsResult] = await Promise.all([
    subjectsQuery,
    classesQuery,
    questionsQuery,
    examsQuery,
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
