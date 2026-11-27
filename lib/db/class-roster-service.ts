import 'server-only';

import { In } from 'typeorm';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassMembershipSchema,
  ClassSchema,
  ProfileSchema,
  TeacherApplicationSchema,
  TeacherSubjectAssignmentSchema,
  UserRoleSchema,
  UserSchema,
  type AppRole,
} from '@/lib/db/entities';

export async function isClassStaff(
  userId: string,
  role: AppRole | null,
  classId: string,
): Promise<boolean> {
  if (role === 'admin') return true;
  if (role !== 'teacher') return false;

  const ds = await getDataSource();
  const cls = await ds.getRepository(ClassSchema).findOne({
    where: { id: classId, teacher_id: userId },
    select: { id: true, subject_id: true },
  });
  if (!cls) return false;

  const tsa = await ds.getRepository(TeacherSubjectAssignmentSchema).findOne({
    where: { teacher_id: userId, subject_id: cls.subject_id },
  });
  return Boolean(tsa);
}

export async function listClassRoster(classId: string) {
  const ds = await getDataSource();
  const memberships = await ds.getRepository(ClassMembershipSchema).find({
    where: { class_id: classId },
  });
  if (memberships.length === 0) return [];

  const studentIds = memberships.map((m) => m.student_id);
  const [profiles, users] = await Promise.all([
    ds.getRepository(ProfileSchema).find({ where: { id: In(studentIds) } }),
    ds.getRepository(UserSchema).find({ select: { id: true, email: true }, where: { id: In(studentIds) } }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  return memberships
    .map((m) => {
      const p = profileMap.get(m.student_id);
      const email = emailMap.get(m.student_id) || '';
      return {
        student_id: m.student_id,
        full_name: p?.full_name || email,
        student_email: email,
        student_code: p?.student_code || '',
        enrolled_at: m.enrolled_at,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi') || a.student_email.localeCompare(b.student_email));
}

export async function findStudentRecordByIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const ds = await getDataSource();

  let matchedUserId: string | null = null;
  let matchedEmail = '';

  const byEmail = await ds.getRepository(UserSchema).findOne({
    where: { email: normalized },
    select: { id: true, email: true },
  });

  if (byEmail) {
    matchedUserId = byEmail.id;
    matchedEmail = byEmail.email;
  } else {
    const byCode = await ds
      .getRepository(ProfileSchema)
      .createQueryBuilder('p')
      .where('LOWER(p.student_code) = :code', { code: normalized })
      .getOne();
    if (byCode) {
      matchedUserId = byCode.id;
      const u = await ds.getRepository(UserSchema).findOne({
        where: { id: byCode.id },
        select: { email: true },
      });
      matchedEmail = u?.email || '';
    }
  }

  if (!matchedUserId) return null;

  const [roleRow, appRow, profile] = await Promise.all([
    ds.getRepository(UserRoleSchema).findOne({ where: { user_id: matchedUserId } }),
    ds.getRepository(TeacherApplicationSchema).findOne({ where: { user_id: matchedUserId } }),
    ds.getRepository(ProfileSchema).findOne({ where: { id: matchedUserId } }),
  ]);

  if (roleRow?.role !== 'student' || appRow) return null;

  return {
    student_id: matchedUserId,
    full_name: profile?.full_name || matchedEmail,
    student_email: matchedEmail,
    student_code: profile?.student_code ?? null,
  };
}
