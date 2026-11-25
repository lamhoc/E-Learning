/**
 * Module AI Continuation:
 * Phát hiện nội dung câu trả lời của AI bị ngắt dở/cắt cụt giữa chừng
 * và xử lý ghép nối chuỗi thông minh (loại bỏ trùng lặp điểm nối).
 */

/**
 * Kiểm tra xem dấu $ trong chuỗi có bị mở mà chưa đóng không (số lượng lẻ)
 */
export function hasUnclosedMathDollar(text: string): boolean {
  if (!text) return false;
  // Khử các escaped \$
  const unescaped = text.replace(/\\\$/g, '');
  const matches = unescaped.match(/\$/g);
  return matches ? matches.length % 2 !== 0 : false;
}

/**
 * Tự động đóng các dấu $ hoặc ngoặc chưa đóng để KaTeX render không bị crash khi streaming
 */
export function balanceStreamingDelimiters(text: string): string {
  if (!text) return '';
  let balanced = text;

  // Nếu $ bị lẻ, thêm dấu $ ở cuối để KaTeX hoàn tất parse
  if (hasUnclosedMathDollar(balanced)) {
    balanced += '$';
  }

  // Đếm ngoặc đơn, ngoặc vuông, ngoặc nhọn
  const openParens = (balanced.match(/\(/g) || []).length;
  const closeParens = (balanced.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    balanced += ')'.repeat(openParens - closeParens);
  }

  const openBrackets = (balanced.match(/\[/g) || []).length;
  const closeBrackets = (balanced.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    balanced += ']'.repeat(openBrackets - closeBrackets);
  }

  return balanced;
}

/**
 * Trích xuất số lượng câu hỏi mà người dùng yêu cầu (ví dụ: "Tạo 10 câu hỏi..." -> 10)
 */
export function extractRequestedQuestionCount(prompt?: string | null): number | null {
  if (!prompt) return null;
  const match = prompt.match(/(?:tạo|sinh|soạn|viết|làm|cho|xuất|đưa ra)\s*(\d+)\s*(?:câu|bài|đề|yêu cầu)/i);
  if (match) {
    const count = parseInt(match[1], 10);
    if (!isNaN(count) && count > 0 && count <= 50) {
      return count;
    }
  }
  return null;
}

/**
 * Đếm số lượng câu hỏi thực tế đã được AI sinh ra trong văn bản (ví dụ "### Câu 1", "Câu 1:", "**Câu 1**")
 */
export function countGeneratedQuestions(text: string): number {
  if (!text) return 0;
  const regex = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:câu|bài|question)\s*(\d+)[:.]/gi;
  let maxNum = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return maxNum;
}

/**
 * Kiểm tra xem văn bản phản hồi của AI có bị ngắt dở/cắt cụt hay không
 */
export function isTextIncomplete(
  text: string,
  finishReason?: string | null,
  userPrompt?: string | null
): boolean {
  if (!text || text.trim().length === 0) return false;

  const trimmed = text.trim();

  // 1. Kiểm tra trực tiếp finishReason từ LLM provider
  if (finishReason) {
    const lowerReason = finishReason.toLowerCase();
    if (
      lowerReason === 'length' ||
      lowerReason === 'max_tokens' ||
      lowerReason === 'model_length'
    ) {
      return true;
    }
  }

  // 2. Kiểm tra nếu người dùng yêu cầu N câu hỏi mà AI mới sinh M < N câu
  const requestedCount = extractRequestedQuestionCount(userPrompt);
  if (requestedCount && requestedCount >= 2) {
    const actualCount = countGeneratedQuestions(trimmed);
    if (actualCount > 0 && actualCount < requestedCount) {
      // Đã bắt đầu sinh câu hỏi nhưng chưa đủ số câu yêu cầu
      return true;
    }
  }

  // 3. Kiểm tra dấu toán KaTeX mở mà chưa đóng
  if (hasUnclosedMathDollar(trimmed)) {
    return true;
  }

  // 4. Kiểm tra dấu ngoặc mở mà chưa đóng ở cuối văn bản
  const lastLine = trimmed.split('\n').pop()?.trim() || '';
  if (
    lastLine.endsWith('(') ||
    lastLine.endsWith('[') ||
    lastLine.endsWith('{') ||
    lastLine.endsWith('“') ||
    lastLine.endsWith('"') ||
    lastLine.endsWith('`') ||
    lastLine.endsWith(':') ||
    lastLine.endsWith('-') ||
    lastLine.endsWith('+') ||
    lastLine.endsWith('/') ||
    lastLine.endsWith(' và') ||
    lastLine.endsWith(' hoặc') ||
    lastLine.endsWith(' như') ||
    lastLine.endsWith(' là')
  ) {
    return true;
  }

  // 5. Kiểm tra ký tự kết thúc: Nếu kết thúc bằng một từ dở dang không có dấu ngắt câu
  // Các ký tự kết thúc trọn vẹn: '.', '!', '?', '…', '...', '"', '”', ')', ']', '}', '`', '$', '\n'
  const validPunctuation = /[.!?…"'”\)\]\}`$]$/;
  if (!validPunctuation.test(trimmed)) {
    // Nếu dòng cuối cùng dài hơn 15 ký tự và không kết thúc bằng dấu ngắt câu hợp lệ
    if (lastLine.length > 15) {
      return true;
    }
  }

  return false;
}

/**
 * Loại bỏ phần trùng lặp giữa đuôi chuỗi cũ và đầu chuỗi mới sinh tiếp (Smart Overlap Trimming)
 */
export function stripOverlap(existingText: string, continuationText: string): string {
  if (!existingText || !continuationText) return continuationText || '';

  const cleanExisting = existingText.trimEnd();
  const cleanContinuation = continuationText.trimStart();

  // Tìm overlap từ 120 ký tự giảm dần xuống 6 ký tự
  const maxSearchLen = Math.min(120, cleanExisting.length, cleanContinuation.length);

  for (let len = maxSearchLen; len >= 6; len--) {
    const tail = cleanExisting.slice(-len);
    const head = cleanContinuation.slice(0, len);

    if (tail === head) {
      return cleanContinuation.slice(len).trimStart();
    }

    // So sánh không phân biệt khoảng trắng dư thừa
    const normalizedTail = tail.replace(/\s+/g, ' ');
    const normalizedHead = head.replace(/\s+/g, ' ');
    if (normalizedTail === normalizedHead) {
      return cleanContinuation.slice(len).trimStart();
    }
  }

  return cleanContinuation;
}

/**
 * Ghép chuỗi tiếp tục vào chuỗi hiện có một cách tự nhiên
 */
export function mergeContinuation(existingText: string, continuationText: string): string {
  if (!existingText) return continuationText || '';
  if (!continuationText) return existingText;

  const stripped = stripOverlap(existingText, continuationText);
  if (!stripped) return existingText;

  // Nếu existingText kết thúc bằng dòng mới hoặc stripped bắt đầu bằng dòng mới
  if (existingText.endsWith('\n') || stripped.startsWith('\n')) {
    return existingText + stripped;
  }

  // Nếu existingText đã có khoảng trắng hoặc dấu gạch nối ở đuôi
  if (/\s$/.test(existingText) || stripped.startsWith(' ') || existingText.endsWith('-')) {
    return existingText + stripped;
  }

  return existingText + ' ' + stripped;
}

/**
 * Tạo câu lệnh prompt tiếp nối chuẩn để gửi lên LLM
 */
export function buildContinuationPrompt(
  originalUserPrompt: string,
  existingResponse: string
): string {
  const tail = existingResponse.slice(-150).trim();
  const requestedCount = extractRequestedQuestionCount(originalUserPrompt);
  const actualCount = countGeneratedQuestions(existingResponse);

  let extraNote = '';
  if (requestedCount && requestedCount > actualCount) {
    extraNote = ` Bạn mới hoàn thành đến câu ${actualCount}/${requestedCount}. Hãy viết tiếp trọn vẹn từ câu ${actualCount + 1} đến đủ câu ${requestedCount}.`;
  }

  return `[HỆ THỐNG YÊU CẦU VIẾT TIẾP DO CHẠM TRẦN ĐỘ DÀI]
Câu trả lời trước của bạn vừa bị ngắt dở tại đoạn:
"...${tail}"

YÊU CẦU:
1. Hãy viết tiếp CHÍNH XÁC từ chỗ đang bị ngắt để hoàn thành trọn vẹn 100% yêu cầu ban đầu.
2. TUYỆT ĐỐI KHÔNG lặp lại các câu/đoạn đã viết phía trước.
3. Giữ nguyên định dạng (không dùng bảng Markdown, tách dòng thoáng mắt, công thức KaTeX chuẩn $...$).${extraNote}`;
}
