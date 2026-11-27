'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import { ClassMaterialSchema, ClassSchema } from '@/lib/db/entities';
import { deleteUploadedFileByUrl, saveUploadedFile } from '@/lib/storage/local-storage';

export type MaterialActionResult = {
  status: 'success' | 'error';
  message: string;
};

const COURSE_MATERIALS_BUCKET = 'course_materials';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadClassMaterialAction(
  classId: string,
  formData: FormData,
): Promise<MaterialActionResult> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền đăng tải tài liệu cho lớp học này.' };
  }

  const ds = await getDataSource();
  const classRecord = await ds.getRepository(ClassSchema).findOne({
    where: { id: classId },
    select: { id: true, name: true, teacher_id: true },
  });

  if (!classRecord) {
    return { status: 'error', message: 'Lớp học không tồn tại.' };
  }

  if (role === 'teacher' && classRecord.teacher_id !== user.id) {
    return { status: 'error', message: 'Bạn không phải là giảng viên phụ trách lớp học này.' };
  }

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const weekNumber = Math.max(1, parseInt(String(formData.get('weekNumber') || '1'), 10) || 1);
  const materialType = String(formData.get('materialType') || 'document') as 'document' | 'video' | 'link';

  if (!title) {
    return { status: 'error', message: 'Vui lòng nhập tên tiêu đề tài liệu.' };
  }

  let finalFileUrl = '';
  let finalFileName: string | null = null;
  let finalFileSize: number | null = null;
  let finalMimeType: string | null = null;

  if (materialType === 'document') {
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return { status: 'error', message: 'Vui lòng chọn file tài liệu (PDF, DOCX) hợp lệ để tải lên.' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { status: 'error', message: 'Dung lượng file vượt quá giới hạn 50 MB cho phép.' };
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${classId}/week-${weekNumber}/${Date.now()}_${cleanFileName}`;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { publicUrl } = await saveUploadedFile(COURSE_MATERIALS_BUCKET, storagePath, buffer);
      finalFileUrl = publicUrl;
      finalFileName = file.name;
      finalFileSize = file.size;
      finalMimeType = file.type || 'application/octet-stream';
    } catch (uploadErr) {
      console.error('Local storage upload error:', uploadErr);
      return { status: 'error', message: 'Lỗi tải file lên máy chủ lưu trữ nội bộ.' };
    }
  } else {
    const videoUrl = String(formData.get('videoUrl') || '').trim();
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return { status: 'error', message: 'Vui lòng cung cấp đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://).' };
    }
    finalFileUrl = videoUrl;
    finalFileName = null;
    finalFileSize = null;
    finalMimeType = materialType === 'video' ? 'video/url' : 'text/html';
  }

  try {
    const repo = ds.getRepository(ClassMaterialSchema);
    await repo.save(
      repo.create({
        class_id: classId,
        teacher_id: user.id,
        title,
        description,
        material_type: materialType,
        file_url: finalFileUrl,
        file_name: finalFileName,
        file_size_bytes: finalFileSize,
        mime_type: finalMimeType,
        week_number: weekNumber,
      }),
    );
  } catch (insertError) {
    console.error('Failed to insert class material record:', insertError);
    return { status: 'error', message: 'Không thể lưu thông tin tài liệu vào CSDL.' };
  }

  revalidatePath(`/teacher/classes/${classId}/materials`);
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath('/student/dashboard');
  revalidatePath('/teacher/materials');
  revalidatePath('/student/materials');

  return { status: 'success', message: 'Đã tải lên và lưu tài liệu học tập thành công!' };
}

export async function deleteClassMaterialAction(
  materialId: string,
  classId: string,
): Promise<MaterialActionResult> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền xóa tài liệu này.' };
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(ClassMaterialSchema);
  const material = await repo.findOne({
    where: { id: materialId, class_id: classId },
  });

  if (!material) {
    return { status: 'error', message: 'Tài liệu không tồn tại hoặc đã bị xóa.' };
  }

  if (role === 'teacher' && material.teacher_id !== user.id) {
    const cls = await ds.getRepository(ClassSchema).findOne({
      where: { id: classId },
      select: { teacher_id: true },
    });
    if (cls?.teacher_id !== user.id) {
      return { status: 'error', message: 'Bạn không có quyền xóa tài liệu của lớp khác.' };
    }
  }

  if (material.material_type === 'document' && material.file_url) {
    await deleteUploadedFileByUrl(material.file_url);
  }

  await repo.delete({ id: materialId });

  revalidatePath(`/teacher/classes/${classId}/materials`);
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath('/student/dashboard');
  revalidatePath('/teacher/materials');
  revalidatePath('/student/materials');

  return { status: 'success', message: 'Đã xóa tài liệu học tập thành công.' };
}
