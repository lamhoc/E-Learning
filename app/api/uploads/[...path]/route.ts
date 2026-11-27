import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-cache';
import { getUploadedFileAbsolutePath } from '@/lib/storage/local-storage';

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để tải tài liệu.' }, { status: 401 });
  }

  const { path: rawSegments } = await context.params;
  const decodedSegments = rawSegments.map((s) => decodeURIComponent(s));
  const absolutePath = getUploadedFileAbsolutePath(decodedSegments);

  if (!absolutePath) {
    return NextResponse.json({ error: 'Đường dẫn tệp không hợp lệ.' }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
    const fileName = path.basename(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Không tìm thấy tệp trên máy chủ.' }, { status: 404 });
  }
}
