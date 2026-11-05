import type { StudentExamQuestion, ExamQuestionOption } from '@/lib/student-exam';

/**
 * Kiểu phương án sau khi được xáo trộn ngẫu nhiên xác định:
 * - displayKey: Nhãn hiển thị cho thí sinh ('A' | 'B' | 'C' | 'D' theo vị trí 0, 1, 2, 3)
 * - originalKey: Nhãn gốc trong ngân hàng đề thi ('A' | 'B' | 'C' | 'D' dùng để so khớp đáp án khi chấm điểm)
 * - text: Nội dung câu trả lời
 */
export type ShuffledExamOption = {
  displayKey: 'A' | 'B' | 'C' | 'D';
  originalKey: 'A' | 'B' | 'C' | 'D';
  text: string;
};

export type ShuffledStudentExamQuestion = Omit<StudentExamQuestion, 'options'> & {
  options: ShuffledExamOption[];
  originalPosition: number;
};

/**
 * Thuật toán băm chuỗi x86 DJB2 sinh số nguyên 32-bit dương dùng làm seed
 */
export function hashStringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Mulberry32: Thuật toán PRNG 32-bit xác định, nhanh và phân bổ ngẫu nhiên đồng đều.
 * Cùng một seed luôn luôn sinh ra cùng một dãy số ngẫu nhiên [0, 1).
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates Shuffle xác định dựa trên PRNG sinh từ seed
 */
function shuffleArrayDeterministic<T>(array: readonly T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

const DISPLAY_KEYS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

/**
 * Xáo trộn danh sách câu hỏi và các phương án A-B-C-D theo attemptId của thí sinh.
 * - Khi reload (F5) cùng attemptId: Thứ tự câu hỏi và phương án giữ nguyên 100%.
 * - Khi thí sinh chọn: hệ thống lưu `originalKey` để bộ chấm điểm so khớp chính xác 100% với `correct_option_key`.
 */
export function shuffleExamQuestions(
  questions: StudentExamQuestion[],
  attemptId: string
): ShuffledStudentExamQuestion[] {
  if (!attemptId || !questions.length) {
    return questions.map((q) => ({
      ...q,
      originalPosition: q.position,
      options: q.options.map((opt) => ({
        displayKey: opt.key,
        originalKey: opt.key,
        text: opt.text,
      })),
    }));
  }

  // 1. Xáo trộn thứ tự các câu hỏi dựa trên seed của attemptId
  const questionsSeed = hashStringToSeed(`${attemptId}:questions`);
  const questionsRng = createMulberry32(questionsSeed);
  const shuffledQuestions = shuffleArrayDeterministic(questions, questionsRng);

  // 2. Xáo trộn thứ tự các phương án A-B-C-D của từng câu trắc nghiệm
  return shuffledQuestions.map((q) => {
    if (q.question_type !== 'multiple_choice' || !q.options || q.options.length === 0) {
      return {
        ...q,
        originalPosition: q.position,
        options: (q.options || []).map((opt) => ({
          displayKey: opt.key,
          originalKey: opt.key,
          text: opt.text,
        })),
      };
    }

    // Seed riêng biệt cho từng câu hỏi kết hợp với attemptId
    const optionsSeed = hashStringToSeed(`${attemptId}:options:${q.id}`);
    const optionsRng = createMulberry32(optionsSeed);
    const shuffledRawOptions = shuffleArrayDeterministic(q.options, optionsRng);

    // Gán nhãn hiển thị mới A, B, C, D theo vị trí 0, 1, 2, 3 nhưng giữ nguyên originalKey
    const shuffledOptions: ShuffledExamOption[] = shuffledRawOptions.map((opt, idx) => ({
      displayKey: DISPLAY_KEYS[idx] || 'A',
      originalKey: opt.key,
      text: opt.text,
    }));

    return {
      ...q,
      originalPosition: q.position,
      options: shuffledOptions,
    };
  });
}

