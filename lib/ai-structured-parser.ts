/**
 * Bộ phân tích đầu ra cấu trúc XML-Tags (Structured AI Questions Parser),
 * Bộ kiểm duyệt nghiêm ngặt (Strict Validation + Zero-Red-Text KaTeX Gate)
 * và Bộ xây dựng Prompt chuẩn XML cho tính năng "Sinh câu hỏi AI".
 *
 * Module hoàn toàn isomorphic (không phụ thuộc `server-only`), dùng chung cho server và unit test.
 */
import katex from 'katex';
import { cleanPrefix, safeParseAIQuestionsJson, type CleanPrefixMode } from './ai-json-parser';
import { repairLatexAndText } from './latex-repair';
import { parseSegments } from './math-normalize';

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

export type ValidationOptions = {
  offset?: number;
  skipShuffle?: boolean;
};

export type ValidationResult = {
  valid: GeneratedQuestionDraft[];
  rejectedCount: number;
  reasons: string[];
};

const DIFFICULTY_MAP: Record<AIDifficulty, string> = {
  easy: 'Nhận biết (Kiểm tra lý thuyết, định nghĩa, nhận dạng công thức hoặc tính toán đơn giản 1 bước)',
  medium: 'Thông hiểu (Hiểu bản chất, giải thích hiện tượng, vận dụng công thức chuẩn)',
  hard: 'Vận dụng (Bài toán nhiều bước, tư duy logic, tổng hợp kiến thức)',
  expert: 'Vận dụng cao (Phân loại học sinh giỏi, biến đổi phức tạp, liên hệ thực tiễn nâng cao)',
};

// Danh sách tên thẻ đa ký tự được nhận diện bên trong <question>...</question>
// (KHÔNG dùng thẻ 1 chữ cái a/b/c/d để tránh va chạm với bất đẳng thức toán học kiểu $x<a$, $y>b$)
const ALL_KNOWN_INNER_TAGS = [
  'type',
  'question_type',
  'content',
  'question_text',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct',
  'correct_option',
  'correct_answer',
  'answer',
  'sample_answer',
  'model_answer',
  'rubric',
  'grading_rubric',
  'explanation',
];

const NEXT_KNOWN_TAG_ALT = ALL_KNOWN_INNER_TAGS.join('|');

/**
 * Làm sạch và phục hồi LaTeX trên từng trường dữ liệu trước khi kiểm duyệt & trả về Client.
 */
export function sanitizeAndRepairLatex(
  text: unknown,
  mode: CleanPrefixMode = 'none'
): string {
  if (text === null || text === undefined) return '';
  let str = String(text);
  // Gỡ bỏ wrapper CDATA nếu LLM tự bọc <![CDATA[...]]>
  str = str.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, '$1');
  // Gỡ bỏ thẻ <think> sót
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Phục hồi ký tự điều khiển, literal \n, lệnh thiếu \, cases `\` đơn, nâng $...cases...$ -> $$...$$
  str = repairLatexAndText(str);
  // Giải mã HTML entities, chuẩn hóa \(...\) / \[...\], cắt tiền tố thừa theo mode
  str = cleanPrefix(str, mode);
  // Chuẩn hóa khoảng trắng đầu/cuối từng dòng và không để quá 2 dòng trống liên tiếp
  str = str
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return str;
}

/**
 * Trích xuất nội dung của một thẻ cấu trúc bên trong khối `<question>...</question>`.
 * Hỗ trợ:
 * - Không phân biệt hoa/thường, nhiều dòng.
 * - An toàn với dấu `<`, `>` toán học (như `$x < 2$`, `$a > 0$`) vì chỉ khớp đúng tên thẻ biết trước.
 * - Tự dự phòng nếu LLM quên đóng thẻ trước khi mở thẻ kế tiếp.
 */
function extractXmlTag(block: string, tagNames: string[]): string | undefined {
  for (const tag of tagNames) {
    const exactRe = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const exactMatch = exactRe.exec(block);
    if (exactMatch && exactMatch[1] !== undefined) {
      return exactMatch[1].trim();
    }

    // Dự phòng: thẻ mở nhưng thiếu thẻ đóng, kết thúc trước thẻ anh em tiếp theo hoặc hết block
    const unclosedRe = new RegExp(
      `<${tag}\\b[^>]*>([\\s\\S]*?)(?=<\\/?(?:${NEXT_KNOWN_TAG_ALT})\\b[^>]*>|$)`,
      'i'
    );
    const unclosedMatch = unclosedRe.exec(block);
    if (unclosedMatch && unclosedMatch[1] !== undefined) {
      return unclosedMatch[1].trim();
    }
  }
  return undefined;
}

/**
 * Lớp 1: Phân tích trực tiếp các khối `<question>...</question>` (KHÔNG qua JSON.parse).
 */
function parseXmlQuestionBlocks(rawText: string): Record<string, unknown>[] {
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:xml|html|markdown|text)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  const blocks: string[] = [];
  const blockRe = /<question\b[^>]*>([\s\S]*?)<\/question>/gi;
  let match: RegExpExecArray | null;
  let lastMatchedEnd = 0;

  while ((match = blockRe.exec(cleaned)) !== null) {
    blocks.push(match[1]);
    lastMatchedEnd = blockRe.lastIndex;
  }

  // Kiểm tra trường hợp khối <question> cuối bị cắt cụt thiếu </question> nhưng vẫn đủ nội dung
  const tail = cleaned.slice(lastMatchedEnd);
  const trailingOpen = /<question\b[^>]*>([\s\S]+)$/i.exec(tail);
  if (trailingOpen && trailingOpen[1]) {
    blocks.push(trailingOpen[1]);
  }

  const parsed: Record<string, unknown>[] = [];
  for (const block of blocks) {
    const content = extractXmlTag(block, ['content', 'question_text', 'question']);
    const type = extractXmlTag(block, ['type', 'question_type']);
    const optionA = extractXmlTag(block, ['option_a']);
    const optionB = extractXmlTag(block, ['option_b']);
    const optionC = extractXmlTag(block, ['option_c']);
    const optionD = extractXmlTag(block, ['option_d']);
    const correct = extractXmlTag(block, ['correct', 'correct_option', 'correct_answer', 'answer']);
    const sampleAnswer = extractXmlTag(block, ['sample_answer', 'model_answer']);
    const rubric = extractXmlTag(block, ['rubric', 'grading_rubric']);
    const explanation = extractXmlTag(block, ['explanation']);

    if (
      content ||
      optionA ||
      optionB ||
      optionC ||
      optionD ||
      sampleAnswer ||
      rubric
    ) {
      parsed.push({
        type,
        content: content ?? '',
        option_a: optionA ?? '',
        option_b: optionB ?? '',
        option_c: optionC ?? '',
        option_d: optionD ?? '',
        correct: correct ?? '',
        sample_answer: sampleAnswer ?? '',
        rubric: rubric ?? '',
        explanation: explanation ?? '',
      });
    }
  }

  return parsed;
}

/**
 * Bộ Parser 2 lớp (`parseStructuredAIQuestions`):
 * - Lớp 1 (Ưu tiên): Parse trực tiếp các khối `<question>...</question>` bằng regex multiline.
 *   Không đi qua `JSON.parse()` -> 0% nguy cơ nuốt `\f`, `\b`, `\n`, `\r`, `\t`, `\\`.
 * - Lớp 2 (Dự phòng): Nếu model vẫn trả JSON, chạy `safeParseAIQuestionsJson` (có bảo vệ LaTeX trước JSON.parse).
 */
export function parseStructuredAIQuestions(rawText: string): Record<string, unknown>[] {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // Lớp 1: Structured XML Tags
  const xmlItems = parseXmlQuestionBlocks(rawText);
  if (xmlItems.length > 0) {
    return xmlItems;
  }

  // Lớp 2: Fallback JSON có bảo vệ dấu `\` của LaTeX
  try {
    return safeParseAIQuestionsJson(rawText);
  } catch {
    return [];
  }
}

/**
 * Cổng kiểm tra KaTeX (Zero-Red-Text Gate):
 * Kiểm tra chuỗi văn bản + công thức qua đúng `parseSegments` của `<MathText />` và `katex.renderToString`
 * với `throwOnError: true` để đảm bảo 0 ký tự đỏ và 0 ký tự điều khiển hỏng lọt ra giao diện.
 */
export function checkKatexRenderable(text: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!text) return { ok: true, errors };

  // 1. Cấm tuyệt đối ký tự điều khiển rác (\u0008, \u000C, \u000D...) và ký tự thay thế \uFFFD
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(text)) {
    errors.push('Còn tồn tại ký tự điều khiển ASCII hoặc ký tự lỗi mã hóa.');
  }

  // 2. Cấm chuỗi literal `\n` thô (không phải lệnh LaTeX bắt đầu bằng `n`)
  if (/(?<!\\)\\n(?!(?:eq|e|abla|u|ot|otin|i|ewline|leq|geq|mid|parallel|subseteq|supseteq|exists|eg|cong|sim|earrow|warrow|atural|olimits|onumber|otag|Rightarrow|Leftrightarrow|rightarrow|leftarrow|less|gtr)(?![a-zA-Z]))/.test(text)) {
    errors.push('Còn sót chuỗi literal \\n chưa được chuyển thành xuống dòng.');
  }

  const segments = parseSegments(text);

  for (const seg of segments) {
    if (seg.type === 'text') {
      // Nếu vẫn còn lộ \begin{cases} hoặc \end{cases} ở plain text tức là delimiter $ bị hỏng
      if (/\\(?:begin|end)\{(?:cases|pmatrix|bmatrix|vmatrix|aligned)\}/.test(seg.value)) {
        errors.push('Môi trường toán nhiều dòng bị lộ ra ngoài khối $$.');
      }
      continue;
    }

    try {
      katex.renderToString(seg.value, {
        displayMode: seg.type === 'block-math',
        throwOnError: true,
        strict: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Lỗi KaTeX ở "${seg.value.slice(0, 60)}": ${msg}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Tự động shuffle 4 phương án A-B-C-D (Fisher-Yates) và cập nhật `correct_option` tương ứng.
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
    { text: optA, isCorrect: originalCorrect === 'A' },
    { text: optB, isCorrect: originalCorrect === 'B' },
    { text: optC, isCorrect: originalCorrect === 'C' },
    { text: optD, isCorrect: originalCorrect === 'D' },
  ];

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
 * Trích xuất ký tự đáp án đúng hợp lệ ('A' | 'B' | 'C' | 'D'). Trả về null nếu thiếu/sai định dạng.
 */
function parseCorrectLetter(raw: unknown): 'A' | 'B' | 'C' | 'D' | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D') return s;

  const match = /^(?:(?:ĐÁP ÁN|PHƯƠNG ÁN|OPTION|ANSWER)\s*[:.]?\s*)?([ABCD])(?:[\s.):]|$)/i.exec(s);
  if (match && match[1]) {
    const letter = match[1].toUpperCase();
    if (letter === 'A' || letter === 'B' || letter === 'C' || letter === 'D') {
      return letter;
    }
  }
  return null;
}

/**
 * Bộ kiểm duyệt nghiêm ngặt (`validateAndCleanQuestions`):
 * 1. Lọc bỏ tuyệt đối mọi câu hỏi rỗng, thiếu đề bài (< 8 ký tự), thiếu phương án A-B-C-D hoặc đáp án sai.
 * 2. Với Tự luận: bắt buộc có `sample_answer >= 5` ký tự và `rubric` khác rỗng.
 * 3. Chạy `sanitizeAndRepairLatex` trên TẤT CẢ các trường.
 * 4. Chạy Zero-Red-Text Gate (`checkKatexRenderable`) — loại bỏ câu nào vẫn còn lỗi cú pháp KaTeX.
 */
export function validateAndCleanQuestions(
  rawItems: Record<string, unknown>[],
  expectedType: 'multiple_choice' | 'essay',
  options: ValidationOptions = {}
): ValidationResult {
  const valid: GeneratedQuestionDraft[] = [];
  const reasons: string[] = [];
  let rejectedCount = 0;
  const offset = options.offset ?? 0;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { valid, rejectedCount: 0, reasons };
  }

  const isMC = expectedType === 'multiple_choice';

  for (let index = 0; index < rawItems.length; index++) {
    const item = rawItems[index];
    if (!item || typeof item !== 'object') {
      rejectedCount++;
      reasons.push(`Câu #${index + 1}: Dữ liệu không phải object.`);
      continue;
    }

    const rawContent = item.content ?? item.question_text ?? item.question ?? item.de_bai ?? '';
    const questionText = sanitizeAndRepairLatex(rawContent, 'question');

    if (questionText.length < 8) {
      rejectedCount++;
      reasons.push(`Câu #${index + 1}: Đề bài rỗng hoặc quá ngắn (${questionText.length} ký tự).`);
      continue;
    }

    const rawExplanation =
      item.explanation ?? item.loi_giai ?? item.giai_thich ?? item.huong_dan ?? '';
    const explanation = sanitizeAndRepairLatex(rawExplanation, 'explanation');

    const tempId = `gen-${Date.now()}-${offset + index}-${Math.random().toString(36).substring(2, 6)}`;

    if (isMC) {
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';

      if (Array.isArray(item.options) && item.options.length >= 4) {
        optA = sanitizeAndRepairLatex(item.options[0], 'option');
        optB = sanitizeAndRepairLatex(item.options[1], 'option');
        optC = sanitizeAndRepairLatex(item.options[2], 'option');
        optD = sanitizeAndRepairLatex(item.options[3], 'option');
      } else {
        optA = sanitizeAndRepairLatex(item.option_a ?? item.a ?? item.A ?? '', 'option');
        optB = sanitizeAndRepairLatex(item.option_b ?? item.b ?? item.B ?? '', 'option');
        optC = sanitizeAndRepairLatex(item.option_c ?? item.c ?? item.C ?? '', 'option');
        optD = sanitizeAndRepairLatex(item.option_d ?? item.d ?? item.D ?? '', 'option');
      }

      if (optA.length < 1 || optB.length < 1 || optC.length < 1 || optD.length < 1) {
        rejectedCount++;
        reasons.push(`Câu #${index + 1}: Thiếu phương án A/B/C/D (có phương án rỗng).`);
        continue;
      }

      // Kiểm tra 4 phương án không bị trùng y hệt nhau
      const normalizedOpts = [optA, optB, optC, optD].map((o) =>
        o.toLowerCase().replace(/\s+/g, '')
      );
      if (new Set(normalizedOpts).size < 4) {
        rejectedCount++;
        reasons.push(`Câu #${index + 1}: Có phương án trùng lặp nội dung.`);
        continue;
      }

      const parsedCorrect = parseCorrectLetter(
        item.correct ?? item.correct_option ?? item.correct_answer ?? item.answer
      );
      if (!parsedCorrect) {
        rejectedCount++;
        reasons.push(`Câu #${index + 1}: Thiếu hoặc sai mã đáp án đúng (không thuộc A/B/C/D).`);
        continue;
      }

      // Cổng kiểm tra KaTeX (Zero-Red-Text Gate)
      const fieldsToCheck: Array<[string, string]> = [
        ['content', questionText],
        ['option_a', optA],
        ['option_b', optB],
        ['option_c', optC],
        ['option_d', optD],
        ['explanation', explanation],
      ];

      const katexFailure = fieldsToCheck
        .map(([field, val]) => ({ field, res: checkKatexRenderable(val) }))
        .find((x) => !x.res.ok);

      if (katexFailure) {
        rejectedCount++;
        reasons.push(
          `Câu #${index + 1} (${katexFailure.field}): ${katexFailure.res.errors.join('; ')}`
        );
        continue;
      }

      const finalOpts = options.skipShuffle
        ? { optA, optB, optC, optD, correct: parsedCorrect }
        : shuffleMultipleChoiceOptions(optA, optB, optC, optD, parsedCorrect);

      valid.push({
        tempId,
        question_type: 'multiple_choice',
        question_text: questionText,
        option_a: finalOpts.optA,
        option_b: finalOpts.optB,
        option_c: finalOpts.optC,
        option_d: finalOpts.optD,
        correct_option: finalOpts.correct,
        explanation,
      });
    } else {
      // Tự luận
      const rawSampleAnswer =
        item.sample_answer ?? item.model_answer ?? item.dap_an_mau ?? item.answer ?? '';
      const rawRubric =
        item.rubric ?? item.grading_rubric ?? item.thang_diem ?? item.tieu_chi ?? '';

      const modelAnswer = sanitizeAndRepairLatex(rawSampleAnswer, 'answer');
      const gradingRubric = sanitizeAndRepairLatex(rawRubric, 'rubric');

      if (modelAnswer.length < 5) {
        rejectedCount++;
        reasons.push(`Câu #${index + 1}: Đáp án mẫu tự luận quá ngắn hoặc rỗng.`);
        continue;
      }

      if (gradingRubric.length < 1) {
        rejectedCount++;
        reasons.push(`Câu #${index + 1}: Thiếu thang điểm / Rubric chấm.`);
        continue;
      }

      // Cổng kiểm tra KaTeX (Zero-Red-Text Gate)
      const fieldsToCheck: Array<[string, string]> = [
        ['content', questionText],
        ['sample_answer', modelAnswer],
        ['rubric', gradingRubric],
        ['explanation', explanation],
      ];

      const katexFailure = fieldsToCheck
        .map(([field, val]) => ({ field, res: checkKatexRenderable(val) }))
        .find((x) => !x.res.ok);

      if (katexFailure) {
        rejectedCount++;
        reasons.push(
          `Câu #${index + 1} (${katexFailure.field}): ${katexFailure.res.errors.join('; ')}`
        );
        continue;
      }

      valid.push({
        tempId,
        question_type: 'essay',
        question_text: questionText,
        model_answer: modelAnswer,
        grading_rubric: gradingRubric,
        explanation,
      });
    }
  }

  return { valid, rejectedCount, reasons };
}

/**
 * Xây dựng System Prompt & User Prompt chuẩn XML Tags (KHÔNG dùng JSON) cho LLM.
 * Triệt tiêu tận gốc lỗi nuốt backslash LaTeX và lỗi `400 json_validate_failed`.
 */
export function buildStructuredQuestionPrompts(
  req: GenerateAIRequest,
  batchCount: number,
  offset: number,
  existingStems: string[] = []
): { systemPrompt: string; userPrompt: string } {
  const isMC = req.questionType === 'multiple_choice';
  const difficultyDesc = DIFFICULTY_MAP[req.difficulty] ?? req.difficulty;

  const normSubject = `${req.subjectCode} ${req.subjectName} ${req.topic}`.toLowerCase();
  const isMathOrScience =
    normSubject.includes('toan') ||
    normSubject.includes('toán') ||
    normSubject.includes('math') ||
    normSubject.includes('giai tich') ||
    normSubject.includes('giải tích') ||
    normSubject.includes('dai so') ||
    normSubject.includes('đại số') ||
    normSubject.includes('hinh hoc') ||
    normSubject.includes('hình học') ||
    normSubject.includes('vat ly') ||
    normSubject.includes('vật lý') ||
    normSubject.includes('vat li') ||
    normSubject.includes('phys') ||
    normSubject.includes('hoa hoc') ||
    normSubject.includes('hóa học') ||
    normSubject.includes('chem') ||
    normSubject.includes('toa do') ||
    normSubject.includes('tọa độ') ||
    normSubject.includes('vecto') ||
    normSubject.includes('vectơ') ||
    normSubject.includes('ham so') ||
    normSubject.includes('hàm số') ||
    normSubject.includes('phuong trinh') ||
    normSubject.includes('phương trình');

  const xmlTemplate = isMC
    ? `<question>
  <type>multiple_choice</type>
  <content>Cho hai điểm $A(1, 2, 3)$ và $B(4, 0, 1)$. Tìm tọa độ vectơ $\\overrightarrow{AB}$ và độ dài của nó.</content>
  <option_a>$\\overrightarrow{AB} = (3; -2; -2)$, độ dài $\\sqrt{17}$</option_a>
  <option_b>$\\overrightarrow{AB} = (3; 2; -2)$, độ dài $\\sqrt{17}$</option_b>
  <option_c>$\\overrightarrow{AB} = (3; -2; -2)$, độ dài $\\sqrt{13}$</option_c>
  <option_d>$\\overrightarrow{AB} = (-3; 2; 2)$, độ dài $\\sqrt{17}$</option_d>
  <correct>A</correct>
  <explanation>Ta có $\\overrightarrow{AB} = (4-1; 0-2; 1-3) = (3; -2; -2)$. Độ dài $\\vert\\overrightarrow{AB}\\vert = \\sqrt{3^2 + (-2)^2 + (-2)^2} = \\sqrt{17}$.</explanation>
</question>`
    : `<question>
  <type>essay</type>
  <content>Trong không gian $Oxyz$, viết phương trình tham số của đường thẳng $d$ đi qua hai điểm $A(1; -1; 3)$ và $B(3; 0; 2)$.</content>
  <sample_answer>Vectơ chỉ phương của đường thẳng $d$ là $\\overrightarrow{AB} = (2; 1; -1)$.
Đường thẳng $d$ đi qua $A(1; -1; 3)$ và có vectơ chỉ phương $\\vec{u} = (2; 1; -1)$ nên có phương trình tham số:
$$\\begin{cases} x = 1 + 2t \\\\ y = -1 + t \\\\ z = 3 - t \\end{cases} \\quad (t \\in \\mathbb{R})$$</sample_answer>
  <rubric>- 3.0 điểm: Tính đúng tọa độ vectơ chỉ phương $\\overrightarrow{AB} = (2; 1; -1)$.
- 5.0 điểm: Viết đúng công thức và hệ phương trình tham số của đường thẳng $d$.
- 2.0 điểm: Nêu rõ điều kiện tham số $t \\in \\mathbb{R}$ và trình bày sạch đẹp, chính xác.</rubric>
  <explanation>Học sinh có thể chọn điểm đi qua là $B(3; 0; 2)$ hoặc dùng vectơ cùng phương $k\\overrightarrow{AB}$ ($k \\neq 0$) vẫn đạt điểm tối đa nếu lập luận đúng.</explanation>
</question>`;

  const latexRules = isMathOrScience
    ? `4. QUY TẮC LATEX CHUẨN KATEX (BẮT BUỘC TUYỆT ĐỐI):
   - Viết LaTeX trực tiếp tự nhiên với 1 dấu gạch chéo ngược (ví dụ: $\\frac{a}{b}$, $\\sqrt{17}$, $\\vec{u}$, $\\overrightarrow{AB}$, $\\neq$, $\\in \\mathbb{R}$). KHÔNG double-escape kiểu JSON.
   - CẤM TUYỆT ĐỐI dùng \\boldsymbol (hãy thay bằng \\vec{u}, \\overrightarrow{AB}, \\mathbf{u}).
   - CẤM TUYỆT ĐỐI dùng \\root (bắt buộc dùng \\sqrt{...} hoặc \\sqrt[n]{...}).
   - Mọi công thức nhiều dòng hoặc có \\begin{cases}...\\end{cases}, \\begin{pmatrix}...\\end{pmatrix}, \\begin{aligned}...\\end{aligned} BẮT BUỘC bọc bằng $$...$$ (KHÔNG bọc bằng dấu $ đơn), và dùng đúng hai dấu gạch chéo ngược \\\\ để xuống dòng giữa các phương trình trong hệ.
   - Xuống dòng trong <rubric>, <sample_answer>, <explanation> bằng ký tự xuống dòng thật (Enter), TUYỆT ĐỐI KHÔNG viết chuỗi chữ \\n.`
    : `4. QUY TẮC TRÌNH BÀY:
   - Viết bằng tiếng Việt học thuật chuẩn xác, rõ ràng. Không dùng công thức Toán khi môn học thuộc nhóm Xã hội / Ngôn ngữ / Lý thuyết thuần túy.
   - Xuống dòng trong <rubric>, <sample_answer>, <explanation> bằng dòng mới thật (Enter), TUYỆT ĐỐI KHÔNG viết chuỗi chữ \\n.`;

  const systemPrompt = `Bạn là Chuyên gia Khảo thí & Biên soạn Đề thi của hệ thống E-Learning (Đại học Lạc Hồng).

NHIỆM VỤ: Biên soạn các câu hỏi ${isMC ? 'TRẮC NGHIỆM 4 LỰA CHỌN (A, B, C, D)' : 'TỰ LUẬN KÈM ĐÁP ÁN MẪU VÀ RUBRIC CHẤM THANG ĐIỂM 10'} cho môn "${req.subjectName}" (Mã: "${req.subjectCode}").

QUY TẮC BẮT BUỘC (VI PHẠM SẼ BỊ LOẠI BỎ):
1. BÁM SÁT 100% CHỦ ĐỀ & NỘI DUNG YÊU CẦU:
   - MỌI câu hỏi sinh ra BẮT BUỘC xoay quanh đúng chủ đề/nội dung kiến thức được giao.
   - Nếu chủ đề là "Phương pháp tọa độ trong mặt phẳng và không gian" -> 100% câu hỏi về tọa độ điểm, vectơ, đường thẳng, mặt phẳng, mặt cầu trong Oxy/Oxyz. TUYỆT ĐỐI KHÔNG lạc sang Đạo hàm hay Tích phân!
   - Nếu người dùng dán đoạn bài giảng/tài liệu/code -> CHỈ tạo câu hỏi trực tiếp từ đúng nội dung đó.
2. CHÍNH XÁC TUYỆT ĐỐI VỀ HỌC THUẬT & TOÁN HỌC:
   - Tự tính toán và kiểm tra lại từng bước trước khi viết thẻ <correct> để đáp án đúng khớp 100% với lời giải trong <explanation>.
   - ${isMC ? '4 phương án <option_a>, <option_b>, <option_c>, <option_d> đều phải khác rỗng và hoàn toàn khác nhau; thẻ <correct> CHỈ chứa đúng 1 chữ cái in hoa: A, B, C hoặc D.' : 'Thẻ <sample_answer> đầy đủ các bước giải; thẻ <rubric> chia tiêu chí gạch đầu dòng rõ ràng, tổng điểm đúng bằng 10.0 điểm.'}
3. ĐA DẠNG & KHÔNG TRÙNG LẶP:
   - Mỗi câu hỏi khai thác một dạng toán/khía cạnh khác nhau.
   - Trong <content>: KHÔNG ghi "Câu 1:", "Câu 2:" ở đầu.
   - Trong các <option_a..d>: KHÔNG ghi "A.", "B." ở đầu.
${latexRules}
5. ĐỊNH DẠNG ĐẦU RA BẮT BUỘC — CHỈ XUẤT CÁC KHỐI THẺ XML THUẦN VĂN BẢN (KHÔNG DÙNG JSON, KHÔNG BỌC \`\`\`):
   Mỗi câu hỏi nằm trong đúng một cặp thẻ <question>...</question> theo mẫu sau:

${xmlTemplate}`;

  const nonce = `${Date.now()}-${offset}-${Math.random().toString(36).substring(2, 6)}`;
  const avoidBlock =
    existingStems.length > 0
      ? `\n- KHÔNG lặp lại các đề bài đã có sau đây:\n${existingStems
          .slice(0, 8)
          .map((s, idx) => `  ${idx + 1}. ${s.slice(0, 120)}`)
          .join('\n')}`
      : '';

  const userPrompt = `Hãy biên soạn CHÍNH XÁC ${batchCount} câu hỏi ${isMC ? 'trắc nghiệm (đủ 4 phương án A-B-C-D khác rỗng)' : 'tự luận (đủ <sample_answer>, <rubric> tổng 10 điểm và <explanation>)'}:
- Môn học: ${req.subjectName} (Mã môn: ${req.subjectCode})
- CHỦ ĐỀ / NỘI DUNG KIẾN THỨC BẮT BUỘC:
"""
${req.topic}
"""
- Mức độ nhận thức: ${difficultyDesc}
${req.additionalNote ? `- Ghi chú thêm từ giảng viên: ${req.additionalNote}` : ''}${avoidBlock}
- Mã phiên chống lặp: ${nonce}

YÊU CẦU:
1. Đúng ${batchCount} khối <question>...</question> liên tiếp (từ câu ${offset + 1} đến câu ${offset + batchCount}), bám sát 100% chủ đề ở trên.
2. CHỈ xuất các khối thẻ <question>...</question>, KHÔNG xuất JSON, KHÔNG lời mở đầu hay kết thúc thừa.`;

  return { systemPrompt, userPrompt };
}
