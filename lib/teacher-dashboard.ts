import 'server-only';

import { requireRole } from '@/lib/auth-cache';
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
  const { user, supabase } = await requireRole('teacher');

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
      .select('subject:subjects(id, code, name, archived_at)')
      .eq('teacher_id', user.id),
  ]);

  const classes = (classResult.data ?? []) as TeacherClass[];
  type RawAssignmentSubject = { id: string; code: string; name: string; archived_at: string | null };
  const assignedSubjects: TeacherSubject[] = (assignmentsResult.data ?? [])
    .map((item) => {
      const s = item.subject as RawAssignmentSubject | RawAssignmentSubject[] | null;
      return Array.isArray(s) ? s[0] : s;
    })
    .filter((s): s is RawAssignmentSubject => Boolean(s && !s.archived_at))
    .map(({ id, code, name }) => ({ id, code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exams = (examResult.data ?? []) as TeacherExam[];
  const classIds = classes.map((item) => item.id);
  const examIds = (allExamIdsResult.data ?? []).map((item) => item.id);

  const sevenDaysList = getLastSevenDays();
  const earliestStart = sevenDaysList[0].start;
  const latestEnd = sevenDaysList[sevenDaysList.length - 1].end;

  const [membershipResult, submissionsResult, pendingResult, pendingListResult, weeklySubmissionsResult] = await Promise.all([
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
      ? supabase
          .from('exam_attempts')
          .select(`
            id, attempt_no, submitted_at, exam_id,
            student:profiles!exam_attempts_student_id_fkey(full_name, student_code),
            exam:exams!exam_attempts_exam_id_fkey(
              title,
              subject:subjects!exams_subject_id_fkey(name)
            )
          `)
          .in('exam_id', examIds)
          .eq('status', 'pending_grading')
          .order('submitted_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [], error: null }),
    // Tối ưu hóa: Thay thế 7 query tuần tự bằng 1 query duy nhất trong khoảng 7 ngày qua
    examIds.length
      ? supabase
          .from('exam_attempts')
          .select('submitted_at')
          .in('exam_id', examIds)
          .in('status', ['pending_grading', 'completed'])
          .gte('submitted_at', earliestStart.toISOString())
          .lt('submitted_at', latestEnd.toISOString())
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryErrors = [
    profileResult.error,
    classResult.error,
    examResult.error,
    allExamIdsResult.error,
    publishedCountResult.error,
    questionResult.error,
    assignmentsResult.error,
    membershipResult.error,
    submissionsResult.error,
    pendingResult.error,
    pendingListResult.error,
    weeklySubmissionsResult.error,
  ].filter(Boolean);

  // Gom nhóm thống kê theo từng ngày in-memory siêu tốc O(N)
  const submittedRows = (weeklySubmissionsResult.data ?? []) as { submitted_at: string | null }[];
  const submissionsByDay: SubmissionPoint[] = sevenDaysList.map(({ start, end, day }) => {
    const sTime = start.getTime();
    const eTime = end.getTime();
    const count = submittedRows.filter((r) => {
      if (!r.submitted_at) return false;
      const t = new Date(r.submitted_at).getTime();
      return t >= sTime && t < eTime;
    }).length;
    return { day, submissions: count };
  });

  const pendingAttempts: PendingGradingItem[] = ((pendingListResult.data ?? []) as any[]).map((row) => {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const exam = Array.isArray(row.exam) ? row.exam[0] : row.exam;
    const subject = exam?.subject ? (Array.isArray(exam.subject) ? exam.subject[0] : exam.subject) : null;
    return {
      id: row.id,
      attemptNo: row.attempt_no,
      submittedAt: row.submitted_at,
      studentName: student?.full_name || 'Sinh viên',
      studentCode: student?.student_code || null,
      examId: row.exam_id,
      examTitle: exam?.title || 'Đề thi',
      subjectName: subject?.name || 'Môn học',
    };
  });

  return {
    teacherId: user.id,
    teacherName: sanitizeVietnameseText(profileResult.data?.full_name || user.email || 'Giảng viên'),
    classes,
    assignedSubjects,
    exams,
    classCount: classes.length,
    enrollmentCount: membershipResult.count ?? 0,
    questionCount: questionResult.count ?? 0,
    publishedExamCount: publishedCountResult.count ?? 0,
    submissionCount: submissionsResult.count ?? 0,
    pendingGradingCount: pendingResult.count ?? 0,
    pendingAttempts,
    submissionsByDay,
    errorMessage: queryErrors.length ? 'Một số dữ liệu chưa tải được. Hãy kiểm tra RLS và kết nối Supabase.' : null,
  };
}
