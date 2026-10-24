'use server';

import {
  saveEssayGrades,
  type SaveEssayGradesPayload,
  type SaveEssayGradesResult,
} from '@/lib/teacher-grading';

export type { SaveEssayGradesPayload, SaveEssayGradesResult };

/**
 * Server Action bọc lại hàm nghiệp vụ saveEssayGrades từ lib/teacher-grading.
 * Giữ lại để đảm bảo tính tương thích ngược nếu có module gọi trực tiếp.
 */
export async function saveEssayGradesAction(
  payload: SaveEssayGradesPayload
): Promise<SaveEssayGradesResult> {
  return saveEssayGrades(payload);
}
