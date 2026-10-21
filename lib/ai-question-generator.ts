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

export async function generateQuestionsAI(
  req: GenerateAIRequest,
): Promise<GeneratedQuestionDraft[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY trên server.');
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const isMC = req.questionType === 'multiple_choice';
  const difficultyDesc = DIFFICULTY_MAP[req.difficulty] ?? req.difficulty;

  const systemPrompt = `Bạn là chuyên gia khảo thí và sư phạm cao cấp, chuyên xây dựng ngân hàng câu hỏi đề thi chuẩn xác cho các trường đại học và THPT tại Việt Nam.

QUY TẮC BẮT BUỘC VỀ NỘI DUNG VÀ ĐỊNH DẠNG:
1. ĐÚNG CHUẨN KHOA HỌC: Câu hỏi, các phương án nhiễu, đáp án đúng và lời giải thích phải chính xác 100%, không được có sai sót về kiến thức.
2. CÔNG THỨC TOÁN HỌC & KHOA HỌC: Bắt buộc dùng cú pháp LaTeX chuẩn.
   - Dùng $...$ cho công thức nằm trong dòng (inline math, ví dụ: $A = \\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}$, $\\lambda_1 = 3$, $f(x) = x^2 - 4$).
   - Dùng $$...$$ cho công thức đứng riêng dòng (display math).
3. ĐỐI VỚI CÂU HỎI TRẮC NGHIỆM:
   - Phải có đủ 4 phương án A, B, C, D rõ ràng, không được dùng "Tất cả các đáp án trên đều đúng".
   - Chỉ có DUY NHẤT một đáp án đúng, 3 phương án còn lại là phương án nhiễu hợp lý.
   - Giải thích chi tiết các bước giải và chỉ rõ tại sao đáp án đó là đúng.
4. ĐỐI VỚI CÂU HỎI TỰ LUẬN:
   - Cung cấp đáp án tham khảo (model_answer) đầy đủ các bước.
   - Cung cấp thang điểm / tiêu chí chấm (grading_rubric) phân bổ điểm từng bước.
5. ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON object hợp lệ có khóa "questions" chứa mảng câu hỏi. Không thêm markdown, chú thích, dấu phẩy cuối hoặc văn bản ngoài JSON. Trong chuỗi JSON, mọi dấu gạch chéo ngược của LaTeX phải được escape thành \\\\.

Nếu là trắc nghiệm (multiple_choice):
{"questions":[{"question_text":"Chuỗi nội dung câu hỏi...","option_a":"Nội dung phương án A...","option_b":"Nội dung phương án B...","option_c":"Nội dung phương án C...","option_d":"Nội dung phương án D...","correct_option":"A","explanation":"Giải thích chi tiết cách giải..."}]}

Nếu là tự luận (essay):
{"questions":[{"question_text":"Chuỗi nội dung bài toán tự luận...","model_answer":"Đáp án mẫu từng bước...","grading_rubric":"Thang điểm từng ý...","explanation":"Hướng dẫn phương pháp tư duy và lưu ý..."}]}`;

  const userPrompt = `Hãy tạo chính xác ${req.count} câu hỏi chất lượng cao với các thông số sau:
- Môn học: ${req.subjectName} (Mã môn: ${req.subjectCode})
- Chủ đề / Bài học: ${req.topic}
- Loại câu hỏi: ${isMC ? 'Trắc nghiệm khách quan 4 lựa chọn (A, B, C, D)' : 'Tự luận / Bài tập tự giải'}
- Cấp độ tư duy: ${difficultyDesc}
${req.additionalNote ? `- Ghi chú thêm từ giảng viên: ${req.additionalNote}` : ''}

Chỉ trả về JSON object hợp lệ theo cấu trúc {"questions":[...]}, không trả về mảng ở cấp gốc.`;

  try {
    const response = await groq.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content?.trim() || '';

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // If wrapped in markdown code fence
      const cleaned = rawContent.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Support both direct array or wrapped in object like { questions: [...] }
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      list = parsed as Record<string, unknown>[];
    } else if (parsed && typeof parsed === 'object') {
      const values = Object.values(parsed);
      const arrayProp = values.find(Array.isArray);
      if (arrayProp) {
        list = arrayProp as Record<string, unknown>[];
      }
    }

    if (list.length === 0) {
      throw new Error('AI không trả về danh sách câu hỏi hợp lệ.');
    }

    return list.map((item, index) => {
      const qText = String(item.question_text || '').trim();
      const explanation = String(item.explanation || '').trim();

      if (isMC) {
        const optA = String(item.option_a || '').trim();
        const optB = String(item.option_b || '').trim();
        const optC = String(item.option_c || '').trim();
        const optD = String(item.option_d || '').trim();
        const rawKey = String(item.correct_option || 'A').trim().toUpperCase();
        const correctKey = ['A', 'B', 'C', 'D'].includes(rawKey)
          ? (rawKey as 'A' | 'B' | 'C' | 'D')
          : 'A';

        return {
          tempId: `gen-${Date.now()}-${index}`,
          question_type: 'multiple_choice',
          question_text: qText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_option: correctKey,
          explanation,
        };
      } else {
        return {
          tempId: `gen-${Date.now()}-${index}`,
          question_type: 'essay',
          question_text: qText,
          model_answer: String(item.model_answer || '').trim(),
          grading_rubric: String(item.grading_rubric || '').trim(),
          explanation,
        };
      }
    });
  } catch (error) {
    const errorDetails =
      error && typeof error === 'object'
        ? (error as { code?: unknown; status?: unknown })
        : null;

    if (errorDetails?.code === 'json_validate_failed') {
      console.error('Groq rejected generated JSON:', {
        code: errorDetails.code,
        status: errorDetails.status,
      });
      throw new Error(
        'AI chưa thể tạo câu hỏi đúng định dạng. Vui lòng thử lại hoặc giảm số lượng câu hỏi.',
      );
    }

    console.error('Groq AI Question Generator Error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Có lỗi xảy ra khi kết nối với AI sinh câu hỏi.',
    );
  }
}

