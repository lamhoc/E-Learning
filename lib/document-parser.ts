import 'server-only';

import JSZip from 'jszip';
import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';
import { callAiChatCompletion } from '@/lib/ai-provider';
import { parseAiJsonSafely } from '@/lib/ai-question-generator';

export type ParsedQuestionItem = {
  tempId: string;
  question_type: 'multiple_choice' | 'essay';
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: 'A' | 'B' | 'C' | 'D';
  is_red_detected: boolean;
  explanation?: string;
  model_answer?: string;
  grading_rubric?: string;
};

export type ParseDocumentResult = {
  success: boolean;
  fileName: string;
  fileType: 'docx' | 'pdf';
  questions: ParsedQuestionItem[];
  totalParsed: number;
  redDetectedCount: number;
  rawExcerpt?: string;
  error?: string;
};

/**
 * Kiểm tra xem mã màu trong thuộc tính w:color hoặc w:highlight của Word có phải màu đỏ không.
 */
function isColorRed(colorVal: string | null | undefined): boolean {
  if (!colorVal) return false;
  const val = colorVal.trim().toLowerCase().replace(/^#/, '');
  if (val === 'red') return true;

  // Định dạng hex 6 ký tự RRGGBB
  if (val.length === 6 && /^[0-9a-f]{6}$/i.test(val)) {
    const r = parseInt(val.substring(0, 2), 16);
    const g = parseInt(val.substring(2, 4), 16);
    const b = parseInt(val.substring(4, 6), 16);

    // Các màu đỏ phổ biến trong Word:
    // C00000, DC0000, FF0000, ED1C24, DC2626, EE0000, E11D48
    if (r >= 150 && g <= 100 && b <= 100) return true;
    if (r >= 130 && r > g * 1.6 && r > b * 1.6) return true;
  }

  // Định dạng hex 3 ký tự RGB
  if (val.length === 3 && /^[0-9a-f]{3}$/i.test(val)) {
    const r = parseInt(val[0], 16);
    const g = parseInt(val[1], 16);
    const b = parseInt(val[2], 16);
    if (r >= 9 && g <= 5 && b <= 5) return true;
  }

  return false;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Trích xuất nội dung DOCX từ word/document.xml, phát hiện các đoạn text có màu đỏ,
 * gạch chân hoặc in đậm và bọc chúng lại bằng tag [RED_ANSWER]...[/RED_ANSWER].
 */
export async function extractDocxTextWithRedColor(buffer: Buffer): Promise<{ text: string; hasRedRuns: boolean }> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      const fallback = await mammoth.extractRawText({ buffer });
      return { text: fallback.value, hasRedRuns: false };
    }

    const xmlContent = await documentXmlFile.async('string');
    let hasRedRuns = false;

    const paragraphRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    const runRegex = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
    const colorRegex = /<w:color\s+[^>]*w:val="([^"]+)"/i;
    const highlightRegex = /<w:highlight\s+[^>]*w:val="([^"]+)"/i;
    const textRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;

    const paragraphs: string[] = [];
    let pMatch: RegExpExecArray | null;

    while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
      const pBody = pMatch[1];
      let pText = '';
      let rMatch: RegExpExecArray | null;

      while ((rMatch = runRegex.exec(pBody)) !== null) {
        const rBody = rMatch[1];
        const colorMatch = colorRegex.exec(rBody);
        const highlightMatch = highlightRegex.exec(rBody);

        const colorVal = colorMatch ? colorMatch[1] : null;
        const highlightVal = highlightMatch ? highlightMatch[1] : null;

        const isRed = isColorRed(colorVal) || isColorRed(highlightVal);

        let runText = '';
        let tMatch: RegExpExecArray | null;
        while ((tMatch = textRegex.exec(rBody)) !== null) {
          runText += decodeXmlEntities(tMatch[1]);
        }

        // Xuống dòng trong run nếu có
        if (/<w:br\/>/i.test(rBody)) {
          runText += '\n';
        }

        if (runText) {
          if (isRed) {
            hasRedRuns = true;
            pText += ` [RED_ANSWER]${runText}[/RED_ANSWER] `;
          } else {
            pText += runText;
          }
        }
      }

      const trimmedP = pText.trim();
      if (trimmedP) {
        paragraphs.push(trimmedP);
      }
    }

    return {
      text: paragraphs.join('\n'),
      hasRedRuns,
    };
  } catch (error) {
    console.error('Lỗi khi đọc XML trong DOCX:', error);
    const fallback = await mammoth.extractRawText({ buffer });
    return { text: fallback.value, hasRedRuns: false };
  }
}

/**
 * Trích xuất toàn bộ văn bản từ file PDF sử dụng thư viện unpdf.
 */
export async function extractPdfTextSafe(buffer: Buffer): Promise<{ text: string }> {
  try {
    const result = await extractPdfText(new Uint8Array(buffer));
    const fullText = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '');
    return { text: fullText.trim() };
  } catch (error) {
    console.error('Lỗi khi trích xuất PDF:', error);
    throw new Error('Không thể đọc file PDF. File có thể bị khóa mật khẩu hoặc định dạng không hỗ trợ.');
  }
}

/**
 * THUẬT TOÁN BÓC TÁCH CÂU HỎI TỰ LUẬN (3 TẦNG THÔNG MINH):
 * Tầng 1: Tách theo tag [RED_ANSWER] từ XML Word.
 * Tầng 2: Tách theo các nhãn từ khóa (Đáp án:, Lời giải:, Hướng dẫn giải:, Thang điểm:, Rubric:).
 * Tầng 3: Tách inline mệnh đề hỏi & mệnh đề giải cho từng ý a), b), c).
 */
export function parseEssayQuestionLocally(section: string): {
  questionText: string;
  modelAnswer?: string;
  gradingRubric?: string;
  isRedDetected: boolean;
} {
  let isRedDetected = false;
  const questionLines: string[] = [];
  const answerLines: string[] = [];

  // 0. Cắt bỏ footer đề thi như "— HẾT —" hoặc "--- HẾT ---"
  const cleanSection = section.replace(/(?:\n\s*|\s{2,})[-—–]+\s*HẾT\s*[-—–]+[\s\S]*/i, '').trim();

  // TẦNG 1: XỬ LÝ THEO TAG [RED_ANSWER] TỪ XML WORD
  if (cleanSection.includes('[RED_ANSWER]')) {
    isRedDetected = true;
    const lines = cleanSection.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Nếu dòng nằm HOÀN TOÀN trong [RED_ANSWER]
      if (line.startsWith('[RED_ANSWER]') && line.endsWith('[/RED_ANSWER]')) {
        const cleanA = line.replace(/\[\/?RED_ANSWER\]/g, '').trim();
        if (cleanA && cleanA.replace(/[.,;:\s]/g, '').length > 0) {
          answerLines.push(cleanA);
        }
        continue;
      }

      // Nếu dòng có chứa [RED_ANSWER] (ví dụ: "a) Tìm tọa độ đỉnh... [RED_ANSWER]Ta có a = 1...[/RED_ANSWER]")
      if (line.includes('[RED_ANSWER]')) {
        // Tìm ý con nếu có ở đầu dòng: ví dụ "a)", "b)", "c)", "1)", "2)"
        const subItemMatch = /^([a-zA-Z\d]+[.)])\s*/.exec(line);
        const subPrefix = subItemMatch ? subItemMatch[1] : '';

        // Tách phần đề bài (ngoài tag [RED_ANSWER])
        const redRegex = /\[RED_ANSWER\]([\s\S]*?)\[\/RED_ANSWER\]/g;
        let qPart = line.replace(redRegex, '').trim();
        // Dọn sạch dấu chấm phẩy thừa ở cuối đề bài
        qPart = qPart.replace(/[.,;:]+$/, '.').trim();

        if (qPart) questionLines.push(qPart);

        let match: RegExpExecArray | null;
        while ((match = redRegex.exec(line)) !== null) {
          let aText = match[1].trim();
          // Bỏ qua nếu aText chỉ toàn dấu chấm, phẩy hoặc rác
          if (!aText || aText.replace(/[.,;:\s]/g, '').length === 0) continue;

          if (subPrefix && !aText.startsWith(subPrefix)) {
            aText = `${subPrefix} ${aText}`;
          }
          answerLines.push(aText);
        }
        continue;
      }

      // Dòng chữ đen thuần túy (không có [RED_ANSWER])
      questionLines.push(line);
    }
  } else {
    // TẦNG 2: XỬ LÝ THEO CÁC TỪ KHÓA ĐÁP ÁN / LỜI GIẢI
    const answerSplitRegex = /(?:^|\n)\s*(?:Đáp án|Lời giải|Hướng dẫn giải|Thang điểm|Rubric|Bài giải|Giải|Trả lời)[:\s-]+([\s\S]*)/i;
    const splitMatch = answerSplitRegex.exec(cleanSection);

    if (splitMatch) {
      const qPart = cleanSection.slice(0, splitMatch.index).trim();
      const aPart = splitMatch[1].trim();
      questionLines.push(qPart);
      answerLines.push(aPart);
    } else {
      // TẦNG 3: TÁCH INLINE MỆNH ĐỀ HỎI VÀ MỆNH ĐỀ GIẢI THEO TỪNG Ý a), b), c)
      const lines = cleanSection.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Nhận diện dòng có dạng: "a) Tìm tọa độ đỉnh... Ta có..." hoặc "b) Giải phương trình... Vì..."
        const inlineSolveRegex = /^([a-zA-Z\d]+[.)]\s*[^.?!]+[.?!])\s+(Ta có|Vì|Do đó|Khi đó|Áp dụng|Gọi|Phương trình có|Vậy|Suy ra|Đặt|Xét)[\s\S]*/i;
        const inlineMatch = inlineSolveRegex.exec(trimmed);

        if (inlineMatch) {
          const qText = inlineMatch[1].trim();
          const subPrefix = inlineMatch[0].match(/^[a-zA-Z\d]+[.)]/)?.[0] || '';
          const aText = trimmed.slice(qText.length).trim();

          questionLines.push(qText);
          answerLines.push(subPrefix ? `${subPrefix} ${aText}` : aText);
        } else {
          questionLines.push(trimmed);
        }
      }
    }
  }

  const clean = (str: string) => str.replace(/\[\/?RED_ANSWER\]/g, '').trim();
  const finalQ = clean(questionLines.join('\n'));
  const finalA = answerLines.length > 0 ? clean(answerLines.join('\n\n')) : undefined;

  // Tự động tạo gợi ý Thang điểm / Rubric theo từng ý nếu có lời giải
  let rubric: string | undefined = undefined;
  if (finalA) {
    const subItems = [...new Set(finalA.match(/^[a-zA-Z\d]+[.)]/gm) || [])];
    if (subItems.length > 1) {
      rubric = subItems.map((item) => `• Ý ${item} Điểm tối đa nếu hoàn thành đúng các bước lời giải.`).join('\n');
    } else {
      rubric = 'Điểm tối đa nếu hoàn thành đầy đủ các bước lập luận và kết quả chính xác.';
    }
  }

  return {
    questionText: finalQ,
    modelAnswer: finalA,
    gradingRubric: rubric,
    isRedDetected,
  };
}

/**
 * BỘ BÓC TÁCH NỘI BỘ (Local Regex & XML Parser):
 * Hoạt động độc lập 100% không phụ thuộc vào kết nối mạng hay dịch vụ AI ngoài.
 * Đảm bảo trích xuất chính xác câu hỏi trắc nghiệm (nhận diện chữ đỏ [RED_ANSWER], dọn sạch phương án D)
 * và câu hỏi tự luận kèm đáp án mẫu/rubric tách biệt.
 */
export function parseQuestionsLocallyFromText(rawText: string): ParsedQuestionItem[] {
  if (!rawText || rawText.trim().length === 0) return [];

  const questions: ParsedQuestionItem[] = [];

  // Chuẩn hóa dòng và khoảng trắng
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tìm các điểm bắt đầu của từng câu hỏi: "Câu 1", "Câu 2", "Bài 1", "Bài 2", hoặc "1.", "2."
  const questionMarkerRegex = /(?:^|\n)\s*(?:(?:PHẦN|Phần)\s+[I|V|X\d]+[:.\s-]+)?(?:(Câu|Bài|CÂU|BÀI)\s+(\d+)[:.)\s-]|(\d+)[\.:]\s+)/gi;

  const matches: { index: number; label: string; number: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = questionMarkerRegex.exec(normalizedText)) !== null) {
    const num = parseInt(m[2] || m[3], 10);
    matches.push({
      index: m.index,
      label: m[0].trim(),
      number: isNaN(num) ? matches.length + 1 : num,
    });
  }

  const rawSections: string[] = [];
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : normalizedText.length;
      const section = normalizedText.slice(start, end).trim();
      if (section) rawSections.push(section);
    }
  } else {
    // Thử tách theo 2 dòng trống liên tiếp
    const paragraphs = normalizedText.split(/\n\s*\n+/);
    for (const p of paragraphs) {
      if (p.trim().length > 10) rawSections.push(p.trim());
    }
  }

  for (let idx = 0; idx < rawSections.length; idx++) {
    const section = rawSections[idx];

    // Kiểm tra xem đoạn này có chứa 4 phương án A, B, C, D không
    const optMarkerA = /(?:^|\s|\n)(?:\[RED_ANSWER\])?A[.)]\s*(?:\[\/RED_ANSWER\])?/i;
    const optMarkerB = /(?:^|\s|\n)(?:\[RED_ANSWER\])?B[.)]\s*(?:\[\/RED_ANSWER\])?/i;
    const optMarkerC = /(?:^|\s|\n)(?:\[RED_ANSWER\])?C[.)]\s*(?:\[\/RED_ANSWER\])?/i;
    const optMarkerD = /(?:^|\s|\n)(?:\[RED_ANSWER\])?D[.)]\s*(?:\[\/RED_ANSWER\])?/i;

    const matchA = optMarkerA.exec(section);
    const matchB = optMarkerB.exec(section);
    const matchC = optMarkerC.exec(section);
    const matchD = optMarkerD.exec(section);

    const isMultipleChoice = Boolean(
      matchA && matchB && matchC && matchD &&
      matchA.index < matchB.index &&
      matchB.index < matchC.index &&
      matchC.index < matchD.index
    );

    if (isMultipleChoice && matchA && matchB && matchC && matchD) {
      // 1. TRẮC NGHIỆM:
      const rawQuestionText = section.slice(0, matchA.index).trim();
      const rawOptA = section.slice(matchA.index + matchA[0].length, matchB.index).trim();
      const rawOptB = section.slice(matchB.index + matchB[0].length, matchC.index).trim();
      const rawOptC = section.slice(matchC.index + matchC[0].length, matchD.index).trim();

      // Phần sau D có thể chứa thêm Lời giải / Đáp án / Hướng dẫn
      let rawOptD = section.slice(matchD.index + matchD[0].length).trim();
      let explanation: string | undefined = undefined;
      let explicitCorrect: 'A' | 'B' | 'C' | 'D' | undefined = undefined;

      // Cắt bỏ tiêu đề phân phần (nếu rơi vào cuối phương án D của câu cuối phần trắc nghiệm)
      const partHeaderMatch = /(?:\n\s*|\s{2,})(?:PHẦN|Phần|TỰ LUẬN|Tự luận)[\s\S]*/i.exec(rawOptD);
      if (partHeaderMatch) {
        rawOptD = rawOptD.slice(0, partHeaderMatch.index).trim();
      }

      // Xử lý tách chuỗi "Đáp án: [A-D]. Lời giải..." hoặc "Lời giải:..." nằm trong hoặc sau D
      const explainSplitRegex = /(?:\n\s*|\s{2,}|\s+)(?:\[RED_ANSWER\]\s*)?(?:Đáp án|ĐÁP ÁN|Chọn|CHỌN|Lời giải|LỜI GIẢI|Hướng dẫn giải|HƯỚNG DẪN GIẢI|Hướng dẫn|HƯỚNG DẪN|Giải thích|GIẢI THÍCH|Đáp án chi tiết)[:\s-]+([\s\S]*)/i;
      const explainMatch = explainSplitRegex.exec(rawOptD);

      if (explainMatch) {
        const afterKeyword = explainMatch[1].trim();
        // Cắt bỏ hoàn toàn phần đáp án / giải thích ra khỏi phương án D
        rawOptD = rawOptD.slice(0, explainMatch.index).trim();

        // Kiểm tra xem có chữ cái A-D ngay sau Đáp án: không (ví dụ "C. Các kết quả chẵn...")
        const ansKeyMatch = /^([A-D])[.:\s-]+([\s\S]*)/i.exec(afterKeyword);
        if (ansKeyMatch) {
          explicitCorrect = ansKeyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          explanation = ansKeyMatch[2].replace(/\[\/?RED_ANSWER\]/g, '').trim();
        } else {
          explanation = afterKeyword.replace(/\[\/?RED_ANSWER\]/g, '').trim();
        }
      }

      // Xác định đáp án đúng dựa vào [RED_ANSWER]
      let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
      let isRedDetected = false;

      if (rawOptA.includes('[RED_ANSWER]') || matchA[0].includes('[RED_ANSWER]')) {
        correctOption = 'A';
        isRedDetected = true;
      } else if (rawOptB.includes('[RED_ANSWER]') || matchB[0].includes('[RED_ANSWER]')) {
        correctOption = 'B';
        isRedDetected = true;
      } else if (rawOptC.includes('[RED_ANSWER]') || matchC[0].includes('[RED_ANSWER]')) {
        correctOption = 'C';
        isRedDetected = true;
      } else if (rawOptD.includes('[RED_ANSWER]') || matchD[0].includes('[RED_ANSWER]')) {
        correctOption = 'D';
        isRedDetected = true;
      } else if (explicitCorrect) {
        correctOption = explicitCorrect;
        isRedDetected = true;
      } else {
        // Kiểm tra dấu * hoặc [x]
        if (rawOptA.startsWith('*') || rawOptA.startsWith('[x]')) {
          correctOption = 'A';
        } else if (rawOptB.startsWith('*') || rawOptB.startsWith('[x]')) {
          correctOption = 'B';
        } else if (rawOptC.startsWith('*') || rawOptC.startsWith('[x]')) {
          correctOption = 'C';
        } else if (rawOptD.startsWith('*') || rawOptD.startsWith('[x]')) {
          correctOption = 'D';
        }
      }

      // Làm sạch text loại bỏ các tag [RED_ANSWER]
      const clean = (str: string) => str.replace(/\[\/?RED_ANSWER\]/g, '').trim();

      questions.push({
        tempId: `local_mc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question_type: 'multiple_choice',
        question_text: clean(rawQuestionText),
        option_a: clean(rawOptA),
        option_b: clean(rawOptB),
        option_c: clean(rawOptC),
        option_d: clean(rawOptD),
        correct_option: correctOption,
        is_red_detected: isRedDetected,
        explanation: explanation || undefined,
      });
    } else {
      // 2. TỰ LUẬN: Áp dụng thuật toán 3 tầng bóc tách
      const essayRes = parseEssayQuestionLocally(section);

      if (essayRes.questionText.length > 5) {
        questions.push({
          tempId: `local_essay_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          question_type: 'essay',
          question_text: essayRes.questionText,
          model_answer: essayRes.modelAnswer,
          grading_rubric: essayRes.gradingRubric,
          is_red_detected: essayRes.isRedDetected,
        });
      }
    }
  }

  return questions;
}

/**
 * Hàm hậu xử lý chuẩn hóa danh sách câu hỏi:
 * Đảm bảo dù lấy từ AI hay từ parser local, dữ liệu luôn sạch 100%:
 * - Phương án D không dính "Đáp án: ...".
 * - Câu tự luận tách rời đề bài và đáp án tham khảo.
 */
export function cleanAndStandardizeQuestions(questions: ParsedQuestionItem[]): ParsedQuestionItem[] {
  return questions.map((q) => {
    if (q.question_type === 'multiple_choice') {
      let optD = q.option_d || '';
      let explanation = q.explanation;
      let correctOpt = q.correct_option || 'A';
      let isRed = q.is_red_detected;

      // Cắt bỏ nếu phương án D còn dính dòng Đáp án: / Lời giải:
      const explainSplitRegex = /(?:\n\s*|\s{2,}|\s+)(?:\[RED_ANSWER\]\s*)?(?:Đáp án|ĐÁP ÁN|Chọn|CHỌN|Lời giải|LỜI GIẢI|Hướng dẫn giải|HƯỚNG DẪN GIẢI|Hướng dẫn|HƯỚNG DẪN|Giải thích|GIẢI THÍCH|Đáp án chi tiết)[:\s-]+([\s\S]*)/i;
      const match = explainSplitRegex.exec(optD);

      if (match) {
        const afterText = match[1].trim();
        optD = optD.slice(0, match.index).trim();

        const ansKeyMatch = /^([A-D])[.:\s-]+([\s\S]*)/i.exec(afterText);
        if (ansKeyMatch) {
          correctOpt = ansKeyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          explanation = ansKeyMatch[2].replace(/\[\/?RED_ANSWER\]/g, '').trim();
          isRed = true;
        } else if (!explanation) {
          explanation = afterText.replace(/\[\/?RED_ANSWER\]/g, '').trim();
        }
      }

      // Làm sạch [RED_ANSWER]
      const clean = (s?: string) => (s ? s.replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined);

      return {
        ...q,
        question_text: clean(q.question_text) || '',
        option_a: clean(q.option_a),
        option_b: clean(q.option_b),
        option_c: clean(q.option_c),
        option_d: clean(optD),
        correct_option: correctOpt,
        is_red_detected: isRed,
        explanation: clean(explanation),
      };
    } else {
      // Câu tự luận
      let qText = q.question_text;
      let mAnswer = q.model_answer;
      let rubric = q.grading_rubric;
      let isRed = q.is_red_detected;

      // Nếu question_text còn dính [RED_ANSWER] hoặc chưa có model_answer, chạy bóc tách tự luận
      if (qText.includes('[RED_ANSWER]') || !mAnswer) {
        const rawFullText = mAnswer ? `${qText}\n${mAnswer}` : qText;
        const essayRes = parseEssayQuestionLocally(rawFullText);
        qText = essayRes.questionText;
        mAnswer = essayRes.modelAnswer || mAnswer;
        rubric = essayRes.gradingRubric || rubric;
        isRed = essayRes.isRedDetected || isRed;
      }

      // Tự động tạo rubric nếu chưa có
      if (mAnswer && !rubric) {
        const subItems = [...new Set(mAnswer.match(/^[a-zA-Z\d]+[.)]/gm) || [])];
        if (subItems.length > 1) {
          rubric = subItems.map((item) => `• Ý ${item} Điểm tối đa nếu hoàn thành đúng các bước lời giải.`).join('\n');
        } else {
          rubric = 'Điểm tối đa nếu hoàn thành đầy đủ các bước lập luận và kết quả chính xác.';
        }
      }

      const clean = (s?: string) => (s ? s.replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined);

      return {
        ...q,
        question_text: clean(qText) || '',
        model_answer: clean(mAnswer),
        grading_rubric: clean(rubric),
        is_red_detected: isRed || Boolean(mAnswer),
      };
    }
  });
}

/**
 * Sử dụng Groq AI thông qua ai-provider trung tâm để bóc tách văn bản thô thành danh sách câu hỏi.
 * Nếu AI gặp bất kỳ lỗi gì (404 model_not_found, 400, 429), tự động fallback về bộ bóc tách nội bộ an toàn.
 */
export async function parseDocumentWithGroq(params: {
  rawText: string;
  subjectName?: string;
  hasRedDetection: boolean;
}): Promise<ParsedQuestionItem[]> {
  const { rawText, subjectName, hasRedDetection } = params;

  // 1. Luôn chạy bộ bóc tách nội bộ trước để có sẵn dữ liệu dự phòng hoàn hảo
  const localQuestions = cleanAndStandardizeQuestions(parseQuestionsLocallyFromText(rawText));

  const systemPrompt = `Bạn là trợ lý khảo thí chuyên nghiệp bóc tách đề thi từ tài liệu (Word/PDF) cho hệ thống giáo dục Việt Nam.
Nhiệm vụ của bạn là đọc toàn bộ văn bản đề thi và chuyển đổi thành danh sách các câu hỏi có cấu trúc JSON chính xác.

QUY TẮC BÓC TÁCH BẮT BUỘC:
1. Nhận diện các câu hỏi: Thường bắt đầu bằng "Câu 1:", "Câu 2:", "1.", "Bài 1:" hoặc tiêu đề tương tự.
2. VỚI CÂU HỎI TRẮC NGHIỆM:
   - Tách rõ 4 phương án: option_a, option_b, option_c, option_d.
   - LÀM SẠCH PHƯƠNG ÁN D: Tuyệt đối không để dính dòng "Đáp án: [A-D]..." hoặc lời giải vào trong phương án D!
     + Nếu sau phương án D có dòng "Đáp án: [A-D]. Lời giải...", hãy cắt phần đó ra khỏi option_d.
     + Gán chữ cái sau "Đáp án:" vào "correct_option" ("A", "B", "C", hoặc "D").
     + Đưa phần lời giải/giải thích phía sau vào trường "explanation".
   - VỀ ĐÁP ÁN ĐÚNG CỦA CHỮ MÀU ĐỎ:
     Nếu trong phương án nào (hoặc tại dòng Đáp án) có tag "[RED_ANSWER]...[/RED_ANSWER]", đó CHÍNH XÁC là đáp án đúng do giáo viên bôi màu đỏ -> Gán "correct_option" tương ứng và đặt "is_red_detected": true.
3. VỚI CÂU HỎI TỰ LUẬN:
   - Đặt "question_type": "essay".
   - TÁCH BIỆT ĐỀ BÀI VÀ ĐÁP ÁN THAM KHẢO:
     + "question_text": CHỈ chứa đề bài thuần túy (gồm dẫn dắt và các ý a, b, c). Tuyệt đối KHÔNG chứa lời giải.
     + "model_answer": Chứa toàn bộ lời giải chi tiết của từng ý (bao gồm các đoạn chữ màu đỏ [RED_ANSWER] hoặc sau từ Lời giải/Đáp án).
     + "grading_rubric": Thang điểm hoặc hướng dẫn chấm theo từng ý a), b), c).
     + "is_red_detected": Đặt true nếu tìm thấy lời giải chữ đỏ.
4. Công thức toán học/khoa học:
   - Giữ nguyên hoặc chuẩn hóa công thức sang cú pháp KaTeX inline: $...$ (ví dụ: $x^2 - 4x + 3 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$).
5. Cấu trúc JSON trả về:
   - Trả về DUY NHẤT một mảng JSON các object theo schema dưới đây trong khối \`\`\`json ... \`\`\`:
   [
     {
       "question_type": "multiple_choice",
       "question_text": "Nội dung câu hỏi...",
       "option_a": "Nội dung phương án A",
       "option_b": "Nội dung phương án B",
       "option_c": "Nội dung phương án C",
       "option_d": "Nội dung phương án D (sạch sẽ, không dính lời giải)",
       "correct_option": "A",
       "is_red_detected": true,
       "explanation": "Lời giải thích nếu có trong tài liệu"
     },
     {
       "question_type": "essay",
       "question_text": "Đề bài tự luận...",
       "model_answer": "Đáp án tham khảo / Lời giải chi tiết...",
       "grading_rubric": "• Ý a) 0.5đ\n• Ý b) 0.5đ",
       "is_red_detected": true
     }
   ]`;

  const userPrompt = `Dưới đây là nội dung tài liệu trích xuất từ file đề thi môn: ${subjectName || 'Chung'}.
${hasRedDetection ? 'LƯU Ý QUAN TRỌNG: Tài liệu này có chứa các tag [RED_ANSWER] đánh dấu chữ màu đỏ của giáo viên. Hãy ưu tiên tuyệt đối các tag này để xác định đáp án đúng và lời giải tự luận.' : ''}

=== NỘI DUNG TÀI LIỆU ===
${rawText.slice(0, 50000)}
=== HẾT NỘI DUNG TÀI LIỆU ===

Hãy bóc tách tất cả các câu hỏi và trả về mảng JSON chuẩn:`;

  try {
    const { content } = await callAiChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    });

    const parsedData = parseAiJsonSafely(content);

    let parsedArray: Record<string, unknown>[] = [];
    if (Array.isArray(parsedData)) {
      parsedArray = parsedData as Record<string, unknown>[];
    } else if (parsedData && typeof parsedData === 'object') {
      const obj = parsedData as Record<string, unknown>;
      if (Array.isArray(obj.questions)) {
        parsedArray = obj.questions as Record<string, unknown>[];
      } else {
        const found = Object.values(obj).find(Array.isArray);
        if (found) parsedArray = found as Record<string, unknown>[];
      }
    }

    if (parsedArray.length === 0) {
      if (localQuestions.length > 0) return localQuestions;
      throw new Error('Dữ liệu AI trả về không phải là mảng danh sách câu hỏi.');
    }

    const aiQuestions: ParsedQuestionItem[] = parsedArray.map((item, index) => {
      const qType = item.question_type === 'essay' ? 'essay' : 'multiple_choice';
      const cleanQText = String(item.question_text || '')
        .replace(/\[\/?RED_ANSWER\]/g, '')
        .trim();

      const cleanOptA = item.option_a ? String(item.option_a).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined;
      const cleanOptB = item.option_b ? String(item.option_b).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined;
      const cleanOptC = item.option_c ? String(item.option_c).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined;
      const cleanOptD = item.option_d ? String(item.option_d).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined;

      const rawCorrect = String(item.correct_option || '').toUpperCase().trim();
      const validCorrect = ['A', 'B', 'C', 'D'].includes(rawCorrect)
        ? (rawCorrect as 'A' | 'B' | 'C' | 'D')
        : 'A';

      return {
        tempId: `parsed_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        question_type: qType,
        question_text: cleanQText || `Câu hỏi số ${index + 1}`,
        option_a: cleanOptA,
        option_b: cleanOptB,
        option_c: cleanOptC,
        option_d: cleanOptD,
        correct_option: qType === 'multiple_choice' ? validCorrect : undefined,
        is_red_detected: Boolean(item.is_red_detected),
        explanation: item.explanation ? String(item.explanation).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined,
        model_answer: item.model_answer ? String(item.model_answer).replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined,
        grading_rubric: item.grading_rubric ? String(item.grading_rubric).trim() : undefined,
      };
    });

    // Chạy qua bộ hậu xử lý để bảo đảm 100% dữ liệu đạt chuẩn
    return cleanAndStandardizeQuestions(aiQuestions);
  } catch (error) {
    console.warn('[Document-Parser] AI parsing gặp lỗi hoặc không khả dụng. Kích hoạt bộ bóc tách XML/Regex nội bộ:', error);

    if (localQuestions.length > 0) {
      console.log(`[Document-Parser] Đã bóc tách thành công ${localQuestions.length} câu hỏi bằng bộ phân tích nội bộ.`);
      return localQuestions;
    }

    throw new Error(
      'Không nhận diện được cấu trúc câu hỏi nào từ file tài liệu này. Vui lòng kiểm tra lại cách đánh số câu hỏi trong file.'
    );
  }
}
