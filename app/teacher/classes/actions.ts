'use server';

import { revalidatePath } from 'next/cache';
import { In } from 'typeorm';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassMembershipSchema,
  ProfileSchema,
  TeacherApplicationSchema,
  UserRoleSchema,
  UserSchema,
} from '@/lib/db/entities';
import { findStudentRecordByIdentifier, isClassStaff } from '@/lib/db/class-roster-service';

export type StudentLookupState = {
  status: 'idle' | 'error' | 'found';
  message: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
    studentCode: string;
    alreadyEnrolled: boolean;
  };
};

export type MembershipActionState = {
  status: 'idle' | 'error' | 'success';
  message: string;
};

export type CsvPreviewRow = {
  rowNumber: number;
  identifier: string;
  result: 'ready' | 'not_found' | 'already_enrolled' | 'duplicate' | 'invalid';
  studentId: string | null;
  fullName: string | null;
  email: string | null;
  studentCode: string | null;
};

export type CsvPreviewState = {
  status: 'idle' | 'error' | 'ready';
  message: string;
  requestKey?: string;
  rows?: CsvPreviewRow[];
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function findStudentForClass(
  _previousState: StudentLookupState,
  formData: FormData,
): Promise<StudentLookupState> {
  const classId = String(formData.get('classId') ?? '');
  const identifier = String(formData.get('identifier') ?? '').trim().toLowerCase();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isStudentCode = /^sv[0-9]{6,}$/.test(identifier);
  if (!uuidPattern.test(classId) || (!isEmail && !isStudentCode)) {
    return { status: 'error', message: 'Nhập mã sinh viên hoặc email chính xác.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };
  }

  if (!(await isClassStaff(user.id, role, classId))) {
    return { status: 'error', message: 'Bạn không có quyền quản lý danh sách sinh viên của lớp này.' };
  }

  const student = await findStudentRecordByIdentifier(identifier);
  if (!student) {
    return { status: 'error', message: 'Không tìm thấy tài khoản sinh viên với mã hoặc email này.' };
  }

  const ds = await getDataSource();
  const membership = await ds.getRepository(ClassMembershipSchema).findOne({
    where: { class_id: classId, student_id: student.student_id },
  });
  const alreadyEnrolled = Boolean(membership);

  return {
    status: 'found',
    message: alreadyEnrolled ? 'Sinh viên này đã có trong lớp.' : 'Đã tìm thấy tài khoản sinh viên.',
    student: {
      id: student.student_id,
      fullName: student.full_name,
      email: student.student_email,
      studentCode: student.student_code ?? '',
      alreadyEnrolled,
    },
  };
}

export async function enrollStudentInClass(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  if (!uuidPattern.test(classId) || !uuidPattern.test(studentId)) {
    return { status: 'error', message: 'Thông tin lớp hoặc sinh viên không hợp lệ.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };
  }

  if (!(await isClassStaff(user.id, role, classId))) {
    return { status: 'error', message: 'Bạn không có quyền ghi danh sinh viên vào lớp này.' };
  }

  const ds = await getDataSource();
  const [roleRow, appRow] = await Promise.all([
    ds.getRepository(UserRoleSchema).findOne({ where: { user_id: studentId } }),
    ds.getRepository(TeacherApplicationSchema).findOne({ where: { user_id: studentId } }),
  ]);

  if (roleRow?.role !== 'student' || appRow) {
    return { status: 'error', message: 'Không thể ghi danh. Tài khoản phải có role sinh viên.' };
  }

  const cmRepo = ds.getRepository(ClassMembershipSchema);
  const existing = await cmRepo.findOne({ where: { class_id: classId, student_id: studentId } });
  let inserted = false;
  if (!existing) {
    await cmRepo.save(cmRepo.create({ class_id: classId, student_id: studentId }));
    inserted = true;
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return {
    status: 'success',
    message: inserted ? 'Đã thêm sinh viên vào lớp.' : 'Sinh viên đã có trong lớp.',
  };
}

export async function unenrollStudentFromClass(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  if (!uuidPattern.test(classId) || !uuidPattern.test(studentId)) {
    return { status: 'error', message: 'Thông tin lớp hoặc sinh viên không hợp lệ.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };
  }

  if (!(await isClassStaff(user.id, role, classId))) {
    return { status: 'error', message: 'Bạn không có quyền chỉnh sửa danh sách sinh viên của lớp này.' };
  }

  const ds = await getDataSource();
  const delResult = await ds
    .getRepository(ClassMembershipSchema)
    .delete({ class_id: classId, student_id: studentId });

  revalidatePath(`/teacher/classes/${classId}`);
  return {
    status: 'success',
    message: (delResult.affected ?? 0) > 0 ? 'Đã gỡ sinh viên khỏi lớp.' : 'Sinh viên không còn trong lớp.',
  };
}

export async function previewClassEnrollmentCsv(
  _previousState: CsvPreviewState,
  formData: FormData,
): Promise<CsvPreviewState> {
  const classId = String(formData.get('classId') ?? '');
  const identifiersJson = String(formData.get('identifiersJson') ?? '');
  const errorState = (message: string): CsvPreviewState => ({
    status: 'error',
    message,
    ...(identifiersJson.length <= 100_000 ? { requestKey: identifiersJson } : {}),
  });
  if (!uuidPattern.test(classId) || identifiersJson.length > 100_000) {
    return errorState('File CSV không hợp lệ hoặc vượt quá giới hạn.');
  }

  let identifiers: unknown;
  try {
    identifiers = JSON.parse(identifiersJson);
  } catch {
    return errorState('Không đọc được dữ liệu CSV. Hãy chọn file và thử lại.');
  }

  if (
    !Array.isArray(identifiers)
    || identifiers.length === 0
    || identifiers.length > 500
    || identifiers.some((identifier) => typeof identifier !== 'string' || identifier.length > 320)
  ) {
    return errorState('CSV cần có từ 1 đến 500 dòng dữ liệu hợp lệ.');
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return errorState('Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.');
  }
  if (!(await isClassStaff(user.id, role, classId))) {
    return errorState('Bạn không có quyền quản lý danh sách sinh viên của lớp này.');
  }

  const ds = await getDataSource();
  const [studentRoles, teacherApps, existingMemberships] = await Promise.all([
    ds.getRepository(UserRoleSchema).find({ select: { user_id: true }, where: { role: 'student' } }),
    ds.getRepository(TeacherApplicationSchema).find({ select: { user_id: true } }),
    ds.getRepository(ClassMembershipSchema).find({ select: { student_id: true }, where: { class_id: classId } }),
  ]);

  const appSet = new Set(teacherApps.map((a) => a.user_id));
  const eligibleStudentIds = studentRoles.map((r) => r.user_id).filter((id) => !appSet.has(id));
  const enrolledSet = new Set(existingMemberships.map((m) => m.student_id));

  const [profiles, users] = eligibleStudentIds.length
    ? await Promise.all([
        ds.getRepository(ProfileSchema).find({ where: { id: In(eligibleStudentIds) } }),
        ds.getRepository(UserSchema).find({ select: { id: true, email: true }, where: { id: In(eligibleStudentIds) } }),
      ])
    : [[], []];

  const byEmail = new Map<string, { id: string; fullName: string; email: string; code: string | null }>();
  const byCode = new Map<string, { id: string; fullName: string; email: string; code: string | null }>();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  for (const u of users) {
    const p = profileMap.get(u.id);
    if (!p) continue;
    const item = {
      id: u.id,
      fullName: p.full_name || u.email,
      email: u.email,
      code: p.student_code,
    };
    byEmail.set(u.email.toLowerCase(), item);
    if (p.student_code) byCode.set(p.student_code.toLowerCase(), item);
  }

  const seenIdentifiers = new Set<string>();
  const seenStudentIds = new Set<string>();
  const rows: CsvPreviewRow[] = [];

  (identifiers as string[]).forEach((rawId, idx) => {
    const normalized = rawId.trim().toLowerCase();
    const isValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || /^sv[0-9]{6,}$/.test(normalized);

    if (!normalized || !isValid) {
      rows.push({
        rowNumber: idx + 1,
        identifier: rawId,
        result: 'invalid',
        studentId: null,
        fullName: null,
        email: null,
        studentCode: null,
      });
      return;
    }

    const matched = byEmail.get(normalized) ?? byCode.get(normalized) ?? null;

    if (seenIdentifiers.has(normalized) || (matched && seenStudentIds.has(matched.id))) {
      rows.push({
        rowNumber: idx + 1,
        identifier: rawId,
        result: 'duplicate',
        studentId: matched?.id ?? null,
        fullName: matched?.fullName ?? null,
        email: matched?.email ?? null,
        studentCode: matched?.code ?? null,
      });
      return;
    }

    seenIdentifiers.add(normalized);
    if (matched) seenStudentIds.add(matched.id);

    if (!matched) {
      rows.push({
        rowNumber: idx + 1,
        identifier: rawId,
        result: 'not_found',
        studentId: null,
        fullName: null,
        email: null,
        studentCode: null,
      });
      return;
    }

    rows.push({
      rowNumber: idx + 1,
      identifier: rawId,
      result: enrolledSet.has(matched.id) ? 'already_enrolled' : 'ready',
      studentId: matched.id,
      fullName: matched.fullName,
      email: matched.email,
      studentCode: matched.code,
    });
  });

  return {
    status: 'ready',
    message: `Đã kiểm tra ${rows.length} dòng. Chỉ các dòng hợp lệ mới được thêm.`,
    requestKey: identifiersJson,
    rows,
  };
}

export async function bulkEnrollClassCsv(
  _previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const classId = String(formData.get('classId') ?? '');
  const studentIdsJson = String(formData.get('studentIdsJson') ?? '');
  if (!uuidPattern.test(classId) || studentIdsJson.length > 30_000) {
    return { status: 'error', message: 'Dữ liệu CSV không hợp lệ hoặc vượt quá giới hạn.' };
  }

  let studentIds: unknown;
  try {
    studentIds = JSON.parse(studentIdsJson);
  } catch {
    return { status: 'error', message: 'Không đọc được danh sách đã xác nhận.' };
  }

  if (
    !Array.isArray(studentIds)
    || studentIds.length === 0
    || studentIds.length > 500
    || studentIds.some((studentId) => typeof studentId !== 'string' || !uuidPattern.test(studentId))
  ) {
    return { status: 'error', message: 'Không có dòng hợp lệ để ghi danh.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Bạn cần đăng nhập bằng tài khoản admin hoặc giảng viên.' };
  }
  if (!(await isClassStaff(user.id, role, classId))) {
    return { status: 'error', message: 'Bạn không có quyền ghi danh sinh viên vào lớp này.' };
  }

  const uniqueIds = Array.from(new Set(studentIds as string[]));
  const ds = await getDataSource();

  const [roles, apps, existingMemberships] = await Promise.all([
    ds.getRepository(UserRoleSchema).find({ where: { user_id: In(uniqueIds) } }),
    ds.getRepository(TeacherApplicationSchema).find({ where: { user_id: In(uniqueIds) } }),
    ds.getRepository(ClassMembershipSchema).find({
      where: { class_id: classId, student_id: In(uniqueIds) },
    }),
  ]);

  const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
  const appSet = new Set(apps.map((a) => a.user_id));
  const enrolledSet = new Set(existingMemberships.map((m) => m.student_id));

  let added = 0;
  let existing = 0;
  let rejected = 0;
  const toInsert: { class_id: string; student_id: string }[] = [];

  for (const sid of uniqueIds) {
    if (roleMap.get(sid) !== 'student' || appSet.has(sid)) {
      rejected++;
      continue;
    }
    if (enrolledSet.has(sid)) {
      existing++;
      continue;
    }
    toInsert.push({ class_id: classId, student_id: sid });
    added++;
  }

  if (toInsert.length > 0) {
    const cmRepo = ds.getRepository(ClassMembershipSchema);
    await cmRepo.save(toInsert.map((item) => cmRepo.create(item)));
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return {
    status: 'success',
    message: `Đã thêm ${added} sinh viên; ${existing} đã có trong lớp; ${rejected} tài khoản không còn role sinh viên.`,
  };
}
