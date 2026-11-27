import 'server-only';

import { callAiChatCompletion } from '@/lib/ai-provider';
import {
  cleanPrefix,
  safeParseAIQuestionsJson,
  sanitizeLatexInJson,
} from './ai-json-parser';
import {
  buildStructuredQuestionPrompts,
  checkKatexRenderable,
  parseStructuredAIQuestions,
  sanitizeAndRepairLatex,
  validateAndCleanQuestions,
  type AIDifficulty,
  type GenerateAIRequest,
  type GeneratedQuestionDraft,
} from './ai-structured-parser';

export {
  buildStructuredQuestionPrompts,
  checkKatexRenderable,
  cleanPrefix,
  parseStructuredAIQuestions,
  safeParseAIQuestionsJson,
  sanitizeAndRepairLatex,
  sanitizeLatexInJson,
  validateAndCleanQuestions,
  type AIDifficulty,
  type GenerateAIRequest,
  type GeneratedQuestionDraft,
};

// Giữ lại alias để tương thích ngược hoàn toàn với các module khác (document-parser...)
export const sanitizeAndParseAiJson = safeParseAIQuestionsJson;
export const parseAiJsonSafely = safeParseAIQuestionsJson;

const MAX_COMPLETION_TOKENS = 8192;
const QUESTION_GEN_TIMEOUT_MS = 20000;

/**
 * Chuẩn hóa thông báo lỗi chi tiết (tránh lỗi 2 dấu chấm `..` khi ghép câu).
 */
function normalizeErrorDetail(err: unknown): string {
  const raw =
    err instanceof Error && err.message
      ? err.message
      : 'Máy chủ AI không trả về câu hỏi hợp lệ';
  return raw.trim().replace(/\.+$/, '');
}

/**
 * Chuẩn hóa đề bài để so khớp chống trùng lặp giữa các lượt sinh & lượt bù (Auto Top-up).
 */
function normalizeStemKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Hàm sinh câu hỏi AI thế hệ mới (Phase 79):
 * 1. Bỏ hoàn toàn `response_format: { type: "json_object" }` — dùng định dạng XML Tags thuần văn bản
 *    (`<question>...</question>`) để triệt tiêu vĩnh viễn lỗi nuốt backslash LaTeX (`\frac`, `\boldsymbol`, `\neq`, `\root`)
 *    và lỗi `400 json_validate_failed` của Groq.
 * 2. Parser 2 lớp (`parseStructuredAIQuestions`): Ưu tiên XML Tags, dự phòng JSON có bảo vệ dấu `\`.
 * 3. Bộ kiểm duyệt nghiêm ngặt (`validateAndCleanQuestions` + Zero-Red-Text KaTeX Gate): cấm 100% câu hỏi rỗng,
 *    phương án A-B-C-D trống hoặc công thức lỗi KaTeX lọt ra giao diện.
 * 4. Cơ chế Auto Top-up / Retry: nếu sau lọc vẫn thiếu câu (hoặc = 0), tự động gọi bổ sung 1 lượt sang
 *    model dự phòng kế tiếp để đủ số lượng câu sạch đẹp.
 * 5. Tuyệt đối KHÔNG dùng kho câu hỏi mẫu tĩnh lệch chủ đề.
 */
export async function generateQuestionsAI(
  req: GenerateAIRequest
): Promise<GeneratedQuestionDraft[]> {
  const targetCount = Math.min(Math.max(Math.floor(req.count || 5), 1), 10);
  // Với Tự luận (kèm đáp án mẫu & rubric dài), chia batch tối đa 3 câu/lượt để đảm bảo độ sâu và tốc độ ổn định
  const batchSize = req.questionType === 'essay' ? Math.min(3, targetCount) : Math.min(5, targetCount);

  const generatedQuestions: GeneratedQuestionDraft[] = [];
  const seenStems = new Set<string>();
  const existingStemsList: string[] = [];
  const failedModels = new Set<string>();
  let lastError: unknown = null;

  const appendValidQuestions = (candidates: GeneratedQuestionDraft[], limit: number): number => {
    let added = 0;
    for (const draft of candidates) {
      if (generatedQuestions.length >= limit) break;
      const key = normalizeStemKey(draft.question_text);
      if (seenStems.has(key)) continue;
      seenStems.add(key);
      existingStemsList.push(draft.question_text);
      generatedQuestions.push(draft);
      added++;
    }
    return added;
  };

  /**
   * Thực hiện 1 lượt gọi LLM theo định dạng XML Tags và trả về các câu vượt qua kiểm duyệt chặt.
   */
  const runGenerationTurn = async (
    neededCount: number,
    offset: number,
    skipModels: string[]
  ): Promise<{ valid: GeneratedQuestionDraft[]; modelUsed: string; rejectedCount: number }> => {
    const { systemPrompt, userPrompt } = buildStructuredQuestionPrompts(
      req,
      neededCount,
      offset,
      existingStemsList
    );

    // TUYỆT ĐỐI KHÔNG gửi response_format: { type: 'json_object' }
    const result = await callAiChatCompletion({
      temperature: 0.6,
      max_tokens: MAX_COMPLETION_TOKENS,
      disableAutoContinuation: true,
      requestTimeoutMs: QUESTION_GEN_TIMEOUT_MS,
      skipModels: skipModels.length > 0 ? skipModels : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const parsedRaw = parseStructuredAIQuestions(result.content);
    const validated = validateAndCleanQuestions(parsedRaw, req.questionType, { offset });

    if (validated.rejectedCount > 0) {
      console.warn(
        `[AI-Question-Generator] Model "${result.modelUsed}" có ${validated.rejectedCount} câu bị loại bởi bộ kiểm duyệt:`,
        validated.reasons.join(' | ')
      );
    }

    return {
      valid: validated.valid,
      modelUsed: result.modelUsed,
      rejectedCount: validated.rejectedCount,
    };
  };

  // Vòng sinh theo batch (mỗi batch tối đa 5 câu để tối ưu tốc độ & chất lượng)
  for (let offset = 0; offset < targetCount; offset += batchSize) {
    const batchGoal = Math.min(targetCount, offset + batchSize);
    const initialNeeded = batchGoal - generatedQuestions.length;
    if (initialNeeded <= 0) break;

    let firstTurnModel = '';
    try {
      const turn1 = await runGenerationTurn(initialNeeded, generatedQuestions.length, Array.from(failedModels));
      firstTurnModel = turn1.modelUsed;
      const added1 = appendValidQuestions(turn1.valid, batchGoal);
      if (added1 === 0) {
        failedModels.add(turn1.modelUsed);
      }
    } catch (err1) {
      lastError = err1;
      console.error('[AI-Question-Generator] Lượt sinh chính gặp lỗi:', err1);
    }

    // Auto Top-up / Retry: nếu batch vẫn thiếu câu (hoặc 0 câu hợp lệ), tự gọi bù 1 lượt sang model dự phòng kế tiếp
    const stillMissingInBatch = batchGoal - generatedQuestions.length;
    if (stillMissingInBatch > 0) {
      const skipForTopUp = Array.from(
        new Set([...failedModels, ...(firstTurnModel ? [firstTurnModel] : [])])
      );
      console.warn(
        `[AI-Question-Generator] Đạt ${generatedQuestions.length}/${batchGoal} câu hợp lệ. Tự động gọi bổ sung ${stillMissingInBatch} câu (xoay model dự phòng)...`
      );
      try {
        const turn2 = await runGenerationTurn(
          stillMissingInBatch,
          generatedQuestions.length,
          skipForTopUp
        );
        appendValidQuestions(turn2.valid, batchGoal);
      } catch (err2) {
        lastError = err2;
        console.error('[AI-Question-Generator] Lượt gọi bù (Auto Top-up) thất bại:', err2);
      }
    }
  }

  // Nếu sau toàn bộ batch vẫn thiếu câu so với targetCount nhưng đã có ít nhất 1 câu và còn ngân sách,
  // thử bù gọn thêm 1 lượt cuối để bảo đảm đủ số lượng câu yêu cầu (tránh mất câu do bị loại ở batch đầu)
  const finalMissing = targetCount - generatedQuestions.length;
  if (generatedQuestions.length > 0 && finalMissing > 0 && finalMissing <= 3) {
    try {
      const topUp = await runGenerationTurn(
        finalMissing,
        generatedQuestions.length,
        Array.from(failedModels)
      );
      appendValidQuestions(topUp.valid, targetCount);
    } catch (errTopUp) {
      console.warn('[AI-Question-Generator] Lượt bù cuối cùng không thành công, giữ các câu hợp lệ đã sinh:', errTopUp);
    }
  }

  if (generatedQuestions.length === 0) {
    const errDetail = normalizeErrorDetail(lastError);
    throw new Error(
      `Không thể sinh câu hỏi từ mô hình AI cho chủ đề "${req.topic}". Chi tiết: ${errDetail}. Vui lòng bấm "Thử sinh lại ngay" hoặc điều chỉnh lại chủ đề/ghi chú.`
    );
  }

  return generatedQuestions;
}
