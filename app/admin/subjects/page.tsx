import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
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
  const { user, role, supabase } = await getCurrentUserWithRole();

  if (!user) {
    redirect('/login');
  }

  // Bảo mật nghiêm ngặt cho Quản trị viên
  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const isDbAdmin = role === 'admin';

  if (!isMetadataAdmin && !isDbAdmin) {
    redirect('/subjects');
  }

  // Truy vấn dữ liệu song song tối ưu hiệu năng
  const [subjectsResult, assignmentsResult, classesResult, teachersResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, code, name, description, created_at, archived_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('teacher_subject_assignments')
      .select('teacher_id, subject_id, assigned_at')
      .order('assigned_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, subject_id, archived_at')
      .is('archived_at', null),
    supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'teacher'),
  ]);

  const teacherIds = (teachersResult.data ?? []).map((row) => row.user_id);

  // Lấy thông tin họ tên giảng viên từ bảng profiles
  const profilesResult = teacherIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', teacherIds)
    : { data: [] };

  const teacherNameMap = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id,
      sanitizeVietnameseText(p.full_name) || 'Giảng viên',
    ])
  );

  const availableTeachers: AvailableTeacher[] = teacherIds.map((id) => ({
    id,
    name: teacherNameMap.get(id) || 'Giảng viên',
  })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  // Gom nhóm phân công theo subject_id
  const assignmentsBySubject = new Map<string, { id: string; name: string }[]>();
  for (const item of assignmentsResult.data ?? []) {
    const teacherName = teacherNameMap.get(item.teacher_id) || 'Giảng viên';
    const list = assignmentsBySubject.get(item.subject_id) ?? [];
    list.push({ id: item.teacher_id, name: teacherName });
    assignmentsBySubject.set(item.subject_id, list);
  }

  // Gom nhóm đếm số lớp đang mở theo subject_id
  const classesCountBySubject = new Map<string, number>();
  for (const c of classesResult.data ?? []) {
    const current = classesCountBySubject.get(c.subject_id) ?? 0;
    classesCountBySubject.set(c.subject_id, current + 1);
  }

  // Chuẩn bị danh sách môn học kèm quan hệ
  const subjects: SubjectWithRelations[] = (subjectsResult.data ?? []).map((s) => ({
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
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
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

