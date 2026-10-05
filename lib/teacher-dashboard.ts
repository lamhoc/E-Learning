import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

export type TeacherDashboardData = {
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
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || roleRecord?.role !== 'teacher') redirect('/subjects');

  const [profileResult, classResult, examResult, allExamIdsResult, publishedCountResult, questionResult, assignmentsResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('classes')
      .select('id, name, class_code, academic_year, subject:subjects(name)')
      .eq('teacher_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('exams')
      .select(
        'id, title, status, created_at, available_from, duration_minutes, subject:subjects(name), exam_questions(id), exam_classes(class_id)',
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('exams').select('id').eq('created_by', user.id),
    supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('status', 'published'),
    supabase
      .from('question_bank')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .is('archived_at', null),
    supabase
      .from('teacher_subject_assignments')
      .select('subject_id')
      .eq('teacher_id', user.id),
  ]);

  const assignedSubjectIds = (assignmentsResult.data ?? []).map((assignment) => assignment.subject_id);
  const assignedSubjectsResult = assignedSubjectIds.length
    ? await supabase
        .from('subjects')
        .select('id, code, name')
        .in('id', assignedSubjectIds)
        .is('archived_at', null)
        .order('name')
    : { data: [], error: null };

  const classes = (classResult.data ?? []) as TeacherClass[];
  const assignedSubjects = (assignedSubjectsResult.data ?? []) as TeacherSubject[];
  const exams = (examResult.data ?? []) as TeacherExam[];
  const classIds = classes.map((item) => item.id);
  const examIds = (allExamIdsResult.data ?? []).map((item) => item.id);

  const [membershipResult, submissionsResult, pendingResult, dailyResults] = await Promise.all([
    classIds.length
      ? supabase
          .from('class_memberships')
          .select('class_id', { count: 'exact', head: true })
          .in('class_id', classIds)
      : Promise.resolve({ count: 0, error: null }),
    examIds.length
      ? supabase
          .from('exam_attempts')
          .select('id', { count: 'exact', head: true })
          .in('exam_id', examIds)
          .in('status', ['pending_grading', 'completed'])
      : Promise.resolve({ count: 0, error: null }),
    examIds.length
      ? supabase
          .from('exam_attempts')
          .select('id', { count: 'exact', head: true })
          .in('exam_id', examIds)
          .eq('status', 'pending_grading')
      : Promise.resolve({ count: 0, error: null }),
    examIds.length
      ? Promise.all(
          getLastSevenDays().map(async ({ start, end, day }) => {
            const { count, error } = await supabase
              .from('exam_attempts')
              .select('id', { count: 'exact', head: true })
              .in('exam_id', examIds)
              .in('status', ['pending_grading', 'completed'])
              .gte('submitted_at', start.toISOString())
              .lt('submitted_at', end.toISOString());

            return { day, submissions: count ?? 0, error };
          }),
        )
      : Promise.resolve(getLastSevenDays().map(({ day }) => ({ day, submissions: 0, error: null }))),
  ]);

  const queryErrors = [
    profileResult.error,
    classResult.error,
    examResult.error,
    allExamIdsResult.error,
    publishedCountResult.error,
    questionResult.error,
    assignmentsResult.error,
    assignedSubjectsResult.error,
    membershipResult.error,
    submissionsResult.error,
    pendingResult.error,
    ...dailyResults.map((item) => item.error),
  ].filter(Boolean);

  return {
    teacherName: profileResult.data?.full_name || user.email || 'Giảng viên',
    classes,
    assignedSubjects,
    exams,
    classCount: classes.length,
    enrollmentCount: membershipResult.count ?? 0,
    questionCount: questionResult.count ?? 0,
    publishedExamCount: publishedCountResult.count ?? 0,
    submissionCount: submissionsResult.count ?? 0,
    pendingGradingCount: pendingResult.count ?? 0,
    submissionsByDay: dailyResults.map(({ day, submissions }) => ({ day, submissions })),
    errorMessage: queryErrors.length ? 'Một số dữ liệu chưa tải được. Hãy kiểm tra RLS và kết nối Supabase.' : null,
  };
}
