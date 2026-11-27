import 'server-only';

import { redirect } from 'next/navigation';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import { ClassMaterialSchema, ClassSchema, SubjectSchema } from '@/lib/db/entities';

export type TeacherClassSummary = {
  id: string;
  name: string;
  class_code: string;
  academic_year: string;
  subject_name: string;
};

export type TeacherMaterialItem = {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  subjectName: string;
  teacherId: string;
  title: string;
  description: string | null;
  materialType: 'document' | 'video' | 'link';
  fileUrl: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  weekNumber: number;
  createdAt: string;
};

export type TeacherMaterialsData = {
  teacherId: string;
  teacherName: string;
  userRole: 'admin' | 'teacher';
  classes: TeacherClassSummary[];
  materials: TeacherMaterialItem[];
  stats: {
    totalMaterials: number;
    totalClasses: number;
    documentCount: number;
    videoCount: number;
    linkCount: number;
  };
};

export async function getTeacherMaterialsData(): Promise<TeacherMaterialsData> {
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
      materials: [],
      stats: {
        totalMaterials: 0,
        totalClasses: 0,
        documentCount: 0,
        videoCount: 0,
        linkCount: 0,
      },
    };
  }

  const subjectIds = Array.from(new Set(rawClasses.map((c) => c.subject_id)));
  const classIds = rawClasses.map((c) => c.id);

  const [subjects, rawMaterials] = await Promise.all([
    subjectIds.length
      ? ds.getRepository(SubjectSchema).find({ select: { id: true, name: true }, where: { id: In(subjectIds) } })
      : Promise.resolve([]),
    ds.getRepository(ClassMaterialSchema).find({
      where: { class_id: In(classIds) },
      order: { week_number: 'ASC', created_at: 'DESC' },
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

  const materials: TeacherMaterialItem[] = rawMaterials.map((m) => {
    const cls = classMap.get(m.class_id);
    return {
      id: m.id,
      classId: m.class_id,
      className: cls?.name || 'Lớp học',
      classCode: cls?.class_code || '',
      subjectName: cls?.subject_name || '',
      teacherId: m.teacher_id,
      title: m.title || 'Tài liệu không tên',
      description: m.description ?? null,
      materialType: m.material_type,
      fileUrl: m.file_url,
      fileName: m.file_name ?? null,
      fileSizeBytes: m.file_size_bytes !== null ? Number(m.file_size_bytes) : null,
      mimeType: m.mime_type ?? null,
      weekNumber: Number(m.week_number) || 1,
      createdAt: m.created_at || new Date().toISOString(),
    };
  });

  let documentCount = 0;
  let videoCount = 0;
  let linkCount = 0;
  for (const m of materials) {
    if (m.materialType === 'document') documentCount++;
    else if (m.materialType === 'video') videoCount++;
    else if (m.materialType === 'link') linkCount++;
  }

  return {
    teacherId: user.id,
    teacherName,
    userRole: role,
    classes,
    materials,
    stats: {
      totalMaterials: materials.length,
      totalClasses: classes.length,
      documentCount,
      videoCount,
      linkCount,
    },
  };
}
