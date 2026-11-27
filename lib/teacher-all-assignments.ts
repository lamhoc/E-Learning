import 'server-only';

import { redirect } from 'next/navigation';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  AssignmentSchema,
  AssignmentSubmissionSchema,
  ClassMembershipSchema,
  ClassSchema,
  ProfileSchema,
  SubjectSchema,
  UserSchema,
} from '@/lib/db/entities';
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

  if (!user) redirect('/login');
  if (role === 'student') redirect('/student/dashboard');
  if (role !== 'admin' && role !== 'teacher') redirect('/login');

  const { fullName } = await getCurrentProfile();
  const teacherName = fullName || user.email?.split('@')[0] || 'Giảng viên';

  const ds = await getDataSource();
  const classWhere: Record<string, unknown> = { archived_at: IsNull() };
  if (role === 'teacher') classWhere.teacher_id = user.id;

  const rawClasses = await ds.getRepository(ClassSchema).find({
    where: classWhere,
    order: { name: 'ASC' },
  });

  if (rawClasses.length === 0) {
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

  const classIds = rawClasses.map((c) => c.id);
  const subjectIds = Array.from(new Set(rawClasses.map((c) => c.subject_id)));

  const [subjects, memberships, assignmentsList] = await Promise.all([
    subjectIds.length
      ? ds.getRepository(SubjectSchema).find({ select: { id: true, name: true }, where: { id: In(subjectIds) } })
      : Promise.resolve([]),
    ds.getRepository(ClassMembershipSchema).find({
      select: { class_id: true },
      where: { class_id: In(classIds) },
    }),
    ds.getRepository(AssignmentSchema).find({
      where: { class_id: In(classIds) },
      order: { due_date: 'DESC' },
    }),
  ]);

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const classes: TeacherClassSummary[] = rawClasses.map((c) => ({
    id: c.id,
    name: c.name,
    class_code: c.class_code,
    academic_year: c.academic_year,
    subject_name: subjectMap.get(c.subject_id) || '',
  }));

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const studentCountMap = new Map<string, number>();
  for (const m of memberships) {
    studentCountMap.set(m.class_id, (studentCountMap.get(m.class_id) || 0) + 1);
  }

  const assignmentIds = assignmentsList.map((a) => a.id);
  const allSubmissions = assignmentIds.length
    ? await ds.getRepository(AssignmentSubmissionSchema).find({
        where: { assignment_id: In(assignmentIds) },
        order: { submitted_at: 'DESC' },
      })
    : [];

  const studentIds = Array.from(new Set(allSubmissions.map((s) => s.student_id)));
  const [profiles, users] = studentIds.length
    ? await Promise.all([
        ds.getRepository(ProfileSchema).find({ where: { id: In(studentIds) } }),
        ds.getRepository(UserSchema).find({ select: { id: true, email: true }, where: { id: In(studentIds) } }),
      ])
    : [[], []];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const submissionsMap = new Map<string, AssignmentSubmission[]>();
  for (const sub of allSubmissions) {
    if (!submissionsMap.has(sub.assignment_id)) submissionsMap.set(sub.assignment_id, []);
    const p = profileMap.get(sub.student_id);
    const studentProfile: StudentProfile | undefined = p
      ? {
          id: p.id,
          full_name: p.full_name,
          email: emailMap.get(p.id) || '',
          student_code: p.student_code,
        }
      : undefined;

    submissionsMap.get(sub.assignment_id)!.push({
      id: sub.id,
      assignment_id: sub.assignment_id,
      student_id: sub.student_id,
      file_url: sub.file_url,
      file_name: sub.file_name,
      file_size_bytes: sub.file_size_bytes !== null ? Number(sub.file_size_bytes) : null,
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
  }

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
