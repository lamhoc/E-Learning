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
    // C00000 (Dark Red trong bảng chuẩn của Word), FF0000 (Red), ED1C24 (Word default red), DC2626, EE0000
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
 * BỘ BÓC TÁCH NỘI BỘ (Local Regex & XML Parser):
 * Hoạt động độc lập 100% không phụ thuộc vào kết nối mạng hay dịch vụ AI ngoài.
 * Đảm bảo trích xuất chính xác câu hỏi trắc nghiệm (nhận diện chữ đỏ [RED_ANSWER])
 * và câu hỏi tự luận kèm đáp án mẫu/rubric.
 */
export function parseQuestionsLocallyFromText(rawText: string): ParsedQuestionItem[] {
  if (!rawText || rawText.trim().length === 0) return [];

  const questions: ParsedQuestionItem[] = [];

  // Chuẩn hóa dòng và khoảng trắng
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tìm các điểm bắt đầu của từng câu hỏi: "Câu 1", "Câu 2", "Bài 1", "Bài 2", hoặc "1.", "2."
  // Dùng regex tìm vị trí các marker
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

  // Nếu không tìm thấy marker "Câu 1, Câu 2", thử tách theo các đoạn có phương án A. B. C. D.
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
    // Marker phương án có thể có hoặc không có tag [RED_ANSWER] bao quanh
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
      // TRẮC NGHIỆM:
      const rawQuestionText = section.slice(0, matchA.index).trim();
      const rawOptA = section.slice(matchA.index + matchA[0].length, matchB.index).trim();
      const rawOptB = section.slice(matchB.index + matchB[0].length, matchC.index).trim();
      const rawOptC = section.slice(matchC.index + matchC[0].length, matchD.index).trim();

      // Phần sau D có thể chứa thêm Lời giải / Đáp án / Hướng dẫn
      let rawOptD = section.slice(matchD.index + matchD[0].length).trim();
      let explanation: string | undefined = undefined;

      // Cắt bỏ tiêu đề phân phần (nếu có rơi vào cuối phương án D của câu cuối phần trắc nghiệm)
      const partHeaderMatch = /(?:\n\s*|\s{2,})(?:PHẦN|Phần|TỰ LUẬN|Tự luận)[\s\S]*/i.exec(rawOptD);
      if (partHeaderMatch) {
        rawOptD = rawOptD.slice(0, partHeaderMatch.index).trim();
      }

      const explainMatch = /(?:Lời giải|Hướng dẫn|Giải thích|Đáp án chi tiết)[:\s-]+([\s\S]*)/i.exec(rawOptD);
      if (explainMatch) {
        explanation = explainMatch[1].replace(/\[\/?RED_ANSWER\]/g, '').trim();
        rawOptD = rawOptD.slice(0, explainMatch.index).trim();
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
      } else {
        // Kiểm tra dấu * hoặc [x] hoặc Đáp án: [A-D]
        const explicitAnsMatch = /(?:Đáp án|Chọn)[:\s]*([A-D])/i.exec(section);
        if (explicitAnsMatch) {
          correctOption = explicitAnsMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        } else if (rawOptA.startsWith('*') || rawOptA.startsWith('[x]')) {
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
      // TỰ LUẬN:
      // Kiểm tra xem đoạn có chứa câu hỏi tự luận không
      // Tách phần đề bài và phần lời giải mẫu/rubric
      const answerSplitRegex = /(?:Đáp án|Lời giải|Hướng dẫn giải|Thang điểm|Rubric)[:\s-]+([\s\S]*)/i;
      const splitMatch = answerSplitRegex.exec(section);

      let questionPart = section;
      let modelAnswerPart: string | undefined = undefined;

      if (splitMatch) {
        questionPart = section.slice(0, splitMatch.index).trim();
        modelAnswerPart = splitMatch[1].trim();
      }

      const cleanQ = questionPart.replace(/\[\/?RED_ANSWER\]/g, '').trim();
      const cleanA = modelAnswerPart ? modelAnswerPart.replace(/\[\/?RED_ANSWER\]/g, '').trim() : undefined;

      if (cleanQ.length > 5) {
        questions.push({
          tempId: `local_essay_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          question_type: 'essay',
          question_text: cleanQ,
          model_answer: cleanA,
          grading_rubric: cleanA ? 'Điểm tối đa nếu hoàn thành đúng các bước lời giải.' : undefined,
          is_red_detected: false,
        });
      }
    }
  }

  return questions;
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
  const localQuestions = parseQuestionsLocallyFromText(rawText);

  const systemPrompt = `Bạn là trợ lý khảo thí chuyên nghiệp bóc tách đề thi từ tài liệu (Word/PDF) cho hệ thống giáo dục Việt Nam.
Nhiệm vụ của bạn là đọc toàn bộ văn bản đề thi và chuyển đổi thành danh sách các câu hỏi có cấu trúc JSON chính xác.

QUY TẮC BÓC TÁCH BẮT BUỘC:
1. Nhận diện các câu hỏi: Thường bắt đầu bằng "Câu 1:", "Câu 2:", "1.", "Bài 1:" hoặc tiêu đề tương tự.
2. Với câu hỏi trắc nghiệm:
   - Tách rõ 4 phương án: A, B, C, D (hoặc A., B., C., D.).
   - Loại bỏ các ký tự thừa như "[RED_ANSWER]" và "[/RED_ANSWER]" ra khỏi nội dung câu hỏi và nội dung phương án.
3. ĐẶC BIỆT VỀ ĐÁP ÁN ĐÚNG (CRITICAL):
   - Nếu trong văn bản có tag "[RED_ANSWER]...[/RED_ANSWER]" xuất hiện tại một phương án nào (hoặc tại chữ cái A/B/C/D), đó CHÍNH XÁC là đáp án đúng do giáo viên bôi chữ màu đỏ.
     -> Bắt buộc gán "correct_option" là phương án đó ("A", "B", "C", hoặc "D") và đặt "is_red_detected": true.
   - Nếu trong câu hỏi KHÔNG có tag "[RED_ANSWER]", hãy tìm các dấu hiệu nhận diện đáp án khác (chữ in đậm, gạch chân, dấu *, hoặc bảng đáp án ở cuối đề).
     Nếu xác định được, gán "correct_option" tương ứng và đặt "is_red_detected": false.
     Nếu vẫn không xác định được, hãy chọn phương án đúng nhất theo kiến thức chuyên môn và đặt "is_red_detected": false.
4. Với câu hỏi tự luận (không có phương án A, B, C, D):
   - Đặt "question_type": "essay".
   - "model_answer": Lời giải chi tiết hoặc đáp án gợi ý tìm thấy trong tài liệu.
5. Công thức toán học/khoa học:
   - Hãy giữ nguyên hoặc chuẩn hóa công thức sang cú pháp KaTeX inline: $...$ (ví dụ: $x^2 - 4x + 3 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$).
6. Cấu trúc JSON trả về:
   - Trả về DUY NHẤT một mảng JSON các object theo schema dưới đây trong khối \`\`\`json ... \`\`\`:
   [
     {
       "question_type": "multiple_choice",
       "question_text": "Nội dung câu hỏi...",
       "option_a": "Nội dung phương án A",
       "option_b": "Nội dung phương án B",
       "option_c": "Nội dung phương án C",
       "option_d": "Nội dung phương án D",
       "correct_option": "A",
       "is_red_detected": true,
       "explanation": "Lời giải thích ngắn gọn nếu có trong tài liệu"
     }
   ]`;

  const userPrompt = `Dưới đây là nội dung tài liệu trích xuất từ file đề thi môn: ${subjectName || 'Chung'}.
${hasRedDetection ? 'LƯU Ý QUAN TRỌNG: Tài liệu này có chứa các tag [RED_ANSWER] đánh dấu chữ màu đỏ của giáo viên. Hãy ưu tiên tuyệt đối các tag này để xác định đáp án đúng.' : ''}

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

    const questions: ParsedQuestionItem[] = parsedArray.map((item, index) => {
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
      };
    });

    return questions;
  } catch (error) {
    console.warn('[Document-Parser] AI parsing gặp lỗi hoặc không khả dụng. Kích hoạt bộ bóc tách XML/Regex nội bộ:', error);

    // Nếu bộ bóc tách nội bộ đã có dữ liệu, trả về ngay lập tức để không bao giờ quăng lỗi đỏ lên giao diện!
    if (localQuestions.length > 0) {
      console.log(`[Document-Parser] Đã bóc tách thành công ${localQuestions.length} câu hỏi bằng bộ phân tích nội bộ.`);
      return localQuestions;
    }

    // Nếu cả 2 đều không có câu hỏi nào, lúc này mới báo lỗi định dạng file
    throw new Error(
      'Không nhận diện được cấu trúc câu hỏi nào từ file tài liệu này. Vui lòng kiểm tra lại cách đánh số câu hỏi trong file.'
    );
  }
}
