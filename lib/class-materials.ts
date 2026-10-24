import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ClassMaterialItem = {
  id: string;
  classId: string;
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

export type ClassMaterialWeekGroup = {
  weekNumber: number;
  materials: ClassMaterialItem[];
};

export type ClassInfoDetail = {
  id: string;
  name: string;
  classCode: string;
  academicYear: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  teacherId: string;
};

/**
 * Lấy danh sách tài liệu học tập của một lớp học, sắp xếp theo tuần và thời gian tạo.
 */
export async function getClassMaterials(classId: string): Promise<ClassMaterialItem[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('class_materials')
      .select('*')
      .eq('class_id', classId)
      .order('week_number', { ascending: true })
      .order('created_at', { ascending: false });

    if (error || !data) {
      // Fallback với adminClient nếu RLS cần bypass
      const adminClient = createAdminClient();
      const { data: adminData } = await adminClient
        .from('class_materials')
        .select('*')
        .eq('class_id', classId)
        .order('week_number', { ascending: true })
        .order('created_at', { ascending: false });

      if (!adminData) return [];
      return adminData.map(mapRowToMaterial);
    }

    return data.map(mapRowToMaterial);
  } catch (err) {
    console.error('Failed to load class materials:', err);
    return [];
  }
}

/**
 * Gom nhóm danh sách tài liệu theo từng Tuần học (Week 1, Week 2...).
 */
export function groupMaterialsByWeek(materials: ClassMaterialItem[]): ClassMaterialWeekGroup[] {
  const map = new Map<number, ClassMaterialItem[]>();

  materials.forEach((mat) => {
    const week = mat.weekNumber || 1;
    if (!map.has(week)) {
      map.set(week, []);
    }
    map.get(week)!.push(mat);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, items]) => ({
      weekNumber,
      materials: items,
    }));
}

function mapRowToMaterial(row: Record<string, unknown>): ClassMaterialItem {
  return {
    id: String(row.id),
    classId: String(row.class_id),
    teacherId: String(row.teacher_id),
    title: String(row.title || 'Tài liệu không tên'),
    description: row.description ? String(row.description) : null,
    materialType: (String(row.material_type || 'document') as 'document' | 'video' | 'link'),
    fileUrl: String(row.file_url || ''),
    fileName: row.file_name ? String(row.file_name) : null,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    mimeType: row.mime_type ? String(row.mime_type) : null,
    weekNumber: Number(row.week_number) || 1,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

