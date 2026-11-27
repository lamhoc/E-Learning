import 'server-only';

import { In, Not } from 'typeorm';
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

export async function getClassAssignments(classId: string): Promise<AssignmentWithStats[]> {
  const ds = await getDataSource();

  const [totalStudents, assignments] = await Promise.all([
    ds.getRepository(ClassMembershipSchema).count({ where: { class_id: classId } }),
    ds.getRepository(AssignmentSchema).find({
      where: { class_id: classId },
      order: { due_date: 'DESC' },
    }),
  ]);

  if (assignments.length === 0) return [];

  const assignmentIds = assignments.map((a) => a.id);
  const submissions = await ds.getRepository(AssignmentSubmissionSchema).find({
    select: { assignment_id: true, score: true },
    where: { assignment_id: In(assignmentIds) },
  });

  const submissionMap = new Map<string, { total: number; graded: number }>();
  for (const s of submissions) {
    const current = submissionMap.get(s.assignment_id) || { total: 0, graded: 0 };
    current.total += 1;
    if (s.score !== null) current.graded += 1;
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

export async function getAssignmentDetails(assignmentId: string): Promise<AssignmentDetails | null> {
  const ds = await getDataSource();
  const assignment = await ds.getRepository(AssignmentSchema).findOne({
    where: { id: assignmentId },
  });

  if (!assignment) return null;

  const [classData, studentCount, submissions] = await Promise.all([
    ds.getRepository(ClassSchema).findOne({ where: { id: assignment.class_id } }),
    ds.getRepository(ClassMembershipSchema).count({ where: { class_id: assignment.class_id } }),
    ds.getRepository(AssignmentSubmissionSchema).find({
      where: { assignment_id: assignmentId },
      order: { submitted_at: 'DESC' },
    }),
  ]);

  const subjectData = classData
    ? await ds.getRepository(SubjectSchema).findOne({
        select: { name: true, code: true },
        where: { id: classData.subject_id },
      })
    : null;

  const studentIds = Array.from(new Set(submissions.map((s) => s.student_id)));
  const [profiles, users] = studentIds.length
    ? await Promise.all([
        ds.getRepository(ProfileSchema).find({ where: { id: In(studentIds) } }),
        ds.getRepository(UserSchema).find({ select: { id: true, email: true }, where: { id: In(studentIds) } }),
      ])
    : [[], []];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const mappedSubmissions: AssignmentSubmission[] = submissions.map((sub) => {
    const p = profileMap.get(sub.student_id);
    return {
      ...sub,
      is_late: Boolean(sub.is_late),
      score: sub.score !== null ? Number(sub.score) : null,
      file_size_bytes: sub.file_size_bytes !== null ? Number(sub.file_size_bytes) : null,
      student: p
        ? {
            id: p.id,
            full_name: p.full_name,
            email: emailMap.get(p.id) || '',
            student_code: p.student_code,
          }
        : undefined,
    };
  });

  return {
    ...assignment,
    max_score: Number(assignment.max_score),
    class: {
      id: classData?.id || assignment.class_id,
      name: classData?.name || 'Lớp học',
      class_code: classData?.class_code || '',
      academic_year: classData?.academic_year || '',
      subject: subjectData ? { name: subjectData.name, code: subjectData.code } : null,
    },
    submissions: mappedSubmissions,
    total_students: studentCount,
  };
}

export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentItem[]> {
  const ds = await getDataSource();
  const memberships = await ds.getRepository(ClassMembershipSchema).find({
    select: { class_id: true },
    where: { student_id: studentId },
  });

  if (memberships.length === 0) return [];

  const classIds = memberships.map((m) => m.class_id);
  const [assignments, classes] = await Promise.all([
    ds.getRepository(AssignmentSchema).find({
      where: { class_id: In(classIds), status: Not('draft') },
      order: { due_date: 'DESC' },
    }),
    ds.getRepository(ClassSchema).find({ where: { id: In(classIds) } }),
  ]);

  if (assignments.length === 0) return [];

  const subjectIds = Array.from(new Set(classes.map((c) => c.subject_id)));
  const assignmentIds = assignments.map((a) => a.id);

  const [subjects, submissions] = await Promise.all([
    subjectIds.length
      ? ds.getRepository(SubjectSchema).find({ select: { id: true, name: true }, where: { id: In(subjectIds) } })
      : Promise.resolve([]),
    ds.getRepository(AssignmentSubmissionSchema).find({
      where: { assignment_id: In(assignmentIds), student_id: studentId },
    }),
  ]);

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const subMap = new Map(submissions.map((s) => [s.assignment_id, s]));

  return assignments.map((a) => {
    const rawSub = subMap.get(a.id);
    const sub: AssignmentSubmission | null = rawSub
      ? {
          ...rawSub,
          is_late: Boolean(rawSub.is_late),
          score: rawSub.score !== null ? Number(rawSub.score) : null,
          file_size_bytes: rawSub.file_size_bytes !== null ? Number(rawSub.file_size_bytes) : null,
        }
      : null;

    const classItem = classMap.get(a.class_id);
    const subjectName = classItem ? subjectMap.get(classItem.subject_id) : undefined;

    return {
      ...a,
      max_score: Number(a.max_score),
      class_name: classItem?.name || 'Lớp học',
      class_code: classItem?.class_code || '',
      subject_name: subjectName,
      submission: sub,
    };
  });
}
