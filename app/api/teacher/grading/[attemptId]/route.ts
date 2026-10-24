import { NextResponse } from 'next/server';
import {
  saveEssayGrades,
  SaveEssayGradesPayload,
} from '@/lib/teacher-grading';

/**
 * Route Handler: POST /api/teacher/grading/[attemptId]
 * 
 * Thay vì sử dụng Server Action trực tiếp từ Client Component (vốn bị Next.js App Router
 * tự động ghép cặp với luồng RSC Flight stream re-rendering của trang gây ra Minified React Error #441),
 * Route Handler này hoạt động như một REST API độc lập, trả về JSON thuần túy (HTTP 200).
 * Miễn nhiễm hoàn toàn với các lỗi serialization / render ngầm của React Server Components.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const body = (await request.json()) as Omit<SaveEssayGradesPayload, 'attemptId'>;

    if (!attemptId) {
      return NextResponse.json(
        { status: 'error', message: 'Mã lượt thi (attemptId) không hợp lệ.' },
        { status: 400 }
      );
    }

    const payload: SaveEssayGradesPayload = {
      attemptId,
      examId: body.examId,
      studentId: body.studentId,
      grades: body.grades,
      releaseResult: Boolean(body.releaseResult),
    };

    const result = await saveEssayGrades(payload);

    return NextResponse.json(result, {
      status: result.status === 'success' ? 200 : 400,
    });
  } catch (err) {
    console.error('API /api/teacher/grading/[attemptId] Error:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra khi lưu điểm.',
      },
      { status: 500 }
    );
  }
}

