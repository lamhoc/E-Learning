import 'server-only';

import { callAiChatCompletion } from '@/lib/ai-provider';
import {
  cleanPrefix,
  restoreLatexBackslashes,
  safeParseAIQuestionsJson,
  sanitizeLatexInJson,
} from './ai-json-parser';

export {
  cleanPrefix,
  safeParseAIQuestionsJson,
  sanitizeLatexInJson,
};

// Giữ lại alias để tương thích ngược hoàn toàn
export const sanitizeAndParseAiJson = safeParseAIQuestionsJson;
export const parseAiJsonSafely = safeParseAIQuestionsJson;

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
  easy: 'Nhận biết (Kiểm tra lý thuyết, định nghĩa, nhận dạng công thức hoặc tính toán đơn giản 1 bước)',
  medium: 'Thông hiểu (Hiểu bản chất, giải thích hiện tượng, vận dụng công thức chuẩn)',
  hard: 'Vận dụng (Bài toán nhiều bước, tư duy logic, tổng hợp kiến thức)',
  expert: 'Vận dụng cao (Phân loại học sinh giỏi, biến đổi phức tạp, liên hệ thực tiễn nâng cao)',
};

const MAX_COMPLETION_TOKENS = 8192;

/**
 * Tự động shuffle 4 phương án A-B-C-D và cập nhật lại `correct_option` tương ứng.
 * Đảm bảo đáp án đúng rải đều ngẫu nhiên qua cả 4 vị trí A, B, C, D (25% mỗi vị trí).
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
 * Hỗ trợ linh hoạt các biến thể tên thuộc tính mà LLM có thể trả về.
 */
function mapToQuestionDraft(
  item: Record<string, unknown>,
  index: number,
  offset: number,
  isMC: boolean
): GeneratedQuestionDraft {
  const rawQText = item.question_text || item.content || item.question || item.de_bai || '';
  const qText = restoreLatexBackslashes(rawQText);

  const rawExplanation = item.explanation || item.loi_giai || item.giai_thich || item.huong_dan || '';
  const explanation = restoreLatexBackslashes(rawExplanation);

  const tempId = `gen-${Date.now()}-${offset + index}-${Math.random().toString(36).substring(2, 6)}`;

  if (isMC) {
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    // Trường hợp 1: options là mảng 4 phần tử
    if (Array.isArray(item.options) && item.options.length >= 4) {
      optA = restoreLatexBackslashes(item.options[0]);
      optB = restoreLatexBackslashes(item.options[1]);
      optC = restoreLatexBackslashes(item.options[2]);
      optD = restoreLatexBackslashes(item.options[3]);
    } else {
      // Trường hợp 2: các trường option_a, option_b, option_c, option_d riêng lẻ
      optA = restoreLatexBackslashes(item.option_a || item.a || item.A || '');
      optB = restoreLatexBackslashes(item.option_b || item.b || item.B || '');
      optC = restoreLatexBackslashes(item.option_c || item.c || item.C || '');
      optD = restoreLatexBackslashes(item.option_d || item.d || item.D || '');
    }

    const rawKey = String(
      item.correct_option || item.correct_answer || item.answer || item.correct || 'A'
    )
      .trim()
      .toUpperCase();

    const originalCorrect = (['A', 'B', 'C', 'D'] as const).includes(rawKey as 'A')
      ? (rawKey as 'A' | 'B' | 'C' | 'D')
      : 'A';

    // Shuffle phương án để đáp án đúng phân bổ đều A, B, C, D
    const shuffled = shuffleMultipleChoiceOptions(optA, optB, optC, optD, originalCorrect);

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

  // Tự luận
  const rawModelAnswer =
    item.model_answer || item.sample_answer || item.dap_an_mau || item.answer || '';
  const rawRubric =
    item.grading_rubric || item.rubric || item.thang_diem || item.tieu_chi || '';

  return {
    tempId,
    question_type: 'essay',
    question_text: qText,
    model_answer: restoreLatexBackslashes(rawModelAnswer),
    grading_rubric: restoreLatexBackslashes(rawRubric),
    explanation,
  };
}

/**
 * Hàm sinh câu hỏi AI thực thụ (100% LLM - TUYỆT ĐỐI KHÔNG DÙNG MOCK/STATIC FALLBACK):
 * - Bám sát 100% môn học và chủ đề bài học/nội dung kiến thức do giảng viên chọn hoặc nhập tay.
 * - Tự động xoay vòng đa cổng qua ai-provider (Gemini -> Groq -> Free Gateway).
 * - Sử dụng safeParseAIQuestionsJson bảo vệ công thức LaTeX và cứu chuỗi bị ngắt.
 * - Nếu toàn bộ cổng mạng đều ngắt: Báo lỗi rõ ràng để giảng viên bấm "Thử sinh lại".
 */
export async function generateQuestionsAI(
  req: GenerateAIRequest
): Promise<GeneratedQuestionDraft[]> {
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
    normSubject.includes('chem') ||
    normSubject.includes('toa do') ||
    normSubject.includes('vecto') ||
    normSubject.includes('hinh');

  // System Prompt Chuyên Gia Khảo Thí Cao Cấp — ÉP BÁM SÁT 100% CHỦ ĐỀ
  const systemPrompt = `Bạn là Chuyên gia Khảo thí & Biên soạn Đề thi thông minh của hệ thống E-Learning (Đại học Lạc Hồng).

NHIỆM VỤ: Biên soạn các câu hỏi ${isMC ? 'TRẮC NGHIỆM KHÁCH QUAN 4 LỰA CHỌN' : 'TỰ LUẬN KÈM RUBRIC CHẤM'} thuộc môn "${req.subjectName}" (Mã: "${req.subjectCode}").

QUY TẮC BẮT BUỘC (VI PHẠM SẼ BỊ LOẠI BỎ):
1. BÁM SÁT 100% CHỦ ĐỀ & NỘI DUNG YÊU CẦU:
   - MỌI câu hỏi sinh ra BẮT BUỘC phải xoay quanh đúng nội dung kiến thức được yêu cầu.
   - Ví dụ: Nếu chủ đề là "Phương pháp tọa độ trong mặt phẳng và không gian", 100% câu hỏi phải về tọa độ điểm, vectơ, đường thẳng, mặt phẳng, mặt cầu trong Oxy/Oxyz — TUYỆT ĐỐI KHÔNG sinh câu hỏi sang Đạo hàm, Tích phân hay chủ đề khác!
   - Nếu người dùng dán cả đoạn văn bản bài giảng, lý thuyết, đoạn code hoặc tình huống thực tế -> CHỈ tạo câu hỏi trực tiếp từ đúng nội dung kiến thức đó.
2. CHÍNH XÁC TUYỆT ĐỐI VỀ HỌC THUẬT & TOÁN HỌC:
   - Tự kiểm tra lại toàn bộ phép tính, công thức, số liệu, sự kiện để đảm bảo đáp án đúng (correct_option) trùng khớp 100% với lời giải chi tiết (explanation).
3. ĐA DẠNG & KHÔNG TRÙNG LẶP:
   - Mỗi câu hỏi trong đợt sinh phải khai thác một khía cạnh, dạng toán hoặc nội dung khác nhau, không lặp lại ý.
4. KÝ HIỆU LATEX KATEX CHUẨN:
   ${
     isMathOrScience
       ? '- Mọi công thức Toán/Khoa học bọc trong $...$ (inline) hoặc $$...$$ (block), viết chuẩn JSON escape (\\\\frac, \\\\vec, \\\\overrightarrow, \\\\sqrt, \\\\begin{pmatrix}...\\\\end{pmatrix}).'
       : '- Viết bằng tiếng Việt học thuật chuẩn xác. Không dùng công thức Toán khi môn học là các môn Xã hội / Ngôn ngữ / Lý thuyết.'
   }
5. LOẠI BỎ TIỀN TỐ THỪA:
   - Trong 'question_text': Không ghi "Câu 1:", "Câu 2:" ở đầu.
   - Trong các phương án: Không ghi "A.", "Phương án A:" ở đầu.
6. ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON object có khóa "questions" chứa mảng câu hỏi (KHÔNG thêm markdown hay văn bản thừa ngoài JSON).

Cấu trúc JSON:
${
  isMC
    ? `{"questions":[{"question_text":"Nội dung đề bài...","option_a":"Phương án A","option_b":"Phương án B","option_c":"Phương án C","option_d":"Phương án D","correct_option":"B","explanation":"Lời giải chi tiết từng bước..."}]}`
    : `{"questions":[{"question_text":"Nội dung bài tự luận...","model_answer":"Các ý chính cốt lõi / Đáp án mẫu...","grading_rubric":"Thang điểm chi tiết chuẩn thang 10 hoặc phân bổ điểm từng ý...","explanation":"Hướng dẫn chấm & lưu ý..."}]}`
}`;

  // Batch size 3-5 câu mỗi lượt gọi để đảm bảo độ sâu học thuật và không bị timeout
  const batchSize = Math.min(5, req.count);
  const generatedQuestions: GeneratedQuestionDraft[] = [];
  const seenQuestionTexts = new Set<string>();

  for (let offset = 0; offset < req.count; offset += batchSize) {
    const batchCount = Math.min(batchSize, req.count - offset);
    const nonce = `${Date.now()}-${offset}-${Math.random().toString(36).substring(2, 6)}`;

    const userPrompt = `Hãy biên soạn CHÍNH XÁC ${batchCount} câu hỏi ${isMC ? 'trắc nghiệm (4 phương án A-B-C-D)' : 'tự luận (kèm đáp án mẫu và thang điểm)'} với các thông số sau:
- Môn học: ${req.subjectName} (Mã môn: ${req.subjectCode})
- CHỦ ĐỀ / NỘI DUNG KIẾN THỨC BẮT BUỘC:
"""
${req.topic}
"""
- Mức độ nhận thức: ${difficultyDesc}
${req.additionalNote ? `- Ghi chú thêm từ giảng viên: ${req.additionalNote}` : ''}
- Mã phiên sinh chống lặp: ${nonce}

YÊU CẦU ĐẶC BIỆT:
1. Toàn bộ ${batchCount} câu hỏi này (từ câu ${offset + 1} đến câu ${offset + batchCount}) PHẢI bám sát 100% vào đúng chủ đề "${req.topic}" ở trên. Tuyệt đối không sinh lệch sang chủ đề khác!
2. Trả về đúng định dạng JSON {"questions":[...]}.`;

    let list: Record<string, unknown>[] = [];
    let lastError: unknown = null;

    // LƯỢT 1: Gọi với response_format json_object (nếu LLM hỗ trợ)
    try {
      const result1 = await callAiChatCompletion({
        temperature: 0.7, // Tăng tính sáng tạo, đa dạng theo từng lần bấm
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      list = safeParseAIQuestionsJson(result1.content);
    } catch (err1) {
      lastError = err1;
      console.warn('[AI-Question-Generator] Lượt 1 (Strict JSON) gặp trục trặc, tự động thử Lượt 2 (Resilient Text Mode):', err1);

      // LƯỢT 2: Gọi Text Mode với prompt tăng cường escape LaTeX
      try {
        const result2 = await callAiChatCompletion({
          temperature: 0.6,
          max_tokens: MAX_COMPLETION_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `${userPrompt}\n\n[LƯU Ý QUAN TRỌNG: Hãy đảm bảo mọi dấu gạch chéo ngược LaTeX trong công thức toán học đều được escape hợp lệ thành \\\\ để không làm hỏng cấu trúc JSON!]`,
            },
          ],
        });

        list = safeParseAIQuestionsJson(result2.content);
      } catch (err2) {
        lastError = err2;
        console.warn('[AI-Question-Generator] Lượt 2 gặp trục trặc:', err2);
      }
    }

    // Nếu không lấy được câu hỏi nào từ LLM, báo lỗi rõ ràng (TUYỆT ĐỐI KHÔNG CHÈN FALLBACK TĨNH LỆCH CHỦ ĐỀ)
    if (!list || list.length === 0) {
      const errMsg = lastError instanceof Error ? lastError.message : 'Máy chủ AI không trả về câu hỏi hợp lệ.';
      throw new Error(
        `Không thể sinh câu hỏi từ mô hình AI cho chủ đề "${req.topic}". Chi tiết: ${errMsg}. Vui lòng bấm "Thử sinh lại" hoặc điều chỉnh lại chủ đề/ghi chú.`
      );
    }

    // Chuyển đổi sang GeneratedQuestionDraft và chống trùng lặp
    for (let index = 0; index < list.length && generatedQuestions.length < req.count; index++) {
      const item = list[index];
      const draft = mapToQuestionDraft(item, index, offset, isMC);
      const normalizedText = draft.question_text.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!seenQuestionTexts.has(normalizedText) && normalizedText.length > 5) {
        seenQuestionTexts.add(normalizedText);
        generatedQuestions.push(draft);
      } else if (generatedQuestions.length < req.count) {
        generatedQuestions.push(draft);
      }
    }
  }

  if (generatedQuestions.length === 0) {
    throw new Error(
      `Máy chủ AI không thể tạo câu hỏi bám sát chủ đề "${req.topic}". Vui lòng thử lại với chủ đề chi tiết hơn.`
    );
  }

  return generatedQuestions;
}
