import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ClassMaterialItem } from '@/lib/class-materials';

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
  openExams: StudentExam[];
  attempts: StudentAttempt[];
  submittedAttemptCount: number;
  notifications: StudentNotification[];
  hasDataError: boolean;
};

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || roleRecord?.role !== 'student') redirect('/subjects');

  const [
    profileResult,
    membershipsResult,
    examsResult,
    attemptsResult,
    submittedAttemptsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, student_code')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('class_memberships')
      .select(
        'class_id, enrolled_at, class:classes!inner(id, name, class_code, academic_year, archived_at, subject:subjects(name))',
      )
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('exams')
      .select(
        'id, title, instructions, duration_minutes, max_attempts, available_from, available_until, subject:subjects(name)',
      )
      .eq('status', 'published')
      .order('available_from', { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from('exam_attempts')
      .select(
        'id, exam_id, attempt_no, started_at, submitted_at, status, exam:exams(title, subject:subjects(name)), result:attempt_results(total_score, released_at)',
      )
      .eq('student_id', user.id)
      .order('started_at', { ascending: false })
      .limit(8),
    supabase
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .in('status', ['pending_grading', 'completed']),
    supabase
      .from('notifications')
      .select('id, title, message, created_at, read_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const now = Date.now();
  const memberships = (membershipsResult.data ?? []) as {
    class: (StudentClass & { archived_at: string | null }) | (StudentClass & { archived_at: string | null })[] | null;
  }[];
  const classes = memberships
    .map(({ class: classRecord }) => (Array.isArray(classRecord) ? classRecord[0] : classRecord))
    .filter((classRecord): classRecord is StudentClass & { archived_at: string | null } =>
      Boolean(classRecord && !classRecord.archived_at),
    )
    .map(({ id, name, class_code, academic_year, subject }) => ({
      id,
      name,
      class_code,
      academic_year,
      subject,
    }));

  const exams = (examsResult.data ?? []) as StudentExam[];
  const openExams = exams.filter((exam) => {
    const startsAt = exam.available_from ? Date.parse(exam.available_from) : Number.NEGATIVE_INFINITY;
    const endsAt = exam.available_until ? Date.parse(exam.available_until) : Number.POSITIVE_INFINITY;
    return startsAt <= now && now < endsAt;
  });

  const classIds = classes.map((c) => c.id);
  let materials: ClassMaterialItem[] = [];
  if (classIds.length > 0) {
    try {
      const { data: materialsData } = await supabase
        .from('class_materials')
        .select('*')
        .in('class_id', classIds)
        .order('week_number', { ascending: true })
        .order('created_at', { ascending: false });

      if (materialsData) {
        materials = (materialsData as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          classId: String(row.class_id),
          teacherId: String(row.teacher_id),
          title: String(row.title || 'Tài liệu không tên'),
          description: row.description ? String(row.description) : null,
          materialType: (String(row.material_type || 'document') as 'document' | 'video' | 'link'),
          fileUrl: String(row.file_url || ''),
          fileName: row.file_name ? String(row.file_name) : null,
          fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
          mimeType: row.mime_type ? String(row.mime_type) : null,
          weekNumber: Number(row.week_number) || 1,
          createdAt: String(row.created_at || new Date().toISOString()),
        }));
      }
    } catch {
      // Table may be empty
    }
  }

  const errors = [
    profileResult.error,
    membershipsResult.error,
    examsResult.error,
    attemptsResult.error,
    submittedAttemptsResult.error,
    notificationsResult.error,
  ];

  return {
    studentId: user.id,
    studentName: profileResult.data?.full_name || user.email || 'Sinh viên',
    studentCode: profileResult.data?.student_code ?? null,
    classes,
    materials,
    openExams,
    attempts: (attemptsResult.data ?? []) as StudentAttempt[],
    submittedAttemptCount: submittedAttemptsResult.count ?? 0,
    notifications: (notificationsResult.data ?? []) as StudentNotification[],
    hasDataError: errors.some(Boolean),
  };
}
