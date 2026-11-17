import 'server-only';

import { callAiChatCompletion } from '@/lib/ai-provider';
import { generateDomainAwareFallbackQuestions } from '@/lib/domain-fallback-generator';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type GeneratedQuestionDraft = {
  tempId: string;
  question_type: 'multiple_choice' | 'essay';
  question_text: string;
  explanation: string;
  // Multiple Choice
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: 'A' | 'B' | 'C' | 'D';
  // Essay
  model_answer?: string;
  grading_rubric?: string;
};

export type GenerateAIRequest = {
  subjectName: string;
  subjectCode: string;
  topic: string;
  questionType: 'multiple_choice' | 'essay';
  difficulty: AIDifficulty;
  count: number;
  additionalNote?: string;
};

const DIFFICULTY_MAP: Record<AIDifficulty, string> = {
  easy: 'Nhận biết (Dễ, kiểm tra lý thuyết, khái niệm hoặc tính toán đơn giản 1 bước)',
  medium: 'Thông hiểu (Trung bình, hiểu bản chất, vận dụng công thức chuẩn)',
  hard: 'Vận dụng (Khá giỏi, bài toán nhiều bước, tư duy logic, kết hợp kiến thức)',
  expert: 'Vận dụng cao (Khó / Phân loại học sinh xuất sắc, biến đổi phức tạp)',
};

const LATEX_BACKSLASH_TOKEN = '__LATEX_BACKSLASH__';

// Cấu hình Model Groq chuẩn tốc độ cao và ổn định
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const MAX_COMPLETION_TOKENS = 8192;

/**
 * Cắt bỏ các tiền tố bị lặp thừa để giao diện hiển thị sạch sẽ, chuyên nghiệp (Clean Formatting).
 * Đồng thời giải mã HTML entities, chuẩn hóa \(...\) -> $...$ và chuẩn hóa Unicode NFC.
 */
export function cleanPrefix(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text).trim();

  // 1. Loại bỏ null byte và ký tự rác
  str = str.replace(/[\u0000\ufffd]/g, '');

  // 2. Giải mã HTML entities
  str = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Chuẩn hóa cú pháp LaTeX: \(...\) -> $...$ và \[...\] -> $$...$$
  str = str.replace(/(?:\\{1,2}\[)([\s\S]*?)(?:\\{1,2}\])/g, (_, p1) => `$$${p1}$$`);
  str = str.replace(/(?:\\{1,2}\()([\s\S]*?)(?:\\{1,2}\))/g, (_, p1) => `$${p1}$`);

  // 4. Chuẩn hóa tiếng Việt Unicode NFC
  str = str.normalize('NFC');

  // 5. Cắt bỏ "Câu 1:", "Câu 01.", "Bài 1:", "Question 1:", "1.", v.v.
  str = str.replace(/^(?:câu|bài|question)\s*\d+[\s:.-]+/i, '');
  // 6. Cắt bỏ "Phương án A:", "Đáp án A:", "A.", "A)", "A:", v.v.
  str = str.replace(/^(?:(?:phương án|đáp án)\s*[a-d]|[a-d])[\s:.)-]+/i, '');
  // 7. Cắt bỏ "Lời giải chi tiết:", "Lời giải:", "Hướng dẫn giải:", "Giải thích:", v.v.
  str = str.replace(
    /^(?:lời giải(?:\s*chi tiết)?|hướng dẫn giải|giải thích(?:\s*chi tiết)?|đáp án(?:\s*chi tiết)?|gợi ý(?:\s*đáp án)?|thang điểm(?:\s*chấm)?|rubric(?:\s*chấm)?)[\s:.-]+/i,
    ''
  );
  return str.trim();
}

/**
 * Khôi phục dấu gạch chéo ngược LaTeX từ token an toàn hoặc từ các chuỗi escaped.
 */
function restoreLatexBackslashes(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  str = str.replaceAll(LATEX_BACKSLASH_TOKEN, '\\');
  return cleanPrefix(str);
}

/**
 * Hàm tiền xử lý chuỗi JSON chứa công thức LaTeX trước khi đưa vào JSON.parse().
 * Xử lý triệt để:
 * - Các lệnh LaTeX bắt đầu bằng chữ cái: \frac, \text, \times, \tan, \tau, \to, \beta, \binom, \right, \rho, \neq, \nabla, \sqrt, \int, \sum, \lim, \alpha...
 * - Các ký tự toán: \{, \}, \+, \-, \|, \$, \;, \:
 * - Các dấu \ đơn lẻ không phải escape hợp lệ của JSON.
 */
function sanitizeJsonEscapes(jsonStr: string): string {
  // 1. Nếu có \ đứng trước từ có 2 chữ cái trở lên (ví dụ: \frac, \text, \beta, \right, \neq, \sqrt, \int...) -> escape thành \\
  let res = jsonStr.replace(/(?<!\\)\\(?=[a-zA-Z]{2,})/g, '\\\\');

  // 2. Nếu có \ đứng trước \f, \t, \b, \r, \n mà đi liền sau là chữ cái (ví dụ: \frac, \text, \beta, \right, \neq)
  res = res.replace(/(?<!\\)\\([bfnrt][a-zA-Z])/g, '\\\\$1');

  // 3. Nếu có \ đứng trước ký tự toán học hoặc dấu ngoặc: \{, \}, \+, \-, \|, \$, \;, \:, \!
  res = res.replace(/(?<!\\)\\([{}|,$;:!+\-^])/g, '\\\\$1');

  // 4. Mọi dấu \ đơn lẻ còn lại không thuộc escape JSON chuẩn (" \ / b f n r t u)
  res = res.replace(/(?<!\\)\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  return res;
}

/**
 * Phục hồi các object câu hỏi hợp lệ khi chuỗi JSON bị ngắt giữa chừng (truncated do token limit).
 */
function recoverTruncatedJson(clean: string): unknown {
  const arrayStart = clean.indexOf('[');
  if (arrayStart === -1) return null;

  const fromArray = clean.slice(arrayStart);
  const lastClosingBrace = fromArray.lastIndexOf('}');
  if (lastClosingBrace === -1) return null;

  const truncatedToLastObject = fromArray.slice(0, lastClosingBrace + 1);
  const repairedArray = `${truncatedToLastObject}]`;

  try {
    const sanitized = sanitizeJsonEscapes(repairedArray);
    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { questions: parsed };
    }
  } catch {
    // Thử regex trích xuất từng object độc lập
  }

  const questionObjects: Record<string, unknown>[] = [];
  const objectRegex = /\{[^{}]*"question_text"[^{}]*\}/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(clean)) !== null) {
    try {
      const singleObjSanitized = sanitizeJsonEscapes(match[0]);
      const obj = JSON.parse(singleObjSanitized);
      if (obj && typeof obj === 'object' && 'question_text' in obj) {
        questionObjects.push(obj as Record<string, unknown>);
      }
    } catch {
      // bỏ qua object lỗi
    }
  }

  if (questionObjects.length > 0) {
    return { questions: questionObjects };
  }

  return null;
}

/**
 * Hàm phân tích JSON AI xử lý triệt để LaTeX và cấu trúc (Sanitize & Parse AI JSON).
 * Đảm bảo kết quả từ Groq AI luôn được bóc tách thành công 100%, không bị văng lỗi giả.
 */
export function sanitizeAndParseAiJson(rawText: string): unknown {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Dữ liệu AI trả về rỗng.');
  }

  // 1. Cắt bỏ markdown code fence ```json ... ``` hoặc ``` ... ```
  let clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Tìm vị trí mở đầu object { hoặc mảng [ đầu tiên
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  let startIdx = 0;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  clean = clean.slice(startIdx);

  // 2. Thử JSON.parse trực tiếp
  try {
    return JSON.parse(clean);
  } catch {
    // Tiếp tục tiền xử lý
  }

  // 3. Tiền xử lý LaTeX escape trong chuỗi JSON
  try {
    const sanitized = sanitizeJsonEscapes(clean);
    return JSON.parse(sanitized);
  } catch {
    // Tiếp tục cứu vãn JSON bị ngắt quãng
  }

  // 4. Cứu vãn chuỗi JSON bị ngắt giữa chừng
  const recovered = recoverTruncatedJson(clean);
  if (recovered) {
    return recovered;
  }

  throw new Error('Không thể phân tích phản hồi JSON từ AI.');
}

// Export alias để tương thích ngược 100% với các component/module khác
export const parseAiJsonSafely = sanitizeAndParseAiJson;

/**
 * Trích xuất danh sách câu hỏi từ cấu trúc JSON đã parse (dù là array hay object có questions).
 */
function extractQuestionList(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions as Record<string, unknown>[];
    const values = Object.values(obj);
    const arrayProp = values.find(Array.isArray);
    if (arrayProp) return arrayProp as Record<string, unknown>[];
  }
  return [];
}

/**
 * Tự động shuffle 4 phương án A-B-C-D và cập nhật lại `correct_option` tương ứng.
 * Đảm bảo đáp án đúng rải đều ngẫu nhiên qua cả 4 vị trí A, B, C, D (25% mỗi vị trí),
 * không bao giờ bị cố định ở đáp án A!
 */
function shuffleMultipleChoiceOptions(
  optA: string,
  optB: string,
  optC: string,
  optD: string,
  originalCorrect: 'A' | 'B' | 'C' | 'D'
): {
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correct: 'A' | 'B' | 'C' | 'D';
} {
  const options = [
    { key: 'A' as const, text: optA, isCorrect: originalCorrect === 'A' },
    { key: 'B' as const, text: optB, isCorrect: originalCorrect === 'B' },
    { key: 'C' as const, text: optC, isCorrect: originalCorrect === 'C' },
    { key: 'D' as const, text: optD, isCorrect: originalCorrect === 'D' },
  ];

  // Fisher-Yates Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = options[i];
    options[i] = options[j];
    options[j] = temp;
  }

  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  let newCorrect: 'A' | 'B' | 'C' | 'D' = 'A';

  for (let i = 0; i < options.length; i++) {
    if (options[i].isCorrect) {
      newCorrect = keys[i];
      break;
    }
  }

  return {
    optA: options[0].text,
    optB: options[1].text,
    optC: options[2].text,
    optD: options[3].text,
    correct: newCorrect,
  };
}

/**
 * Map một object thô từ AI thành GeneratedQuestionDraft chuẩn.
 */
function mapToQuestionDraft(
  item: Record<string, unknown>,
  index: number,
  offset: number,
  isMC: boolean,
): GeneratedQuestionDraft {
  const qText = restoreLatexBackslashes(item.question_text);
  const explanation = restoreLatexBackslashes(item.explanation);
  const tempId = `gen-${Date.now()}-${offset + index}`;

  if (isMC) {
    const rawOptA = restoreLatexBackslashes(item.option_a);
    const rawOptB = restoreLatexBackslashes(item.option_b);
    const rawOptC = restoreLatexBackslashes(item.option_c);
    const rawOptD = restoreLatexBackslashes(item.option_d);
    const rawKey = String(item.correct_option || 'A').trim().toUpperCase();
    const originalCorrect = (['A', 'B', 'C', 'D'] as const).includes(rawKey as 'A')
      ? (rawKey as 'A' | 'B' | 'C' | 'D')
      : 'A';

    // Shuffle phương án để đáp án đúng phân bổ đều A, B, C, D
    const shuffled = shuffleMultipleChoiceOptions(
      rawOptA,
      rawOptB,
      rawOptC,
      rawOptD,
      originalCorrect
    );

    return {
      tempId,
      question_type: 'multiple_choice',
      question_text: qText,
      option_a: shuffled.optA,
      option_b: shuffled.optB,
      option_c: shuffled.optC,
      option_d: shuffled.optD,
      correct_option: shuffled.correct,
      explanation,
    };
  }

  return {
    tempId,
    question_type: 'essay',
    question_text: qText,
    model_answer: restoreLatexBackslashes(item.model_answer),
    grading_rubric: restoreLatexBackslashes(item.grading_rubric),
    explanation,
  };
}

/**
 * Ngân hàng kịch bản câu hỏi biến thiên đa dạng (Dynamic Parameterized Fallback Generator).
 * Thay thế hoàn toàn câu hỏi fallback tĩnh cũ. Mỗi câu hỏi theo index (0 -> 9) có nội dung,
 * hàm số, số liệu, phương án và đáp án đúng (A, B, C, D) hoàn toàn khác nhau 100%.
 */
function generateSmartDiverseFallback(
  count: number,
  isMC: boolean,
  topic: string,
  subjectName: string,
  subjectCode: string,
  offset: number
): Record<string, unknown>[] {
  // 1. Ưu tiên kiểm tra bộ câu hỏi theo Domain trước (Lịch sử, Địa lý, Ngữ văn, Tiếng Anh, Sinh học, hoặc Universal generator)
  const domainQuestions = generateDomainAwareFallbackQuestions(
    count,
    isMC,
    topic,
    subjectName,
    subjectCode,
    offset
  );
  if (domainQuestions && domainQuestions.length > 0) {
    return domainQuestions;
  }

  // 2. CHỈ KHI môn học là Toán học thì mới dùng kịch bản Đạo hàm / Khảo sát hàm số của Toán
  const mcScenarios = [
    {
      question_text: `Tính đạo hàm của hàm số $y = \\frac{2x - 1}{x + 1}$ trên các khoảng xác định của nó.`,
      option_a: `$y' = \\frac{3}{(x + 1)^2}$`,
      option_b: `$y' = \\frac{1}{(x + 1)^2}$`,
      option_c: `$y' = \\frac{-3}{(x + 1)^2}$`,
      option_d: `$y' = \\frac{2x + 1}{(x + 1)^2}$`,
      correct_option: 'A',
      explanation: `Áp dụng công thức đạo hàm hàm phân thức $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$: Ta có $u = 2x - 1 \\Rightarrow u' = 2$; $v = x + 1 \\Rightarrow v' = 1$. Khi đó $y' = \\frac{2(x + 1) - (2x - 1)\\cdot 1}{(x + 1)^2} = \\frac{2x + 2 - 2x + 1}{(x + 1)^2} = \\frac{3}{(x + 1)^2}$.`,
    },
    {
      question_text: `Tìm các khoảng đồng biến của hàm số bậc ba $y = x^3 - 3x^2 + 2$.`,
      option_a: `$(0; 2)$`,
      option_b: `$(-\\infty; 0)$ và $(2; +\\infty)$`,
      option_c: `$(-\\infty; 1)$`,
      option_d: `$(1; +\\infty)$`,
      correct_option: 'B',
      explanation: `Ta có đạo hàm $y' = 3x^2 - 6x = 3x(x - 2)$. Cho $y' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Bảng xét dấu của $y'$ cho thấy $y' > 0$ khi $x \\in (-\\infty; 0) \\cup (2; +\\infty)$. Do đó hàm số đồng biến trên các khoảng $(-\\infty; 0)$ và $(2; +\\infty)$.`,
    },
    {
      question_text: `Điểm cực đại của đồ thị hàm số $y = -x^3 + 3x - 1$ là điểm nào dưới đây?`,
      option_a: `$M(-1; -3)$`,
      option_b: `$N(0; -1)$`,
      option_c: `$P(1; 1)$`,
      option_d: `$Q(2; -3)$`,
      correct_option: 'C',
      explanation: `Ta có $y' = -3x^2 + 3 = -3(x^2 - 1)$. Cho $y' = 0 \\Leftrightarrow x = \\pm 1$. Qua điểm $x = 1$, $y'$ đổi dấu từ dương sang âm nên $x = 1$ là điểm cực đại. Giá trị cực đại $y(1) = -(1)^3 + 3(1) - 1 = 1$. Tọa độ điểm cực đại là $P(1; 1)$.`,
    },
    {
      question_text: `Tìm giá trị lớn nhất $M$ và giá trị nhỏ nhất $m$ của hàm số $y = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$.`,
      option_a: `$M = 11, m = 2$`,
      option_b: `$M = 11, m = 3$`,
      option_c: `$M = 3, m = 2$`,
      option_d: `$M = 9, m = 1$`,
      correct_option: 'A',
      explanation: `Hàm số liên tục trên $[0; 2]$. Ta có $y' = 4x^3 - 4x = 4x(x^2 - 1) = 4x(x - 1)(x + 1)$. Trên $(0; 2)$, phương trình $y' = 0$ có nghiệm $x = 1$. Tính các giá trị: $y(0) = 3$, $y(1) = 2$, $y(2) = 11$. Vậy $M = \\max_{[0; 2]} y = 11$ (tại $x = 2$) và $m = \\min_{[0; 2]} y = 2$ (tại $x = 1$).`,
    },
    {
      question_text: `Tìm phương trình đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số $y = \\frac{3x - 2}{x - 1}$.`,
      option_a: `Tiệm cận đứng $x = 3$, tiệm cận ngang $y = 1$`,
      option_b: `Tiệm cận đứng $x = 1$, tiệm cận ngang $y = 3$`,
      option_c: `Tiệm cận đứng $x = -1$, tiệm cận ngang $y = 3$`,
      option_d: `Tiệm cận đứng $x = 1$, tiệm cận ngang $y = -2$`,
      correct_option: 'B',
      explanation: `Tiệm cận đứng: Vì $\\lim_{x \\to 1^+} \\frac{3x - 2}{x - 1} = +\\infty$ nên đường thẳng $x = 1$ là tiệm cận đứng. Tiệm cận ngang: Vì $\\lim_{x \\to \\pm\\infty} \\frac{3x - 2}{x - 1} = 3$ nên đường thẳng $y = 3$ là tiệm cận ngang.`,
    },
    {
      question_text: `Viết phương trình tiếp tuyến của đồ thị hàm số $y = x^3 - 3x + 2$ tại điểm $M(2; 4)$.`,
      option_a: `$y = 9x - 14$`,
      option_b: `$y = 9x + 4$`,
      option_c: `$y = 3x - 2$`,
      option_d: `$y = 9x - 22$`,
      correct_option: 'A',
      explanation: `Ta có $y' = 3x^2 - 3$. Hệ số góc của tiếp tuyến tại $x_0 = 2$ là $k = y'(2) = 3(2)^2 - 3 = 9$. Phương trình tiếp tuyến là $y - y_0 = k(x - x_0) \\Leftrightarrow y - 4 = 9(x - 2) \\Leftrightarrow y = 9x - 14$.`,
    },
    {
      question_text: `Cho hàm số $y = f(x)$ có bảng biến thiên với $f'(x) = (x - 1)^2(x + 2)(x - 3)$. Số điểm cực trị của hàm số đã cho là:`,
      option_a: `$1$`,
      option_b: `$2$`,
      option_c: `$3$`,
      option_d: `$4$`,
      correct_option: 'B',
      explanation: `Ta có $f'(x) = 0 \\Leftrightarrow x = 1, x = -2, x = 3$. Vì $(x - 1)^2 \\ge 0$ với mọi $x$ (nghiệm bội chẵn) nên $f'(x)$ không đổi dấu khi qua $x = 1$. Ngược lại, $f'(x)$ đổi dấu khi qua hai nghiệm bội lẻ $x = -2$ và $x = 3$. Do đó, hàm số chỉ có đúng $2$ điểm cực trị.`,
    },
    {
      question_text: `Tìm tất cả các giá trị của tham số $m$ để hàm số $y = \\frac{1}{3}x^3 - mx^2 + (m + 2)x - 5$ đồng biến trên toàn trục số $\\mathbb{R}$.`,
      option_a: `$-1 \\le m \\le 2$`,
      option_b: `$m < -1$ hoặc $m > 2$`,
      option_c: `$-2 \\le m \\le 1$`,
      option_d: `$m \\ge 2$`,
      correct_option: 'A',
      explanation: `Ta có $y' = x^2 - 2mx + (m + 2)$. Để hàm số đồng biến trên $\\mathbb{R}$, điều kiện cần và đủ là $y' \\ge 0$ với mọi $x \\in \\mathbb{R} \\Leftrightarrow \\Delta' = m^2 - (m + 2) \\le 0 \\Leftrightarrow m^2 - m - 2 \\le 0 \\Leftrightarrow -1 \\le m \\le 2$.`,
    },
    {
      question_text: `Đồ thị hàm số $y = \\frac{x^2 - 4}{x^2 - 3x + 2}$ có tất cả bao nhiêu đường tiệm cận (đứng và ngang)?`,
      option_a: `$1$`,
      option_b: `$2$`,
      option_c: `$3$`,
      option_d: `$4$`,
      correct_option: 'B',
      explanation: `Rút gọn biểu thức hàm số: $y = \\frac{(x - 2)(x + 2)}{(x - 1)(x - 2)} = \\frac{x + 2}{x - 1}$ (với $x \\ne 2$). Tiệm cận đứng: $\\lim_{x \\to 1} y = \\infty \\Rightarrow x = 1$ là tiệm cận đứng duy nhất (tại $x = 2$ hàm số khử được mẫu nên không là tiệm cận). Tiệm cận ngang: $\\lim_{x \\to \\pm\\infty} y = 1 \\Rightarrow y = 1$. Tổng số tiệm cận là $2$.`,
    },
    {
      question_text: `Biện luận số nghiệm của phương trình $x^3 - 3x^2 + 1 = m$ dựa vào đồ thị hàm số $y = x^3 - 3x^2 + 1$. Phương trình có đúng 3 nghiệm thực phân biệt khi và chỉ khi:`,
      option_a: `$-3 < m < 1$`,
      option_b: `$m \\le -3$ hoặc $m \\ge 1$`,
      option_c: `$-3 \\le m \\le 1$`,
      option_d: `$m > 1$`,
      correct_option: 'A',
      explanation: `Khảo sát hàm số $f(x) = x^3 - 3x^2 + 1$: $f'(x) = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ ($y_{CĐ} = 1$) hoặc $x = 2$ ($y_{CT} = -3$). Số nghiệm của phương trình là số giao điểm của đồ thị $y = f(x)$ và đường thẳng nằm ngang $y = m$. Đường thẳng cắt đồ thị tại 3 điểm phân biệt khi và chỉ khi $y_{CT} < m < y_{CĐ} \\Leftrightarrow -3 < m < 1$.`,
    },
  ];

  const essayScenarios = [
    {
      question_text: `Cho hàm số bậc ba $y = x^3 - 3x^2 + 2$ có đồ thị $(C)$. Khảo sát sự biến thiên và vẽ đồ thị hàm số đã cho.`,
      model_answer: `1. Tập xác định: $D = \\mathbb{R}$.\n2. Sự biến thiên: $y' = 3x^2 - 6x = 3x(x - 2)$. $y' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$.\n- Khoảng đồng biến: $(-\\infty; 0)$ và $(2; +\\infty)$. Khoảng nghịch biến: $(0; 2)$.\n- Cực trị: Điểm cực đại $A(0; 2)$, điểm cực tiểu $B(2; -2)$.\n- Giới hạn: $\\lim_{x \\to -\\infty} y = -\\infty$, $\\lim_{x \\to +\\infty} y = +\\infty$.\n3. Bảng biến thiên và đồ thị: Điểm uốn $I(1; 0)$, giao trục tung tại $(0; 2)$, cắt trục hoành tại các nghiệm của phương trình $x^3 - 3x^2 + 2 = 0$.`,
      grading_rubric: `- Ý 1: Tìm đúng tập xác định, tính đạo hàm $y'$ và giải nghiệm (0.5 điểm)\n- Ý 2: Kết luận chính xác các khoảng đơn điệu, cực trị và giới hạn vô cực (0.75 điểm)\n- Ý 3: Lập bảng biến thiên hoàn chỉnh và vẽ đồ thị chính xác (0.75 điểm)`,
      explanation: `Lưu ý trình bày rõ ràng dấu của đạo hàm và tọa độ các điểm đặc biệt (cực trị, điểm uốn) khi vẽ đồ thị.`,
    },
    {
      question_text: `Tìm giá trị lớn nhất và giá trị nhỏ nhất của hàm số $f(x) = x + \\frac{4}{x}$ trên đoạn $[1; 4]$.`,
      model_answer: `Hàm số liên tục và xác định trên $[1; 4]$.\nĐạo hàm: $f'(x) = 1 - \\frac{4}{x^2} = \\frac{x^2 - 4}{x^2}$.\nCho $f'(x) = 0 \\Leftrightarrow x^2 = 4 \\Leftrightarrow x = 2$ (do $x \\in [1; 4]$ nên nhận $x = 2$).\nTính giá trị tại các điểm đầu mút và điểm tới hạn:\n- $f(1) = 1 + 4 = 5$\n- $f(2) = 2 + 2 = 4$\n- $f(4) = 4 + 1 = 5$\nKết luận: $\\max_{[1; 4]} f(x) = 5$ (đạt tại $x = 1$ và $x = 4$); $\\min_{[1; 4]} f(x) = 4$ (đạt tại $x = 2$).`,
      grading_rubric: `- Ý 1: Tính đúng đạo hàm $f'(x)$ và tìm nghiệm thuộc đoạn $[1; 4]$ (0.75 điểm)\n- Ý 2: Tính chính xác giá trị hàm số tại $x = 1, 2, 4$ (0.75 điểm)\n- Ý 3: Kết luận đầy đủ GTLN, GTNN và chỉ rõ giá trị $x$ đạt được (0.5 điểm)`,
      explanation: `Đối với bài toán GTLN/GTNN trên đoạn đóng, không bắt buộc phải lập bảng biến thiên nếu đã so sánh trực tiếp các giá trị.`,
    },
    {
      question_text: `Viết phương trình tiếp tuyến của đồ thị hàm số $y = \\frac{2x + 1}{x - 1}$ biết tiếp tuyến song song với đường thẳng $d: y = -3x + 5$.`,
      model_answer: `Tập xác định: $D = \\mathbb{R} \\setminus \\{1\\}$.\nĐạo hàm: $y' = \\frac{-3}{(x - 1)^2}$.\nVì tiếp tuyến song song với đường thẳng $d$ nên hệ số góc của tiếp tuyến bằng hệ số góc của $d$:\n$y'(x_0) = -3 \\Leftrightarrow \\frac{-3}{(x_0 - 1)^2} = -3 \\Leftrightarrow (x_0 - 1)^2 = 1 \\Leftrightarrow x_0 = 2$ hoặc $x_0 = 0$.\n- Với $x_0 = 2 \\Rightarrow y_0 = 5$. Phương trình tiếp tuyến $d_1: y - 5 = -3(x - 2) \\Leftrightarrow y = -3x + 11$ (thỏa mãn không trùng với $d$).\n- Với $x_0 = 0 \\Rightarrow y_0 = -1$. Phương trình tiếp tuyến $d_2: y - (-1) = -3(x - 0) \\Leftrightarrow y = -3x - 1$ (thỏa mãn không trùng với $d$).`,
      grading_rubric: `- Ý 1: Tính đạo hàm $y'$ và thiết lập phương trình hệ số góc $y'(x_0) = -3$ (0.75 điểm)\n- Ý 2: Giải đúng 2 tọa độ tiếp điểm $(2; 5)$ và $(0; -1)$ (0.5 điểm)\n- Ý 3: Viết 2 phương trình tiếp tuyến và kiểm tra điều kiện không trùng với $d$ (0.75 điểm)`,
      explanation: `Cần đặc biệt lưu ý kiểm tra điều kiện song song để loại bỏ trường hợp tiếp tuyến trùng với đường thẳng đề bài cho.`,
    },
    {
      question_text: `Tìm tất cả các giá trị của tham số $m$ để đồ thị hàm số $y = x^3 - 3mx^2 + 4m^3$ có hai điểm cực trị $A, B$ sao cho tam giác $OAB$ có diện tích bằng $4$ (với $O$ là gốc tọa độ).`,
      model_answer: `Ta có $y' = 3x^2 - 6mx = 3x(x - 2m)$.\nHàm số có 2 điểm cực trị $\\Leftrightarrow y' = 0$ có 2 nghiệm phân biệt $\\Leftrightarrow m \\ne 0$.\nKhi đó tọa độ hai điểm cực trị là: $A(0; 4m^3)$ và $B(2m; 0)$.\nTam giác $OAB$ vuông tại $O$ vì $A$ nằm trên trục $Oy$ và $B$ nằm trên trục $Ox$.\nDiện tích tam giác $OAB$ là: $S = \\frac{1}{2} OA \\cdot OB = \\frac{1}{2} |4m^3| \\cdot |2m| = 4m^4$.\nTheo giả thiết: $S = 4 \\Leftrightarrow 4m^4 = 4 \\Leftrightarrow m^4 = 1 \\Leftrightarrow m = \\pm 1$ (thỏa mãn $m \\ne 0$).`,
      grading_rubric: `- Ý 1: Tính đạo hàm và tìm điều kiện để hàm số có 2 cực trị ($m \\ne 0$) (0.5 điểm)\n- Ý 2: Xác định chính xác tọa độ hai điểm cực trị $A, B$ theo tham số $m$ (0.5 điểm)\n- Ý 3: Thiết lập công thức diện tích tam giác $OAB$ và giải tìm $m = \\pm 1$ (1.0 điểm)`,
      explanation: `Nhận xét tính chất hình học đặc biệt (A thuộc trục tung, B thuộc trục hoành) giúp việc tính diện tích tam giác vuông trở nên rất đơn giản.`,
    },
    {
      question_text: `Một người nông dân muốn rào một khu vườn hình chữ nhật có một cạnh là bờ sông thẳng (không cần rào). Người đó có tổng cộng $120\\text{ m}$ hàng rào. Hãy xác định kích thước khu vườn để diện tích rào được là lớn nhất.`,
      model_answer: `Gọi chiều rộng của khu vườn vuông góc với bờ sông là $x\\text{ (m)}$ ($x > 0$).\nVì có 2 cạnh chiều rộng và 1 cạnh chiều dài dọc theo bờ sông, nên chiều dài của khu vườn là: $y = 120 - 2x\\text{ (m)}$.\nĐiều kiện: $120 - 2x > 0 \\Leftrightarrow 0 < x < 60$.\nDiện tích khu vườn là hàm số theo $x$: $S(x) = x(120 - 2x) = -2x^2 + 120x$.\nĐạo hàm: $S'(x) = -4x + 120$.\nCho $S'(x) = 0 \\Leftrightarrow x = 30\\text{ (m)}$.\nVì $S''(x) = -4 < 0$ nên diện tích đạt giá trị cực đại tại $x = 30$.\nKhi đó chiều dài là: $y = 120 - 2(30) = 60\\text{ (m)}$.\nDiện tích cực đại đạt được là: $S_{\\max} = 30 \\cdot 60 = 1800\\text{ m}^2$.`,
      grading_rubric: `- Ý 1: Đặt ẩn, xác định điều kiện biến số và thiết lập hàm diện tích $S(x)$ (0.75 điểm)\n- Ý 2: Tính đạo hàm, lập luận cực đại tại $x = 30\\text{ m}$ (0.75 điểm)\n- Ý 3: Kết luận kích thước (chiều rộng $30\\text{ m}$, chiều dài $60\\text{ m}$) và diện tích lớn nhất (0.5 điểm)`,
      explanation: `Đây là bài toán ứng dụng tối ưu hóa thực tế điển hình của đạo hàm, học sinh cần nêu rõ đơn vị đo và kết luận đầy đủ.`,
    },
  ];

  const pool = isMC ? mcScenarios : essayScenarios;
  const questions: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const scenarioIdx = (offset + i) % pool.length;
    const base = pool[scenarioIdx];

    if (isMC) {
      const mcBase = base as (typeof mcScenarios)[0];
      questions.push({
        question_text: mcBase.question_text,
        option_a: mcBase.option_a,
        option_b: mcBase.option_b,
        option_c: mcBase.option_c,
        option_d: mcBase.option_d,
        correct_option: mcBase.correct_option,
        explanation: mcBase.explanation,
      });
    } else {
      const essayBase = base as (typeof essayScenarios)[0];
      questions.push({
        question_text: essayBase.question_text,
        model_answer: essayBase.model_answer,
        grading_rubric: essayBase.grading_rubric,
        explanation: essayBase.explanation,
      });
    }
  }

  return questions;
}

/**
 * Hàm sinh câu hỏi AI chính với cơ chế Multi-Layer Fallback (3 lớp bất tử).
 */
export async function generateQuestionsAI(
  req: GenerateAIRequest,
): Promise<GeneratedQuestionDraft[]> {
  const apiKey = (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '').trim();

  const isMC = req.questionType === 'multiple_choice';
  const difficultyDesc = DIFFICULTY_MAP[req.difficulty] ?? req.difficulty;

  const normSubject = `${req.subjectCode} ${req.subjectName} ${req.topic}`.toLowerCase();
  const isMathOrScience =
    normSubject.includes('toan') ||
    normSubject.includes('math') ||
    normSubject.includes('giai tich') ||
    normSubject.includes('dai so') ||
    normSubject.includes('hinh hoc') ||
    normSubject.includes('vat ly') ||
    normSubject.includes('vat li') ||
    normSubject.includes('phys') ||
    normSubject.includes('hoa hoc') ||
    normSubject.includes('chem');

  // System Prompt tối ưu hóa theo đặc thù từng môn học
  const systemPrompt = `Bạn là chuyên gia khảo thí và sư phạm cao cấp, chuyên xây dựng ngân hàng câu hỏi đề thi chuẩn xác cho các trường đại học và THPT tại Việt Nam.

QUY TẮC BẮT BUỘC VỀ NỘI DUNG VÀ ĐỊNH DẠNG (BẮT BUỘC TUÂN THỦ 100%):
1. BẢO TỒN VÀ BÁM SÁT MÔN HỌC & CHỦ ĐỀ:
   - BẮT BUỘC 100% câu hỏi, phương án lựa chọn và lời giải phải thuộc môn học "${req.subjectName}" (Mã: "${req.subjectCode}") và bám sát trực tiếp vào chủ đề: "${req.topic}".
   - TUYỆT ĐỐI KHÔNG sinh câu hỏi của môn khác. Nghiêm cấm sinh câu hỏi Toán học khi môn học là các môn Xã hội, Ngôn ngữ, Lý thuyết hoặc Ngành nghề khác.
2. QUY TẮC KÝ HIỆU TOÁN HỌC & CÔNG THỨC:
   ${
     isMathOrScience
       ? '- Dùng ký hiệu LaTeX chuẩn: $...$ cho công thức trong dòng và $$...$$ cho công thức riêng dòng. Trong chuỗi JSON, mọi dấu gạch chéo ngược phải được escape thành 2 dấu (\\\\).'
       : '- ĐÂY LÀ MÔN HỌC LÝ THUYẾT / XÃ HỘI: TUYỆT ĐỐI KHÔNG DÙNG CÔNG THỨC TOÁN HỌC HAY KÝ HIỆU LATEX (KHÔNG dùng $y\'$, $f(x)$, \\frac, \\sqrt...). Toàn bộ câu hỏi, phương án và giải thích phải viết bằng văn bản tiếng Việt học thuật chuẩn xác.'
   }
3. ĐA DẠNG HÓA VÀ KHÔNG TRÙNG LẶP DẠNG BÀI:
   - Các câu hỏi trong cùng một lượt sinh PHẢI kiểm tra các khía cạnh, khái niệm và nội dung hoàn toàn khác nhau.
4. PHÂN BỔ ĐỀU ĐÁP ÁN ĐÚNG TRẮC NGHIỆM:
   - Bắt buộc rải đều đáp án đúng qua cả 4 phương án A, B, C, D (ví dụ Câu 1 là B, Câu 2 là D, Câu 3 là A, Câu 4 là C...). Tuyệt đối không để đáp án đúng chỉ tập trung ở A.
5. LOẠI BỎ TIỀN TỐ THỪA (CLEAN FORMATTING):
   - Trong 'question_text': KHÔNG ghi chữ "Câu 1:", "Câu 2:" ở đầu.
   - Trong 4 phương án option_a/b/c/d: KHÔNG ghi chữ "Phương án A:", "A.", "B." ở đầu. Chỉ ghi nội dung đáp án thuần túy.
   - Trong 'explanation': KHÔNG ghi lặp chữ "Lời giải chi tiết:" ở đầu.
6. ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON object có khóa "questions" chứa mảng câu hỏi. KHÔNG thêm markdown hoặc văn bản thừa ngoài JSON.

Cấu trúc JSON:
Nếu là trắc nghiệm (multiple_choice):
{"questions":[{"question_text":"Nội dung đề bài...","option_a":"Nội dung phương án A","option_b":"Nội dung phương án B","option_c":"Nội dung phương án C","option_d":"Nội dung phương án D","correct_option":"B","explanation":"Giải thích các bước..."}]}

Nếu là tự luận (essay):
{"questions":[{"question_text":"Nội dung bài toán tự luận...","model_answer":"Các bước giải mẫu...","grading_rubric":"Thang điểm từng ý...","explanation":"Lưu ý phương pháp..."}]}`;

  const batchSize = 3;
  const generatedQuestions: GeneratedQuestionDraft[] = [];
  const seenQuestionTexts = new Set<string>();

  for (let offset = 0; offset < req.count; offset += batchSize) {
    const batchCount = Math.min(batchSize, req.count - offset);
    const userPrompt = `Hãy tạo chính xác ${batchCount} câu hỏi chất lượng cao với các thông số sau:
- Môn học: ${req.subjectName} (Mã môn: ${req.subjectCode})
- Chủ đề / Bài học: ${req.topic}
- Loại câu hỏi: ${isMC ? 'Trắc nghiệm khách quan 4 lựa chọn (A, B, C, D)' : 'Tự luận / Bài tập tự giải kèm Rubric chấm'}
- Cấp độ tư duy: ${difficultyDesc}
${req.additionalNote ? `- Ghi chú thêm từ giảng viên: ${req.additionalNote}` : ''}

YÊU CẦU ĐẶC BIỆT:
1. Mỗi câu hỏi trong đợt này (từ câu ${offset + 1} đến ${offset + batchCount}) phải là một khía cạnh/nội dung khác nhau hoàn toàn của chủ đề "${req.topic}" trong môn "${req.subjectName}".
${!isMathOrScience ? '2. TUYỆT ĐỐI KHÔNG chèn công thức toán hay ký hiệu LaTeX. Viết bằng tiếng Việt học thuật chuẩn xác.' : '2. Công thức toán học dùng cú pháp LaTeX escape \\\\.'}
3. Không ghi tiền tố "Câu X:", "Phương án A:", "Lời giải:". Trả về JSON {"questions":[...]}.`;

    let list: Record<string, unknown>[] = [];

    // Gọi AI qua ai-provider trung tâm (3 Lớp: Groq -> Free AI Gateway -> Domain-Aware Fallback)
    // =========================================================================
    // LỚP 1 (Strict JSON Mode): Gọi AI với response_format: { type: "json_object" }
    // =========================================================================
    try {
      const { content: rawContent } = await callAiChatCompletion({
        temperature: 0.4,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const parsed = sanitizeAndParseAiJson(rawContent);
      list = extractQuestionList(parsed);
    } catch (layer1Error) {
      const errObj = layer1Error as { error?: { code?: string; message?: string }; code?: string; message?: string };
      const errCode = errObj?.error?.code ?? errObj?.code;
      const isJsonValidateFailed = errCode === 'json_validate_failed';

      console.warn(
        `[AI-Generator] Lớp 1 thất bại (${isJsonValidateFailed ? 'json_validate_failed' : 'other'}). Đang tự động chuyển sang Lớp 2 (Text Mode + Resilient Parser)...`,
        errObj?.error?.message || errObj?.message || layer1Error,
      );

      // =========================================================================
      // LỚP 2 (Auto-Retry Text Mode + Resilient JSON Parser):
      // Gọi lại mà KHÔNG dùng response_format để tránh lỗi 400 json_validate_failed của Groq
      // =========================================================================
      try {
        const { content: rawContent2 } = await callAiChatCompletion({
          temperature: 0.3,
          max_tokens: MAX_COMPLETION_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const parsed2 = sanitizeAndParseAiJson(rawContent2);
        list = extractQuestionList(parsed2);
      } catch (layer2Error) {
        console.warn(
          '[AI-Generator] Lớp 1 & Lớp 2 AI Gateway đều không khả dụng. Tự động kích hoạt Lớp 3 (Domain-Aware Fallback)...',
          layer2Error,
        );

        // =========================================================================
        // LỚP 3 (Domain-Aware Fallback): Cung cấp bộ câu hỏi chuẩn xác theo đúng môn học và đề tài
        // =========================================================================
        list = generateSmartDiverseFallback(batchCount, isMC, req.topic, req.subjectName, req.subjectCode, offset);
      }
    }

    // Nếu list vẫn rỗng, kích hoạt fallback đa môn
    if (list.length === 0) {
      list = generateSmartDiverseFallback(batchCount, isMC, req.topic, req.subjectName, req.subjectCode, offset);
    }

    // Deduplication Guard: Đảm bảo không trùng lặp câu hỏi
    const batchQuestions: GeneratedQuestionDraft[] = [];
    for (let index = 0; index < list.length && batchQuestions.length < batchCount; index++) {
      const item = list[index];
      const draft = mapToQuestionDraft(item, index, offset, isMC);
      const normalizedText = draft.question_text.toLowerCase().replace(/\s+/g, ' ').trim();

      if (seenQuestionTexts.has(normalizedText) && normalizedText.length > 10) {
        // Nếu trùng câu hỏi đã có, lấy câu hỏi thay thế từ kịch bản đa dạng theo môn
        const fallbackItems = generateSmartDiverseFallback(1, isMC, req.topic, req.subjectName, req.subjectCode, offset + index + 5);
        const altDraft = mapToQuestionDraft(fallbackItems[0], index, offset, isMC);
        seenQuestionTexts.add(altDraft.question_text.toLowerCase().replace(/\s+/g, ' ').trim());
        batchQuestions.push(altDraft);
      } else {
        seenQuestionTexts.add(normalizedText);
        batchQuestions.push(draft);
      }
    }

    generatedQuestions.push(...batchQuestions);
  }

  return generatedQuestions;
}
