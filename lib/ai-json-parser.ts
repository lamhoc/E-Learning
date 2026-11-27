/**
 * Module xử lý và phân tích cú pháp JSON AI an toàn (Safe AI JSON & LaTeX Parser).
 * Dùng làm Lớp 2 (dự phòng JSON) cho bộ sinh câu hỏi AI và cho module bóc tách tài liệu.
 *
 * Cải tiến quan trọng (Phase 79):
 * - Gọi `protectLatexBackslashesInJson()` TRƯỚC cả Fast-Path `JSON.parse()` để `\frac`, `\neq`,
 *   `\boldsymbol`, `\root`, `\text`, `\beta`, `\right` KHÔNG BAO GIỜ bị `JSON.parse()` nuốt
 *   thành ký tự điều khiển (`\u0008`, `\u000C`, `\u000D`, `\u0009`, xuống dòng `\n`).
 * - Sửa `cleanPrefix` an toàn: chỉ cắt tiền tố `A.` / `A)` / `A:` (không cắt nhầm `"a - b"` hay `"A là..."`).
 */
import { protectLatexBackslashesInJson, repairLatexAndText } from './latex-repair';

const LATEX_BACKSLASH_TOKEN = '__LATEX_BACKSLASH__';

export type CleanPrefixMode = 'auto' | 'question' | 'option' | 'explanation' | 'answer' | 'rubric' | 'none';

/**
 * Cắt bỏ các tiền tố bị lặp thừa để giao diện hiển thị sạch sẽ, chuyên nghiệp (Clean Formatting).
 * Đồng thời giải mã HTML entities, chuẩn hóa \(...\) -> $...$, phục hồi LaTeX và chuẩn hóa Unicode NFC.
 */
export function cleanPrefix(
  text: string | null | undefined,
  mode: CleanPrefixMode = 'auto'
): string {
  if (!text) return '';
  let str = String(text).trim();

  // 1. Loại bỏ null byte và ký tự replacement
  str = str.replace(/[\u0000\ufffd]/g, '');

  // 2. Giải mã HTML entities
  str = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Phục hồi ký tự điều khiển LaTeX, literal \n, lệnh thiếu \, hệ phương trình
  str = repairLatexAndText(str);

  // 4. Chuẩn hóa cú pháp LaTeX: \(...\) -> $...$ và \[...\] -> $$...$$
  str = str.replace(/(?:\\{1,2}\[)([\s\S]*?)(?:\\{1,2}\])/g, (_, p1) => `$$${String(p1).trim()}$$`);
  str = str.replace(/(?:\\{1,2}\()([\s\S]*?)(?:\\{1,2}\))/g, (_, p1) => `$${String(p1).trim()}$`);

  // 5. Chuẩn hóa tiếng Việt Unicode NFC
  str = str.normalize('NFC');

  if (mode === 'none') {
    return str.trim();
  }

  // 6. Cắt bỏ tiền tố theo ngữ cảnh trường (tránh cắt nhầm công thức/biến như "a - b" hay "A là...")
  if (mode === 'auto' || mode === 'question') {
    str = str.replace(/^(?:câu(?:\s*hỏi)?|bài|question|q)\s*\d+\s*[:.)\-–—]+\s*/i, '');
  }
  if (mode === 'auto' || mode === 'option') {
    // Yêu cầu dấu phân tách rõ ràng (., ), :) sau chữ cái A-D; tuyệt đối không khớp "A là..." hay "a - b"
    str = str.replace(/^(?:(?:phương án|đáp án)\s*[a-d]\s*[:.)\-–—]+\s*|[a-d]\s*[:.)]\s+)/i, '');
  }
  if (mode === 'auto' || mode === 'explanation') {
    str = str.replace(
      /^(?:lời giải(?:\s*chi tiết)?|hướng dẫn giải|giải thích(?:\s*chi tiết)?)\s*[:.\-–—]+\s*/i,
      ''
    );
  }
  if (mode === 'auto' || mode === 'answer' || mode === 'rubric') {
    str = str.replace(
      /^(?:đáp án(?:\s*mẫu|\s*chi tiết)?|gợi ý(?:\s*đáp án|\s*trả lời)?|thang điểm(?:\s*chấm)?|rubric(?:\s*chấm)?)\s*[:.\-–—]+\s*/i,
      ''
    );
  }

  return str.trim();
}

/**
 * Khôi phục dấu gạch chéo ngược LaTeX từ token an toàn hoặc từ các chuỗi escaped.
 */
export function restoreLatexBackslashes(
  value: unknown,
  mode: CleanPrefixMode = 'auto'
): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  str = str.replaceAll(LATEX_BACKSLASH_TOKEN, '\\');
  return cleanPrefix(str, mode);
}

/**
 * Tự động sửa lỗi escape cho LaTeX trong chuỗi JSON trước khi gọi JSON.parse().
 * Xử lý triệt để:
 * 1. Bảo vệ các lệnh LaTeX trùng ký tự thoát JSON (\frac, \neq, \text, \beta, \right, \boldsymbol, \root...)
 * 2. Đổi mọi dấu \ đơn lẻ đứng trước lệnh LaTeX hoặc ký hiệu toán thành \\
 */
export function sanitizeLatexInJson(jsonStr: string): string {
  if (!jsonStr) return '';

  // 0. Khử các control characters < 0x20 (ngoại trừ \t, \n, \r hợp lệ)
  let res = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');

  // 1. Bảo vệ các lệnh LaTeX bắt đầu bằng b, f, n, r, t, v trước khi JSON.parse nuốt mất dấu \
  res = protectLatexBackslashesInJson(res);

  // 2. Escape các dấu \ đơn lẻ đứng trước lệnh LaTeX chữ cái khác (không bắt đầu bằng escape JSON)
  res = res.replace(
    /(?<!\\)((?:\\\\)*)\\(?!["\\/bfnrtu])([a-zA-Z]+)/g,
    '$1\\\\$2'
  );

  // 3. Escape các dấu \ đứng trước ký tự toán học hoặc dấu ngoặc
  res = res.replace(/(?<!\\)((?:\\\\)*)\\([{}()|,$;:!+\-^&%#_\[\]])/g, '$1\\\\$2');

  // 4. Nếu còn bất kỳ dấu \ đơn lẻ nào không phải escape JSON hợp lệ (" \ / b f n r t uXXXX), escape nó
  res = res.replace(/(?<!\\)((?:\\\\)*)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '$1\\\\');

  return res;
}

/**
 * Cứu vãn các object câu hỏi hợp lệ khi chuỗi JSON bị ngắt giữa chừng do token limit.
 * Sử dụng State-Machine Bracket Matcher để không bao giờ nhầm dấu } của LaTeX bên trong string.
 */
export function recoverTruncatedQuestionsJson(raw: string): Record<string, unknown>[] {
  const recovered: Record<string, unknown>[] = [];
  if (!raw) return recovered;

  const arrayStart = raw.indexOf('[');
  if (arrayStart === -1) return recovered;

  const fromArray = raw.slice(arrayStart);

  // State-Machine tìm vị trí đóng } của object JSON hợp lệ cuối cùng (bỏ qua mọi } bên trong chuỗi LaTeX)
  let inString = false;
  let escape = false;
  let lastValidObjectEnd = -1;

  for (let i = 0; i < fromArray.length; i++) {
    const char = fromArray[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && char === '}') {
      lastValidObjectEnd = i;
    }
  }

  if (lastValidObjectEnd !== -1) {
    const truncatedToLastObject = fromArray.slice(0, lastValidObjectEnd + 1);
    const repaired = `${truncatedToLastObject}]`;
    try {
      const sanitized = sanitizeLatexInJson(repaired);
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Record<string, unknown>[];
      }
    } catch {
      // Bỏ qua nếu vẫn lỗi
    }
  }

  return recovered;
}

/**
 * Trích xuất danh sách câu hỏi từ cấu trúc JSON đã parse
 */
export function extractQuestionList(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    const values = Object.values(obj);
    const arrayProp = values.find(Array.isArray);
    if (arrayProp) return arrayProp as Record<string, unknown>[];
  }
  return [];
}

/**
 * Hàm phân tích JSON AI xử lý an toàn (Safe Parse AI Questions JSON):
 * 1. Gỡ bỏ thẻ <think>...</think> và markdown code fence.
 * 2. Trích xuất khối [...] hoặc {"questions": [...]}.
 * 3. Bảo vệ dấu \ của LaTeX TRƯỚC khi JSON.parse() (chặn nuốt \frac, \neq, \boldsymbol, \root, \text...).
 * 4. Tự cứu các object câu hỏi hoàn chỉnh nếu chuỗi JSON bị ngắt giữa chừng.
 */
export function safeParseAIQuestionsJson(rawText: string): Record<string, unknown>[] {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Dữ liệu AI trả về rỗng.');
  }

  // 1. Gỡ bỏ thẻ <think>...</think>
  let clean = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Cắt bỏ markdown code fence ```json ... ``` hoặc ``` ... ```
  clean = clean
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

  // 3. Bảo vệ LaTeX backslash trước khi thử parse nhanh (CHẶN JSON.parse nuốt \f, \b, \n, \r, \t)
  const latexProtected = protectLatexBackslashesInJson(clean);
  try {
    const directParsed = JSON.parse(latexProtected);
    const list = extractQuestionList(directParsed);
    if (list.length > 0) return list;
  } catch {
    // Tiếp tục tiền xử lý toàn diện LaTeX escape
  }

  // 4. Tiền xử lý toàn diện LaTeX escape trong chuỗi JSON
  try {
    const sanitized = sanitizeLatexInJson(clean);
    const sanitizedParsed = JSON.parse(sanitized);
    const list = extractQuestionList(sanitizedParsed);
    if (list.length > 0) return list;
  } catch {
    // Tiếp tục cứu vớt JSON truncated
  }

  // 5. Cứu vớt chuỗi JSON bị ngắt giữa chừng
  const recoveredList = recoverTruncatedQuestionsJson(clean);
  if (recoveredList.length > 0) {
    return recoveredList;
  }

  throw new Error('Không thể phân tích cấu trúc dữ liệu từ máy chủ AI. Vui lòng bấm "Thử sinh lại".');
}
