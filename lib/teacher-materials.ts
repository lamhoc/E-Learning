import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // 1. Lấy danh sách lớp học của giảng viên
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

  const classIds = classes.map((c) => c.id);
  const classMap = new Map<string, TeacherClassSummary>();
  classes.forEach((c) => classMap.set(c.id, c));

  // 2. Lấy toàn bộ tài liệu học tập thuộc các lớp của giảng viên
  const { data: rawMaterials, error: matErr } = await adminClient
    .from('class_materials')
    .select('*')
    .in('class_id', classIds)
    .order('week_number', { ascending: true })
    .order('created_at', { ascending: false });

  if (matErr) {
    console.error('Lỗi khi lấy danh sách tài liệu:', matErr);
  }

  const materials: TeacherMaterialItem[] = (rawMaterials || []).map((m: any) => {
    const cls = classMap.get(m.class_id);
    return {
      id: String(m.id),
      classId: String(m.class_id),
      className: cls?.name || 'Lớp học',
      classCode: cls?.class_code || '',
      subjectName: cls?.subject_name || '',
      teacherId: String(m.teacher_id),
      title: String(m.title || 'Tài liệu không tên'),
      description: m.description ? String(m.description) : null,
      materialType: (String(m.material_type || 'document') as 'document' | 'video' | 'link'),
      fileUrl: String(m.file_url || ''),
      fileName: m.file_name ? String(m.file_name) : null,
      fileSizeBytes: m.file_size_bytes ? Number(m.file_size_bytes) : null,
      mimeType: m.mime_type ? String(m.mime_type) : null,
      weekNumber: Number(m.week_number) || 1,
      createdAt: String(m.created_at || new Date().toISOString()),
    };
  });

  // 3. Thống kê
  let documentCount = 0;
  let videoCount = 0;
  let linkCount = 0;
  materials.forEach((m) => {
    if (m.materialType === 'document') documentCount++;
    else if (m.materialType === 'video') videoCount++;
    else if (m.materialType === 'link') linkCount++;
  });

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

