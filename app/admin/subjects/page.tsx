import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  ProfileSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
  UserRoleSchema,
} from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';
import {
  SubjectsManagerClient,
  type SubjectWithRelations,
  type AvailableTeacher,
} from './subjects-manager-client';

export const metadata: Metadata = {
  title: 'Quản lý Môn học | Quản trị LHU',
  description: 'Quản lý danh sách môn học, phân công giảng viên phụ trách và theo dõi lớp học mở toàn trường.',
};

export default async function AdminSubjectsPage() {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  // Bảo mật nghiêm ngặt cho Quản trị viên
  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const isDbAdmin = role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    redirect('/subjects');
  }

  const ds = await getDataSource();

  // Truy vấn dữ liệu song song tối ưu hiệu năng
  const [subjectsData, assignmentsData, classesData, teachersData] = await Promise.all([
    ds.getRepository(SubjectSchema).find({
      select: { id: true, code: true, name: true, description: true, created_at: true, archived_at: true },
      order: { created_at: 'DESC' },
    }),
    ds.getRepository(TeacherSubjectAssignmentSchema).find({
      select: { teacher_id: true, subject_id: true, assigned_at: true },
      order: { assigned_at: 'DESC' },
    }),
    ds.getRepository(ClassSchema).find({
      select: { id: true, subject_id: true, archived_at: true },
      where: { archived_at: IsNull() },
    }),
    ds.getRepository(UserRoleSchema).find({
      select: { user_id: true },
      where: { role: 'teacher' },
    }),
  ]);

  const teacherIds = teachersData.map((row) => row.user_id);

  // Lấy thông tin họ tên giảng viên từ bảng profiles
  const profilesData = teacherIds.length > 0
    ? await ds.getRepository(ProfileSchema).find({
        select: { id: true, full_name: true },
        where: { id: In(teacherIds) },
      })
    : [];

  const teacherNameMap = new Map(
    profilesData.map((p) => [
      p.id,
      sanitizeVietnameseText(p.full_name) || 'Giảng viên',
    ]),
  );

  const availableTeachers: AvailableTeacher[] = teacherIds.map((id) => ({
    id,
    name: teacherNameMap.get(id) || 'Giảng viên',
  })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  // Gom nhóm phân công theo subject_id
  const assignmentsBySubject = new Map<string, { id: string; name: string }[]>();
  for (const item of assignmentsData) {
    const teacherName = teacherNameMap.get(item.teacher_id) || 'Giảng viên';
    const list = assignmentsBySubject.get(item.subject_id) ?? [];
    list.push({ id: item.teacher_id, name: teacherName });
    assignmentsBySubject.set(item.subject_id, list);
  }

  // Gom nhóm đếm số lớp đang mở theo subject_id
  const classesCountBySubject = new Map<string, number>();
  for (const c of classesData) {
    const current = classesCountBySubject.get(c.subject_id) ?? 0;
    classesCountBySubject.set(c.subject_id, current + 1);
  }

  // Chuẩn bị danh sách môn học kèm quan hệ
  const subjects: SubjectWithRelations[] = subjectsData.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    description: s.description,
    created_at: s.created_at,
    archived_at: s.archived_at,
    classesCount: classesCountBySubject.get(s.id) ?? 0,
    assignedTeachers: assignmentsBySubject.get(s.id) ?? [],
  }));

  return (
    <div className="w-full max-w-6xl min-w-0 mx-auto space-y-6 px-3.5 sm:px-8 py-5 sm:py-9">
      {/* Header khu vực Quản trị môn học */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#154C99] dark:text-[#3B82F6]">
            Quản trị Đào tạo
          </span>
          <Badge className="border-[#154C99]/20 bg-[#154C99]/10 text-[#154C99] dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 text-[10px]">
            Học phần
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#154C99] text-white shadow-xs dark:bg-[#1E5BBB]">
            <BookOpen className="size-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Môn học Toàn trường
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
          Tạo và cấu hình danh mục môn học, phân công giảng viên phụ trách chuyên môn và theo dõi số lượng lớp học phần đang vận hành trên toàn hệ thống Đại học Lạc Hồng.
        </p>
      </section>

      {/* Trình quản lý tương tác Client */}
      <SubjectsManagerClient
        subjects={subjects}
        availableTeachers={availableTeachers}
      />
    </div>
  );
}

