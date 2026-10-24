'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type MaterialActionResult = {
  status: 'success' | 'error';
  message: string;
};

const COURSE_MATERIALS_BUCKET = 'course_materials';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function uploadClassMaterialAction(
  classId: string,
  formData: FormData
): Promise<MaterialActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  // 1. Kiểm tra vai trò người dùng
  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  if (role !== 'admin' && role !== 'teacher') {
    return { status: 'error', message: 'Bạn không có quyền đăng tải tài liệu cho lớp học này.' };
  }

  const adminClient = createAdminClient();

  // 2. Xác thực lớp học
  const { data: classRecord, error: classError } = await adminClient
    .from('classes')
    .select('id, name, teacher_id')
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classRecord) {
    return { status: 'error', message: 'Lớp học không tồn tại.' };
  }

  if (role === 'teacher' && classRecord.teacher_id !== user.id) {
    return { status: 'error', message: 'Bạn không phải là giảng viên phụ trách lớp học này.' };
  }

  // 3. Đọc dữ liệu từ FormData
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

    // Đảm bảo bucket course_materials tồn tại
    try {
      const { data: buckets } = await adminClient.storage.listBuckets();
      const hasBucket = (buckets ?? []).some((b) => b.name === COURSE_MATERIALS_BUCKET);
      if (!hasBucket) {
        await adminClient.storage.createBucket(COURSE_MATERIALS_BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE_BYTES,
        });
      }
    } catch (bucketErr) {
      console.warn('Could not verify/create storage bucket:', bucketErr);
    }

    // Sanitize tên file
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${classId}/week-${weekNumber}/${Date.now()}_${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await adminClient.storage
      .from(COURSE_MATERIALS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { status: 'error', message: `Lỗi tải file lên máy chủ lưu trữ: ${uploadError.message}` };
    }

    const { data: publicUrlData } = adminClient.storage
      .from(COURSE_MATERIALS_BUCKET)
      .getPublicUrl(storagePath);

    finalFileUrl = publicUrlData.publicUrl;
    finalFileName = file.name;
    finalFileSize = file.size;
    finalMimeType = file.type;
  } else {
    // Video hoặc Link bên ngoài
    const videoUrl = String(formData.get('videoUrl') || '').trim();
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return { status: 'error', message: 'Vui lòng cung cấp đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://).' };
    }
    finalFileUrl = videoUrl;
    finalFileName = null;
    finalFileSize = null;
    finalMimeType = materialType === 'video' ? 'video/url' : 'text/html';
  }

  // 4. Lưu vào bảng class_materials
  const { error: insertError } = await adminClient
    .from('class_materials')
    .insert({
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
    });

  if (insertError) {
    console.error('Failed to insert class material record:', insertError);
    return { status: 'error', message: `Không thể lưu thông tin tài liệu vào CSDL: ${insertError.message}` };
  }

  revalidatePath(`/teacher/classes/${classId}/materials`);
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath('/student/dashboard');

  return { status: 'success', message: 'Đã tải lên và lưu tài liệu học tập thành công!' };
}

export async function deleteClassMaterialAction(
  materialId: string,
  classId: string
): Promise<MaterialActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 'error', message: 'Phiên đăng nhập đã hết hạn.' };
  }

  const adminClient = createAdminClient();

  // 1. Kiểm tra tài liệu tồn tại
  const { data: material, error: matError } = await adminClient
    .from('class_materials')
    .select('id, file_url, material_type, class_id, teacher_id')
    .eq('id', materialId)
    .eq('class_id', classId)
    .maybeSingle();

  if (matError || !material) {
    return { status: 'error', message: 'Tài liệu không tồn tại hoặc đã bị xóa.' };
  }

  // 2. Xóa file khỏi Storage nếu là tài liệu upload
  if (material.material_type === 'document' && material.file_url) {
    try {
      const urlParts = material.file_url.split(`${COURSE_MATERIALS_BUCKET}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await adminClient.storage.from(COURSE_MATERIALS_BUCKET).remove([filePath]);
      }
    } catch (storageErr) {
      console.warn('Could not remove file from storage:', storageErr);
    }
  }

  // 3. Xóa bản ghi trong CSDL
  const { error: deleteError } = await adminClient
    .from('class_materials')
    .delete()
    .eq('id', materialId);

  if (deleteError) {
    return { status: 'error', message: 'Không thể xóa tài liệu khỏi CSDL.' };
  }

  revalidatePath(`/teacher/classes/${classId}/materials`);
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath('/student/dashboard');

  return { status: 'success', message: 'Đã xóa tài liệu học tập thành công.' };
}

