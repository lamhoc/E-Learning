/**
 * Tiện ích hỗ trợ kiểm tra và xử lý tính năng Tự Chấm Tự Luận & Bắt Buộc Camera (Zero-Crash Fallback).
 * Hoạt động tốt ở cả Server và Client component.
 */

export function isAutoGradeEssay(exam: {
  auto_grade_essay?: boolean | null;
  autoGradeEssay?: boolean | null;
  instructions?: string | null;
} | null | undefined): boolean {
  if (!exam) return false;
  if (exam.auto_grade_essay === true || exam.autoGradeEssay === true) return true;
  if (exam.instructions && exam.instructions.includes('[AUTO_GRADE_ESSAY:true]')) return true;
  return false;
}

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
    .replace(/\[CAMERA_REQUIRED:(?:true|false)\]/gi, '')
    .replace(/\[AUTO_GRADE_ESSAY:(?:true|false)\]/gi, '')
    .replace(/\[[A-Z0-9_]+:(?:true|false)\]/gi, '')
    .trim();
  return cleaned || null;
}

export function appendExamInstructionTags(
  instructions: string | null | undefined,
  flags: { requireCamera?: boolean; autoGradeEssay?: boolean }
): string {
  const cameraTag = flags.requireCamera ? '[CAMERA_REQUIRED:true]' : '[CAMERA_REQUIRED:false]';
  const autoGradeTag = flags.autoGradeEssay ? '[AUTO_GRADE_ESSAY:true]' : '[AUTO_GRADE_ESSAY:false]';
  const base = cleanExamInstructions(instructions);
  const tags = `${cameraTag} ${autoGradeTag}`;
  return base ? `${base} ${tags}` : tags;
}

export function appendCameraInstructionTag(instructions: string | null | undefined, requireCamera: boolean): string {
  return appendExamInstructionTags(instructions, { requireCamera });
}

/**
 * Chuẩn hóa chuỗi văn bản phục vụ so khớp đáp án tự luận:
 * - Chuẩn hóa Unicode sang NFC
 * - Chuyển sang chữ thường (lowercase)
 * - Gom các khoảng trắng thừa/dòng trống thành 1 dấu cách duy nhất
 * - Cắt bỏ dấu câu ở cuối chuỗi (. , ; ! ?) để tránh mất điểm oan
 */
export function normalizeAnswerText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;!?]+$/, '')
    .trim();
}

/**
 * Đối chiếu câu trả lời của thí sinh với đáp án mẫu hoặc rubric:
 * Hỗ trợ nhiều cách viết tương đương ngăn cách bởi '|', ';', hoặc xuống dòng.
 * Ví dụ: "x = 2 | 2" hoặc "hà nội; tp hà nội"
 */
export function checkEssayAnswerMatch(
  studentAnswer: string | null | undefined,
  expectedAnswer: string | null | undefined
): boolean {
  const normalizedStudent = normalizeAnswerText(studentAnswer);
  if (!normalizedStudent) return false;
  if (!expectedAnswer) return false;

  // Tách các phương án tương đương theo dấu | hoặc ; hoặc xuống dòng
  const candidates = expectedAnswer
    .split(/[|;\n]/)
    .map((c) => normalizeAnswerText(c))
    .filter((c) => c.length > 0);

  if (candidates.length === 0) return false;

  return candidates.includes(normalizedStudent);
}
