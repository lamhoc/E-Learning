import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AssignmentSubmission, StudentProfile } from '@/lib/assignments';

export type TeacherClassSummary = {
  id: string;
  name: string;
  class_code: string;
  academic_year: string;
  subject_name: string;
};

export type TeacherAssignmentItem = {
  id: string;
  class_id: string;
  class_name: string;
  class_code: string;
  subject_name: string;
  teacher_id: string;
  title: string;
  description: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  due_date: string;
  max_score: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  updated_at: string;
  submission_count: number;
  graded_count: number;
  pending_count: number;
  total_students: number;
  submissions: AssignmentSubmission[];
};

export type TeacherAllAssignmentsData = {
  teacherId: string;
  teacherName: string;
  userRole: 'admin' | 'teacher';
  classes: TeacherClassSummary[];
  assignments: TeacherAssignmentItem[];
  stats: {
    totalAssignments: number;
    totalSubmissions: number;
    pendingGradingCount: number;
    gradedCount: number;
  };
};

export async function getTeacherAllAssignmentsData(): Promise<TeacherAllAssignmentsData> {
  const { user, role } = await getCurrentUserWithRole();

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

  const adminClient = createAdminClient();

  // 1. Lấy danh sách lớp học phụ trách
  let classesQuery = adminClient
    .from('classes')
    .select('id, name, class_code, academic_year, subject:subjects(name)')
    .is('archived_at', null)
    .order('name');

  if (role === 'teacher') {
    classesQuery = classesQuery.eq('teacher_id', user.id);
  }

  const { data: rawClasses, error: classErr } = await classesQuery;
  if (classErr) {
    console.error('Lỗi khi lấy danh sách lớp học:', classErr);
  }

  const classes: TeacherClassSummary[] = (rawClasses || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    class_code: c.class_code,
    academic_year: c.academic_year,
    subject_name: Array.isArray(c.subject) ? c.subject[0]?.name || '' : c.subject?.name || '',
  }));

  if (classes.length === 0) {
    return {
      teacherId: user.id,
      teacherName,
      userRole: role,
      classes: [],
      assignments: [],
      stats: {
        totalAssignments: 0,
        totalSubmissions: 0,
        pendingGradingCount: 0,
        gradedCount: 0,
      },
    };
  }

  const classIds = classes.map((c) => c.id);
  const classMap = new Map<string, TeacherClassSummary>();
  classes.forEach((c) => classMap.set(c.id, c));

  // 2. Lấy số lượng sinh viên trong từng lớp
  const { data: memberships } = await adminClient
    .from('class_memberships')
    .select('class_id')
    .in('class_id', classIds);

  const studentCountMap = new Map<string, number>();
  (memberships || []).forEach((m) => {
    studentCountMap.set(m.class_id, (studentCountMap.get(m.class_id) || 0) + 1);
  });

  // 3. Lấy toàn bộ bài tập của các lớp
  const { data: rawAssignments, error: assignErr } = await adminClient
    .from('assignments')
    .select('*')
    .in('class_id', classIds)
    .order('due_date', { ascending: false });

  if (assignErr) {
    console.error('Lỗi khi lấy danh sách bài tập:', assignErr);
  }

  const assignmentsList = rawAssignments || [];
  const assignmentIds = assignmentsList.map((a) => a.id);

  // 4. Lấy toàn bộ bài nộp kèm thông tin sinh viên
  let allSubmissions: any[] = [];
  if (assignmentIds.length > 0) {
    const { data: subs, error: subErr } = await adminClient
      .from('assignment_submissions')
      .select(`
        *,
        profiles:student_id (
          id,
          full_name,
          email,
          student_code
        )
      `)
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false });

    if (subErr) {
      console.error('Lỗi khi lấy danh sách bài nộp:', subErr);
    }
    allSubmissions = subs || [];
  }

  // Nhóm submissions theo assignment_id
  const submissionsMap = new Map<string, AssignmentSubmission[]>();
  allSubmissions.forEach((sub) => {
    const aid = sub.assignment_id;
    if (!submissionsMap.has(aid)) {
      submissionsMap.set(aid, []);
    }
    const studentProfile: StudentProfile | undefined = sub.profiles
      ? {
          id: sub.profiles.id,
          full_name: sub.profiles.full_name,
          email: sub.profiles.email,
          student_code: sub.profiles.student_code,
        }
      : undefined;

    submissionsMap.get(aid)!.push({
      id: sub.id,
      assignment_id: sub.assignment_id,
      student_id: sub.student_id,
      file_url: sub.file_url,
      file_name: sub.file_name,
      file_size_bytes: sub.file_size_bytes ? Number(sub.file_size_bytes) : null,
      note: sub.note,
      submitted_at: sub.submitted_at,
      is_late: Boolean(sub.is_late),
      score: sub.score !== null ? Number(sub.score) : null,
      feedback: sub.feedback,
      graded_at: sub.graded_at,
      graded_by: sub.graded_by,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
      student: studentProfile,
    });
  });

  // 5. Tính toán stats
  let totalSubmissions = 0;
  let pendingGradingCount = 0;
  let gradedCount = 0;

  const assignments: TeacherAssignmentItem[] = assignmentsList.map((a) => {
    const cls = classMap.get(a.class_id);
    const subs = submissionsMap.get(a.id) || [];
    const graded = subs.filter((s) => s.score !== null).length;
    const pending = subs.filter((s) => s.score === null).length;

    totalSubmissions += subs.length;
    gradedCount += graded;
    pendingGradingCount += pending;

    return {
      id: a.id,
      class_id: a.class_id,
      class_name: cls?.name || 'Lớp học',
      class_code: cls?.class_code || '',
      subject_name: cls?.subject_name || '',
      teacher_id: a.teacher_id,
      title: a.title,
      description: a.description,
      attachment_url: a.attachment_url,
      attachment_name: a.attachment_name,
      due_date: a.due_date,
      max_score: Number(a.max_score),
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      submission_count: subs.length,
      graded_count: graded,
      pending_count: pending,
      total_students: studentCountMap.get(a.class_id) || 0,
      submissions: subs,
    };
  });

  return {
    teacherId: user.id,
    teacherName,
    userRole: role,
    classes,
    assignments,
    stats: {
      totalAssignments: assignments.length,
      totalSubmissions,
      pendingGradingCount,
      gradedCount,
    },
  };
}

