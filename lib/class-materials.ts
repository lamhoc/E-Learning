import 'server-only';

import { getDataSource } from '@/lib/db/data-source';
import { ClassMaterialSchema, type ClassMaterialEntity } from '@/lib/db/entities';

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

export async function getClassMaterials(classId: string): Promise<ClassMaterialItem[]> {
  try {
    const ds = await getDataSource();
    const rows = await ds.getRepository(ClassMaterialSchema).find({
      where: { class_id: classId },
      order: { week_number: 'ASC', created_at: 'DESC' },
    });
    return rows.map(mapRowToMaterial);
  } catch (err) {
    console.error('Failed to load class materials:', err);
    return [];
  }
}

export function groupMaterialsByWeek(materials: ClassMaterialItem[]): ClassMaterialWeekGroup[] {
  const map = new Map<number, ClassMaterialItem[]>();

  for (const mat of materials) {
    const week = mat.weekNumber || 1;
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(mat);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, items]) => ({
      weekNumber,
      materials: items,
    }));
}

function mapRowToMaterial(row: ClassMaterialEntity): ClassMaterialItem {
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    title: row.title || 'Tài liệu không tên',
    description: row.description ?? null,
    materialType: row.material_type || 'document',
    fileUrl: row.file_url || '',
    fileName: row.file_name ?? null,
    fileSizeBytes: row.file_size_bytes !== null ? Number(row.file_size_bytes) : null,
    mimeType: row.mime_type ?? null,
    weekNumber: Number(row.week_number) || 1,
    createdAt: row.created_at || new Date().toISOString(),
  };
}
