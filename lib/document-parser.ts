import 'server-only';

import JSZip from 'jszip';
import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';
import Groq from 'groq-sdk';

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
    // C00000 (Dark Red trong bảng chuẩn của Word), FF0000 (Red), ED1C24 (Word default red)
    if (r >= 160 && g <= 100 && b <= 100) return true;
    if (r >= 140 && r > g * 1.8 && r > b * 1.8) return true;
  }

  // Định dạng hex 3 ký tự RGB
  if (val.length === 3 && /^[0-9a-f]{3}$/i.test(val)) {
    const r = parseInt(val[0], 16);
    const g = parseInt(val[1], 16);
    const b = parseInt(val[2], 16);
    if (r >= 10 && g <= 5 && b <= 5) return true;
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
 * Trích xuất nội dung DOCX từ word/document.xml, phát hiện các đoạn text có màu đỏ
 * và bọc chúng lại bằng tag [RED_ANSWER]...[/RED_ANSWER].
 */
export async function extractDocxTextWithRedColor(buffer: Buffer): Promise<{ text: string; hasRedRuns: boolean }> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      // Fallback về mammoth nếu không tìm thấy file XML chuẩn
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

        // Xử lý xuống dòng trong run nếu có
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
 * Sử dụng Groq AI để cấu trúc hóa nội dung text thô thành danh sách câu hỏi đề thi chuẩn JSON.
 */
export async function parseDocumentWithGroq(params: {
  rawText: string;
  subjectName?: string;
  hasRedDetection: boolean;
}): Promise<ParsedQuestionItem[]> {
  const { rawText, subjectName, hasRedDetection } = params;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY trên server.');
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

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
   - Lưu ý: Dùng dấu gạch chéo ngược chuẩn cho lệnh LaTeX.
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
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content.trim()];
    const cleanJson = jsonMatch[1]?.trim() || content.trim();

    const parsedArray = JSON.parse(cleanJson);
    if (!Array.isArray(parsedArray)) {
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
    console.error('Lỗi khi phân tích tài liệu với Groq AI:', error);
    throw new Error(
      error instanceof Error
        ? `Lỗi bóc tách câu hỏi AI: ${error.message}`
        : 'Không thể phân tích cấu trúc câu hỏi từ tài liệu. Vui lòng kiểm tra lại định dạng file.'
    );
  }
}
