/**
 * Module xử lý và phân tích cú pháp JSON AI an toàn tuyệt đối (Safe AI JSON & LaTeX Parser).
 * Xử lý triệt để:
 * 1. Escape LaTeX trong chuỗi JSON (\frac, \vec, \sqrt, \text, \times...).
 * 2. Cắt bỏ thẻ suy nghĩ <think>...</think> và markdown code fences.
 * 3. Tự động phục hồi các object câu hỏi hợp lệ khi chuỗi JSON bị ngắt giữa chừng do token limit.
 * 4. Làm sạch tiền tố thừa (Câu 1:, A., Lời giải chi tiết:).
 */

const LATEX_BACKSLASH_TOKEN = '__LATEX_BACKSLASH__';

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
export function restoreLatexBackslashes(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  str = str.replaceAll(LATEX_BACKSLASH_TOKEN, '\\');
  return cleanPrefix(str);
}

/**
 * Tự động sửa lỗi escape cho LaTeX trong chuỗi JSON trước khi gọi JSON.parse().
 * Xử lý triệt để:
 * 1. Giữ nguyên các ký tự thoát hợp lệ của JSON: \" \\ \/ \b \f \n \r \t \uXXXX
 * 2. Đổi mọi dấu \ đơn lẻ đứng trước lệnh LaTeX (chữ cái hoặc ký hiệu toán) thành \\
 */
export function sanitizeLatexInJson(jsonStr: string): string {
  if (!jsonStr) return '';

  // 0. Khử các control characters < 0x20 (ngoại trừ \t, \n, \r hợp lệ)
  let res = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');

  // 1. Escape các dấu \ đứng trước lệnh LaTeX chữ cái phổ biến
  res = res.replace(
    /(?<!\\)\\(?=(?:[a-zA-Z]{2,}|[a-zA-Z]\b|alpha|beta|gamma|delta|pi|theta|frac|vec|sqrt|text|times|cdot|begin|end|right|left|to|le|ge|ne|in|sum|int|lim|sin|cos|tan|cot|ln|log|det|pm|mp|cup|cap|subset|subset|infty|partial|overline|underline|widehat|angle|circ|parallel|perp))/g,
    '\\\\'
  );

  // 2. Escape các dấu \ đứng trước ký tự toán học hoặc dấu ngoặc
  res = res.replace(/(?<!\\)\\([{}()|,$;:!+\-^&%#_\[\]])/g, '\\\\$1');

  // 3. Nếu còn bất kỳ dấu \ đơn lẻ nào không phải escape JSON hợp lệ (" \ / b f n r t u), escape nó
  res = res.replace(/(?<!\\)\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  return res;
}

/**
 * Cứu vãn các object câu hỏi hợp lệ khi chuỗi JSON bị ngắt giữa chừng do token limit
 */
/**
 * Cứu vãn các object câu hỏi hợp lệ khi chuỗi JSON bị ngắt giữa chừng do token limit
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
      // Tiếp tục fallback bên dưới nếu vẫn lỗi
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
 * Hàm phân tích JSON AI xử lý an toàn 4 bước (Safe Parse AI Questions JSON):
 * 1. Gỡ bỏ thẻ <think>...</think> và markdown code fence.
 * 2. Trích xuất khối [...] hoặc {"questions": [...]}.
 * 3. Tự động sửa escape cho LaTeX trong chuỗi JSON.
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

  // 3. Thử parse trực tiếp (Fast Path)
  try {
    const directParsed = JSON.parse(clean);
    const list = extractQuestionList(directParsed);
    if (list.length > 0) return list;
  } catch {
    // Tiếp tục tiền xử lý LaTeX escape
  }

  // 4. Tiền xử lý LaTeX escape trong chuỗi JSON
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

  throw new Error('Không thể phân tích cấu trúc JSON từ máy chủ AI. Vui lòng bấm "Thử sinh lại".');
}
