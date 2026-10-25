import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Assignment = {
  id: string;
  class_id: string;
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
};

export type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  student_code: string | null;
};

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  note: string | null;
  submitted_at: string;
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
  student?: StudentProfile;
};

export type AssignmentWithStats = Assignment & {
  submission_count: number;
  graded_count: number;
  total_students: number;
};

export type AssignmentDetails = Assignment & {
  class: {
    id: string;
    name: string;
    class_code: string;
    academic_year: string;
    subject?: {
      name: string;
      code: string;
    } | null;
  };
  submissions: AssignmentSubmission[];
  total_students: number;
};

export type StudentAssignmentItem = Assignment & {
  class_name: string;
  class_code: string;
  subject_name?: string;
  submission?: AssignmentSubmission | null;
};

/**
 * Lấy danh sách bài tập của một lớp kèm thống kê nộp bài dành cho Giảng viên
 */
export async function getClassAssignments(classId: string): Promise<AssignmentWithStats[]> {
  const admin = createAdminClient();

  // 1. Đếm tổng số sinh viên trong lớp
  const { count: studentCount } = await admin
    .from('class_memberships')
    .select('student_id', { count: 'exact', head: true })
    .eq('class_id', classId);

  const totalStudents = studentCount || 0;

  // 2. Lấy danh sách bài tập của lớp
  const { data: assignments, error } = await admin
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });

  if (error || !assignments) {
    console.error('Error fetching assignments:', error?.message);
    return [];
  }

  if (assignments.length === 0) {
    return [];
  }

  // 3. Lấy thông tin bài nộp để tính stats
  const assignmentIds = assignments.map((a) => a.id);
  const { data: submissions } = await admin
    .from('assignment_submissions')
    .select('assignment_id, score')
    .in('assignment_id', assignmentIds);

  const submissionMap = new Map<string, { total: number; graded: number }>();
  for (const s of submissions || []) {
    const current = submissionMap.get(s.assignment_id) || { total: 0, graded: 0 };
    current.total += 1;
    if (s.score !== null) {
      current.graded += 1;
    }
    submissionMap.set(s.assignment_id, current);
  }

  return assignments.map((a) => {
    const stats = submissionMap.get(a.id) || { total: 0, graded: 0 };
    return {
      ...a,
      max_score: Number(a.max_score),
      submission_count: stats.total,
      graded_count: stats.graded,
      total_students: totalStudents,
    };
  });
}

/**
 * Lấy chi tiết bài tập kèm danh sách bài nộp của sinh viên cho Giảng viên chấm điểm
 */
export async function getAssignmentDetails(assignmentId: string): Promise<AssignmentDetails | null> {
  const admin = createAdminClient();

  // 1. Lấy thông tin bài tập và lớp học
  const { data: assignment, error: assignmentError } = await admin
    .from('assignments')
    .select(`
      *,
      classes (
        id,
        name,
        class_code,
        academic_year,
        subject_id,
        subjects (
          name,
          code
        )
      )
    `)
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    console.error('Error fetching assignment details:', assignmentError?.message);
    return null;
  }

  const classData = (assignment as any).classes;
  const subjectData = classData?.subjects;

  // 2. Lấy tổng số sinh viên trong lớp
  const { count: studentCount } = await admin
    .from('class_memberships')
    .select('student_id', { count: 'exact', head: true })
    .eq('class_id', assignment.class_id);

  // 3. Lấy danh sách bài nộp của bài tập
  const { data: submissions, error: subError } = await admin
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
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (subError) {
    console.error('Error fetching assignment submissions:', subError.message);
  }

  const mappedSubmissions: AssignmentSubmission[] = (submissions || []).map((sub: any) => ({
    ...sub,
    score: sub.score !== null ? Number(sub.score) : null,
    file_size_bytes: sub.file_size_bytes ? Number(sub.file_size_bytes) : null,
    student: sub.profiles
      ? {
          id: sub.profiles.id,
          full_name: sub.profiles.full_name,
          email: sub.profiles.email,
          student_code: sub.profiles.student_code,
        }
      : undefined,
  }));

  return {
    id: assignment.id,
    class_id: assignment.class_id,
    teacher_id: assignment.teacher_id,
    title: assignment.title,
    description: assignment.description,
    attachment_url: assignment.attachment_url,
    attachment_name: assignment.attachment_name,
    due_date: assignment.due_date,
    max_score: Number(assignment.max_score),
    status: assignment.status,
    created_at: assignment.created_at,
    updated_at: assignment.updated_at,
    class: {
      id: classData?.id || assignment.class_id,
      name: classData?.name || 'Lớp học',
      class_code: classData?.class_code || '',
      academic_year: classData?.academic_year || '',
      subject: subjectData ? { name: subjectData.name, code: subjectData.code } : null,
    },
    submissions: mappedSubmissions,
    total_students: studentCount || 0,
  };
}

/**
 * Lấy toàn bộ bài tập của sinh viên qua các lớp đã ghi danh
 */
export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentItem[]> {
  const admin = createAdminClient();

  // 1. Tìm các lớp học mà sinh viên đang tham gia
  const { data: memberships } = await admin
    .from('class_memberships')
    .select('class_id')
    .eq('student_id', studentId);

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const classIds = memberships.map((m) => m.class_id);

  // 2. Lấy danh sách bài tập thuộc các lớp đó
  const { data: assignments, error } = await admin
    .from('assignments')
    .select(`
      *,
      classes (
        id,
        name,
        class_code,
        subjects (
          name
        )
      )
    `)
    .in('class_id', classIds)
    .neq('status', 'draft')
    .order('due_date', { ascending: false });

  if (error || !assignments) {
    console.error('Error fetching student assignments:', error?.message);
    return [];
  }

  if (assignments.length === 0) {
    return [];
  }

  const assignmentIds = assignments.map((a) => a.id);

  // 3. Lấy bài nộp tương ứng của sinh viên
  const { data: submissions } = await admin
    .from('assignment_submissions')
    .select('*')
    .in('assignment_id', assignmentIds)
    .eq('student_id', studentId);

  const subMap = new Map<string, any>();
  for (const s of submissions || []) {
    subMap.set(s.assignment_id, s);
  }

  return assignments.map((a: any) => {
    const rawSub = subMap.get(a.id);
    const sub: AssignmentSubmission | null = rawSub
      ? {
          ...rawSub,
          score: rawSub.score !== null ? Number(rawSub.score) : null,
          file_size_bytes: rawSub.file_size_bytes ? Number(rawSub.file_size_bytes) : null,
        }
      : null;

    const classItem = a.classes;
    const subjectItem = classItem?.subjects;

    return {
      id: a.id,
      class_id: a.class_id,
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
      class_name: classItem?.name || 'Lớp học',
      class_code: classItem?.class_code || '',
      subject_name: subjectItem?.name || undefined,
      submission: sub,
    };
  });
}

