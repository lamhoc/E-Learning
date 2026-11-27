import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'uploads');

function resolveSafePath(bucket: string, relativePath: string): string {
  const cleanBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, '');
  const normalizedRel = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/');

  if (!cleanBucket || !normalizedRel) {
    throw new Error('Đường dẫn lưu trữ không hợp lệ.');
  }

  const fullPath = path.resolve(STORAGE_ROOT, cleanBucket, normalizedRel);
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error('Đường dẫn lưu trữ vượt ra ngoài thư mục cho phép.');
  }
  return fullPath;
}

/**
 * Lưu file lên đĩa server trong `storage/uploads/<bucket>/<relativePath>`
 * và trả về đường dẫn API `/api/uploads/<bucket>/<relativePath>`.
 */
export async function saveUploadedFile(
  bucket: string,
  relativePath: string,
  buffer: Buffer,
): Promise<{ publicUrl: string; storedPath: string }> {
  const fullPath = resolveSafePath(bucket, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const cleanBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanRel = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map(encodeURIComponent)
    .join('/');

  return {
    publicUrl: `/api/uploads/${cleanBucket}/${cleanRel}`,
    storedPath: fullPath,
  };
}

/**
 * Xóa file từ đường dẫn `/api/uploads/...` (bỏ qua nếu file không tồn tại hoặc là link ngoài).
 */
export async function deleteUploadedFileByUrl(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('/api/uploads/')) return;
  try {
    const rest = fileUrl.slice('/api/uploads/'.length);
    const segments = rest.split('/').map((s) => decodeURIComponent(s));
    const [bucket, ...relParts] = segments;
    if (!bucket || relParts.length === 0) return;

    const fullPath = resolveSafePath(bucket, relParts.join('/'));
    await fs.unlink(fullPath).catch(() => {});
  } catch {
    // Bỏ qua lỗi xóa file vật lý
  }
}

export function getUploadedFileAbsolutePath(segments: string[]): string | null {
  if (segments.length < 2) return null;
  const [bucket, ...rest] = segments;
  try {
    return resolveSafePath(bucket, rest.join('/'));
  } catch {
    return null;
  }
}
