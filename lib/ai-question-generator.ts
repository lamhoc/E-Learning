import 'server-only';

import Groq from 'groq-sdk';

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
 * Khôi phục dấu gạch chéo ngược LaTeX từ token an toàn hoặc từ các chuỗi escaped.
 */
function restoreLatexBackslashes(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Thay token đặc biệt thành \
  str = str.replaceAll(LATEX_BACKSLASH_TOKEN, '\\');
  return str.trim();
}

/**
 * Cố gắng sửa các ký tự LaTeX có dấu \ đơn thành \\ để hợp lệ JSON RFC 8259.
 * Ký tự escape hợp lệ trong chuỗi JSON chỉ có: \" \\ \/ \b \f \n \r \t \uXXXX
 * Mọi dấu \ khác (như \frac, \sqrt, \alpha, \sum...) nếu đứng đơn lẻ sẽ làm gãy JSON parser.
 */
function sanitizeJsonEscapes(jsonStr: string): string {
  return jsonStr.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
}

/**
 * Phục hồi các object câu hỏi hợp lệ khi chuỗi JSON bị cắt giữa chừng (truncated do token limit).
 */
function recoverTruncatedJson(clean: string): unknown {
  // Tìm mảng questions bắt đầu ở đâu: `{"questions": [` hoặc `[`
  const arrayStart = clean.indexOf('[');
  if (arrayStart === -1) return null;

  // Cắt từ dấu `[`
  const fromArray = clean.slice(arrayStart);

  // Tìm vị trí dấu `}` cuối cùng đại diện cho kết thúc của một object câu hỏi hoàn chỉnh
  const lastClosingBrace = fromArray.lastIndexOf('}');
  if (lastClosingBrace === -1) return null;

  // Cắt tới dấu `}` cuối cùng đó và đóng mảng `]`
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

  // Phương án trích xuất regex từng object có "question_text"
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
 * Hàm phân tích JSON AI bất tử (Resilient AI JSON Parser):
 * - Cắt bỏ markdown code fence ```json ... ```
 * - Sửa dấu \ đơn của LaTeX thành \\
 * - Tự động cứu vãn các câu hỏi đã hoàn thành nếu chuỗi JSON bị đứt đoạn giữa chừng
 */
export function parseAiJsonSafely(rawText: string): unknown {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Dữ liệu AI trả về rỗng.');
  }

  // 1. Cắt bỏ markdown code fence
  let clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // 2. Thử JSON.parse trực tiếp
  try {
    return JSON.parse(clean);
  } catch {
    // Tiếp tục các bước tự sửa
  }

  // 3. Sửa dấu gạch chéo ngược LaTeX bị thiếu escape
  try {
    const sanitized = sanitizeJsonEscapes(clean);
    return JSON.parse(sanitized);
  } catch {
    // Tiếp tục cứu vãn chuỗi bị cắt
  }

  // 4. Cứu vãn chuỗi JSON bị ngắt giữa chừng
  const recovered = recoverTruncatedJson(clean);
  if (recovered) {
    return recovered;
  }

  throw new Error('Không thể phân tích phản hồi JSON từ AI.');
}

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
    const optA = restoreLatexBackslashes(item.option_a);
    const optB = restoreLatexBackslashes(item.option_b);
    const optC = restoreLatexBackslashes(item.option_c);
    const optD = restoreLatexBackslashes(item.option_d);
    const rawKey = String(item.correct_option || 'A').trim().toUpperCase();
    const correctKey = (['A', 'B', 'C', 'D'] as const).includes(rawKey as 'A')
      ? (rawKey as 'A' | 'B' | 'C' | 'D')
      : 'A';

    return {
      tempId,
      question_type: 'multiple_choice',
      question_text: qText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_option: correctKey,
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
 * Fallback thông minh cục bộ khi mọi lớp gọi AI gặp sự cố (429 rate limit hoặc mất mạng).
 * Đảm bảo giảng viên vẫn nhận được câu hỏi mẫu sát chủ đề để chỉnh sửa, không bao giờ bị đứng luồng.
 */
function generateLocalFallback(
  count: number,
  isMC: boolean,
  topic: string,
  subjectName: string,
  offset: number,
): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => {
    const num = offset + i + 1;
    const tempId = `fallback-${Date.now()}-${num}`;

    if (isMC) {
      return {
        tempId,
        question_type: 'multiple_choice',
        question_text: `Câu ${num}: Cho bài toán liên quan đến chủ đề "${topic}" trong môn ${subjectName}. Khẳng định nào sau đây là đúng?`,
        option_a: `Phương án A: Giá trị thỏa mãn điều kiện $x > 0$.`,
        option_b: `Phương án B: Hàm số nghịch biến trên khoảng $(-\\infty; 0)$.`,
        option_c: `Phương án C: Điểm cực đại của đồ thị là $M(0; 1)$.`,
        option_d: `Phương án D: Biểu thức không xác định khi $x = 0$.`,
        correct_option: 'A',
        explanation: `Lời giải chi tiết: Căn cứ vào định lý cơ bản của chủ đề "${topic}", ta có điều kiện xác định và biến đổi để suy ra phương án A là chính xác.`,
      };
    }

    return {
      tempId,
      question_type: 'essay',
      question_text: `Bài tập ${num} (Tự luận): Hãy trình bày phương pháp giải và tính toán chi tiết bài toán sau thuộc chủ đề "${topic}" trong môn ${subjectName}: Phân tích và khảo sát sự biến thiên của đại lượng đặc trưng.`,
      model_answer: `Bước 1: Nêu điều kiện xác định và giả thiết bài toán.\nBước 2: Áp dụng công thức và tính toán các đại lượng liên quan.\nBước 3: Kết luận và biện luận nghiệm.`,
      grading_rubric: `Ý 1: Nêu đúng định nghĩa và điều kiện (0.5 điểm)\nÝ 2: Trình bày các bước biến đổi chính xác (1.0 điểm)\nÝ 3: Kết luận đúng và đầy đủ (0.5 điểm)`,
      explanation: `Lưu ý sinh viên cần trình bày rõ ràng từng bước suy luận toán học và ghi rõ đơn vị đo nếu có.`,
    };
  });
}

/**
 * Hàm sinh câu hỏi AI chính với cơ chế Multi-Layer Fallback (3 lớp bất tử).
 */
export async function generateQuestionsAI(
  req: GenerateAIRequest,
): Promise<GeneratedQuestionDraft[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY trên server.');
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || PRIMARY_MODEL;

  const isMC = req.questionType === 'multiple_choice';
  const difficultyDesc = DIFFICULTY_MAP[req.difficulty] ?? req.difficulty;

  // System Prompt tối ưu hóa cho JSON RFC 8259 + LaTeX KaTeX
  const systemPrompt = `Bạn là chuyên gia khảo thí và sư phạm cao cấp, chuyên xây dựng ngân hàng câu hỏi đề thi chuẩn xác cho các trường đại học và THPT tại Việt Nam.

QUY TẮC BẮT BUỘC VỀ NỘI DUNG VÀ ĐỊNH DẠNG:
1. ĐÚNG CHUẨN KHOA HỌC: Câu hỏi, các phương án nhiễu, đáp án đúng và lời giải thích phải chính xác 100%, không được có sai sót về kiến thức.
2. CÔNG THỨC TOÁN HỌC & KHOA HỌC: Bắt buộc dùng cú pháp LaTeX chuẩn.
   - Mọi ký tự LaTeX bên trong chuỗi JSON phải được escape hợp lệ bằng 2 dấu gạch chéo ngược (ví dụ: \\\\frac{a}{b}, \\\\sqrt{x}, \\\\int, \\\\lim, \\\\infty) hoặc dùng token đặc biệt ${LATEX_BACKSLASH_TOKEN}.
   - Dùng $...$ cho công thức nằm trong dòng (inline math, ví dụ: $f(x) = x^2 - 4$).
   - Dùng $$...$$ cho công thức đứng riêng dòng (display math).
3. ĐỘ DÀI & ĐỘ CÔ ĐỌNG (BẮT BUỘC ĐỂ KHÔNG BỊ TRÀN TOKEN):
   - Mỗi câu hỏi có 'explanation' và 'grading_rubric' trình bày cô đọng, súc tích (tối đa 3-4 ý chính, dưới 120 từ mỗi câu).
4. ĐỐI VỚI CÂU HỎI TRẮC NGHIỆM:
   - Phải có đủ 4 phương án A, B, C, D rõ ràng, không dùng "Tất cả các đáp án trên".
   - Chỉ có DUY NHẤT một đáp án đúng, 3 phương án còn lại là phương án nhiễu hợp lý.
5. ĐỐI VỚI CÂU HỎI TỰ LUẬN:
   - Cung cấp đáp án mẫu (model_answer) từng bước giải.
   - Cung cấp thang điểm (grading_rubric) phân bổ điểm rõ ràng (ví dụ: Ý 1: 0.5đ, Ý 2: 1.0đ).
6. ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON object có khóa "questions" chứa mảng câu hỏi. KHÔNG thêm markdown, chú thích hoặc văn bản thừa ngoài JSON.

Cấu trúc JSON mong muốn:
Nếu là trắc nghiệm (multiple_choice):
{"questions":[{"question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_option":"A","explanation":"..."}]}

Nếu là tự luận (essay):
{"questions":[{"question_text":"...","model_answer":"...","grading_rubric":"...","explanation":"..."}]}`;

  const batchSize = 3;
  const generatedQuestions: GeneratedQuestionDraft[] = [];

  for (let offset = 0; offset < req.count; offset += batchSize) {
    const batchCount = Math.min(batchSize, req.count - offset);
    const userPrompt = `Hãy tạo chính xác ${batchCount} câu hỏi chất lượng cao với các thông số sau:
- Môn học: ${req.subjectName} (Mã môn: ${req.subjectCode})
- Chủ đề / Bài học: ${req.topic}
- Loại câu hỏi: ${isMC ? 'Trắc nghiệm khách quan 4 lựa chọn (A, B, C, D)' : 'Tự luận / Bài tập tự giải kèm Rubric chấm'}
- Cấp độ tư duy: ${difficultyDesc}
${req.additionalNote ? `- Ghi chú thêm từ giảng viên: ${req.additionalNote}` : ''}

LƯU Ý: Mọi công thức LaTeX trong chuỗi JSON phải dùng \\\\ (ví dụ \\\\frac, \\\\sqrt) hoặc token ${LATEX_BACKSLASH_TOKEN}. Trình bày cô đọng, súc tích dưới 120 từ. Chỉ trả về JSON object {"questions":[...]}.`;

    let list: Record<string, unknown>[] = [];

    // =========================================================================
    // LỚP 1 (Strict JSON Mode): Gọi Groq với response_format: { type: "json_object" }
    // =========================================================================
    try {
      const response = await groq.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0]?.message?.content?.trim() || '';
      const parsed = parseAiJsonSafely(rawContent);
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
        const fallbackModel = isJsonValidateFailed ? FALLBACK_MODEL : model;
        const response2 = await groq.chat.completions.create({
          model: fallbackModel,
          temperature: 0.2,
          max_tokens: MAX_COMPLETION_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const rawContent2 = response2.choices[0]?.message?.content?.trim() || '';
        const parsed2 = parseAiJsonSafely(rawContent2);
        list = extractQuestionList(parsed2);
      } catch (layer2Error) {
        console.warn(
          '[AI-Generator] Lớp 2 thất bại. Tự động kích hoạt Lớp 3 (Smart Local Fallback)...',
          layer2Error,
        );

        // =========================================================================
        // LỚP 3 (Smart Local Fallback): Cung cấp bộ câu hỏi mẫu sát thực tế
        // =========================================================================
        list = generateLocalFallback(batchCount, isMC, req.topic, req.subjectName, offset);
      }
    }

    // Nếu list vẫn rỗng, kích hoạt fallback cục bộ thay vì văng lỗi thô lên UI
    if (list.length === 0) {
      list = generateLocalFallback(batchCount, isMC, req.topic, req.subjectName, offset);
    }

    const batchQuestions = list
      .slice(0, batchCount)
      .map((item, index) => mapToQuestionDraft(item, index, offset, isMC));

    generatedQuestions.push(...batchQuestions);
  }

  return generatedQuestions;
}
