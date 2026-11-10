/**
 * Tiện ích hỗ trợ kiểm tra và xử lý trạng thái Bắt buộc Camera (Zero-Crash Fallback).
 * Hoạt động tốt ở cả Server và Client component.
 */

export function isCameraRequired(exam: {
  require_camera?: boolean | null;
  requireCamera?: boolean | null;
  instructions?: string | null;
} | null | undefined): boolean {
  if (!exam) return false;
  if (exam.require_camera === true || exam.requireCamera === true) return true;
  if (exam.instructions && exam.instructions.includes('[CAMERA_REQUIRED:true]')) return true;
  return false;
}

export function cleanExamInstructions(instructions: string | null | undefined): string | null {
  if (!instructions) return null;
  const cleaned = instructions
    .replace(/\[CAMERA_REQUIRED:(true|false)\]/g, '')
    .trim();
  return cleaned || null;
}

export function appendCameraInstructionTag(instructions: string | null | undefined, requireCamera: boolean): string {
  const tag = requireCamera ? '[CAMERA_REQUIRED:true]' : '[CAMERA_REQUIRED:false]';
  const base = cleanExamInstructions(instructions);
  return base ? `${base} ${tag}` : tag;
}
