import 'server-only';
import Groq from 'groq-sdk';
import {
  isTextIncomplete,
  mergeContinuation,
  buildContinuationPrompt,
} from './ai-continuation';

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiCompletionOptions = {
  messages: AiChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  preferredModel?: string;
  disableAutoContinuation?: boolean;
};

export type AiCompletionResult = {
  content: string;
  modelUsed: string;
  finishReason?: string;
  isTruncated?: boolean;
};

// Danh sách các model Groq theo thứ tự ưu tiên giảm dần (xoay vòng qua các model có hạn mức TPM/RPM riêng biệt)
const DEFAULT_CANDIDATE_MODELS: string[] = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

// Danh sách các model Google Gemini theo thứ tự ưu tiên giảm dần
const DEFAULT_GEMINI_CANDIDATE_MODELS: string[] = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Các model hỗ trợ trần token lớn 8192 tokens
const HIGH_CAPACITY_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
]);

/**
 * Loại bỏ thẻ suy nghĩ <think>...</think> (từ các mô hình như Qwen, DeepSeek...)
 */
export function stripThinkingTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\r\n]+/, '')
    .trim();
}

/**
 * Chuẩn hóa và làm sạch mảng lịch sử hội thoại trước khi gửi lên bất kỳ LLM nào:
 * 1. Lọc sạch các tin nhắn rác, tin nhắn thông báo lỗi kết nối cũ ("⚠️ Lỗi kết nối...")
 * 2. Chỉ giữ lại role chuẩn ('system' | 'user' | 'assistant') và content sạch
 * 3. Gộp các tin nhắn liên tiếp cùng vai trò (đảm bảo không bao giờ có 2 tin 'user' đứng liền nhau gây lỗi 400 Bad Request)
 * 4. Cắt trượt thông minh (Sliding Window): Chỉ gửi tối đa 10 tin nhắn gần nhất và không vượt quá ~12.000 ký tự (chống 429 TPM)
 */
export function sanitizeChatHistory(
  rawMessages: Array<{ role: string; content?: string | null }>
): AiChatMessage[] {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return [];

  // Bước 1: Lọc bỏ tin rỗng và tin nhắn lỗi
  const cleanedList: AiChatMessage[] = [];
  for (const m of rawMessages) {
    if (!m || typeof m.content !== 'string') continue;
    const trimmed = m.content.trim();
    if (!trimmed) continue;

    // Loại bỏ tin nhắn lỗi kết nối hoặc thông báo lỗi từ hệ thống
    if (
      trimmed.startsWith('⚠️') ||
      trimmed.startsWith('Lỗi kết nối:') ||
      trimmed.includes('Hiện không thể kết nối tới máy chủ AI') ||
      trimmed.includes('Failed to fetch')
    ) {
      continue;
    }

    const role =
      m.role === 'system'
        ? 'system'
        : m.role === 'assistant'
        ? 'assistant'
        : 'user';

    cleanedList.push({ role, content: trimmed });
  }

  if (cleanedList.length === 0) return [];

  // Tách tin nhắn system (nếu có)
  const systemMsg = cleanedList.find((m) => m.role === 'system');
  const chatMsgs = cleanedList.filter((m) => m.role !== 'system');

  if (chatMsgs.length === 0) {
    return systemMsg ? [systemMsg] : [];
  }

  // Bước 2: Gộp các tin nhắn có cùng role đứng liền kề
  const merged: AiChatMessage[] = [];
  for (const m of chatMsgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      merged.push({ role: m.role, content: m.content });
    }
  }

  // Bước 3: Sliding window thông minh: tối đa 10 tin gần nhất
  let windowed = merged.slice(-10);

  // Đảm bảo tin đầu tiên của chat window là 'user' (nếu là assistant đứng đầu thì bỏ)
  if (windowed.length > 0 && windowed[0].role === 'assistant') {
    windowed = windowed.slice(1);
  }

  // Bước 4: Giới hạn tổng ký tự ~12.000 ký tự để không vượt Token-Per-Minute (TPM)
  const MAX_TOTAL_CHARS = 12000;
  let totalChars = windowed.reduce((sum, m) => sum + m.content.length, 0);

  while (totalChars > MAX_TOTAL_CHARS && windowed.length > 2) {
    // Cắt bớt cặp tin nhắn cũ nhất (user + assistant) từ đầu
    const removed1 = windowed.shift();
    const removed2 = windowed.shift();
    totalChars -= (removed1?.content.length || 0) + (removed2?.content.length || 0);

    // Đảm bảo tin đầu tiên luôn là 'user'
    if (windowed.length > 0 && windowed[0].role === 'assistant') {
      const removedLead = windowed.shift();
      totalChars -= removedLead?.content.length || 0;
    }
  }

  return systemMsg ? [systemMsg, ...windowed] : windowed;
}

// Cache model đang hoạt động tốt trên môi trường hiện tại
let cachedWorkingModel: string | null = null;
let cachedDiscoveredModels: string[] | null = null;
let lastDiscoveryTime = 0;

/**
 * Lấy cấu hình Google Gemini API (key & model)
 */
export function getGeminiConfig() {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');
  const envModel = process.env.GEMINI_MODEL?.trim();
  return { apiKey, envModel };
}

/**
 * Lấy cấu hình Groq API (key & base url)
 */
export function getAiConfig() {
  const rawKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');
  const envModel = process.env.GROQ_MODEL?.trim();

  let baseUrl = (process.env.GROQ_BASE_URL || '').trim();
  if (!baseUrl) {
    baseUrl = 'https://api.groq.com/openai/v1';
  }

  return { apiKey, envModel, baseUrl };
}

/**
 * Cổng 1: Google Gemini REST API chính thức (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 * Nâng trần maxOutputTokens lên 8192 để triệt tiêu lỗi cắt cụt câu dài.
 * Timeout 14s cho mỗi lượt thử để kịp thời failover sang model tiếp theo.
 */
export async function callGoogleGeminiChatCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
  const { apiKey, envModel } = getGeminiConfig();
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY.');
  }

  const systemMessages = options.messages.filter((m) => m.role === 'system');
  const chatMessages = options.messages.filter((m) => m.role !== 'system');
  const systemInstructionText = systemMessages.map((m) => m.content).join('\n\n').trim();

  // Chuẩn hóa contents theo cấu trúc Gemini: roles là 'user' hoặc 'model'
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of chatMessages) {
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const text = m.content.trim();
    if (!text) continue;

    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  if (contents.length === 0) {
    throw new Error('Không có tin nhắn nào để gửi tới Google Gemini.');
  }

  if (contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Bắt đầu cuộc trò chuyện.' }] });
  }

  const candidateModels: string[] = [];
  if (options.preferredModel && options.preferredModel.toLowerCase().includes('gemini')) {
    candidateModels.push(options.preferredModel);
  }
  if (envModel && !candidateModels.includes(envModel)) {
    candidateModels.push(envModel);
  }
  for (const m of DEFAULT_GEMINI_CANDIDATE_MODELS) {
    if (!candidateModels.includes(m)) candidateModels.push(m);
  }

  const maxTokens = options.max_tokens ?? 8192;

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.35,
      maxOutputTokens: maxTokens,
      ...(options.response_format?.type === 'json_object' ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (systemInstructionText) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructionText }],
    };
  }

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(14000), // Timeout 14s mỗi model để failover siêu nhanh
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini API [${model}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
          finishReason?: string;
        }>;
      };

      const candidate = json?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      // Gộp toàn bộ parts trả về để không bỏ sót text dài
      const parts = candidate?.content?.parts || [];
      const rawText = parts.map((p) => p.text || '').join('').trim();
      const cleanText = stripThinkingTags(rawText);

      if (cleanText) {
        return {
          content: cleanText,
          modelUsed: `google/${model}`,
          finishReason,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[AI-Provider] Gemini model "${model}" lỗi:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastError || new Error('Tất cả các model Google Gemini đều không phản hồi.');
}

/**
 * Tự động gọi endpoint GET /models để khám phá danh sách model thực tế tài khoản có quyền truy cập
 */
export async function discoverAvailableModels(apiKey: string, baseUrl: string): Promise<string[]> {
  const now = Date.now();
  if (cachedDiscoveredModels && cachedDiscoveredModels.length > 0 && now - lastDiscoveryTime < 600000) {
    return cachedDiscoveredModels;
  }

  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return DEFAULT_CANDIDATE_MODELS;
    }

    const json = (await res.json()) as { data?: Array<{ id?: string; active?: boolean }> };
    const rawList = Array.isArray(json?.data) ? json.data : [];

    const chatModels = rawList
      .map((m) => m.id || '')
      .filter((id) => {
        if (!id) return false;
        const lower = id.toLowerCase();
        if (
          lower.includes('whisper') ||
          lower.includes('guard') ||
          lower.includes('embed') ||
          lower.includes('audio') ||
          lower.includes('tts')
        ) {
          return false;
        }
        return true;
      });

    if (chatModels.length > 0) {
      cachedDiscoveredModels = chatModels;
      lastDiscoveryTime = now;
      return chatModels;
    }
  } catch (err) {
    console.warn('[AI-Provider] Lỗi khi khám phá /models:', err);
  }

  return DEFAULT_CANDIDATE_MODELS;
}

/**
 * Tạo danh sách các model cần thử tuần tự cho request
 */
async function buildCandidateList(
  apiKey: string,
  baseUrl: string,
  preferredModel?: string,
  envModel?: string
): Promise<string[]> {
  const candidates: string[] = [];

  if (preferredModel && !candidates.includes(preferredModel)) {
    candidates.push(preferredModel);
  }
  if (cachedWorkingModel && !candidates.includes(cachedWorkingModel)) {
    candidates.push(cachedWorkingModel);
  }
  if (envModel && !candidates.includes(envModel)) {
    candidates.push(envModel);
  }

  for (const m of DEFAULT_CANDIDATE_MODELS) {
    if (!candidates.includes(m)) candidates.push(m);
  }

  return candidates;
}

/**
 * Cổng 2: Groq Cloud LLM với Fast Failover
 * Hỗ trợ trần 8192 token cho Llama 3.3, Scout 17B, Qwen3.
 */
export async function callGroqChatCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
  const { apiKey: groqKey, envModel: groqModel, baseUrl: groqBaseUrl } = getAiConfig();
  if (!groqKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY.');
  }

  const groq = new Groq({ apiKey: groqKey, baseURL: groqBaseUrl });
  let candidateList = await buildCandidateList(groqKey, groqBaseUrl, options.preferredModel, groqModel);
  let hasTriedDiscovery = false;
  let lastError: unknown = null;

  for (let i = 0; i < candidateList.length; i++) {
    const currentModel = candidateList[i];
    const isHighCapacity = HIGH_CAPACITY_MODELS.has(currentModel);
    // Nếu model có dung lượng lớn thì cấp 8192, model nhỏ thì giữ 4096 để an toàn context
    const maxTokens = options.max_tokens ?? (isHighCapacity ? 8192 : 4096);

    try {
      const response = await groq.chat.completions.create(
        {
          model: currentModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.25,
          max_tokens: maxTokens,
          ...(options.response_format ? { response_format: options.response_format } : {}),
        },
        {
          signal: AbortSignal.timeout(14000), // Timeout 14s cho mỗi model Groq
        }
      );

      const choice = response.choices?.[0];
      const finishReason = choice?.finish_reason || undefined;
      const rawText = choice?.message?.content?.trim() ?? '';
      const text = stripThinkingTags(rawText);

      if (text) {
        cachedWorkingModel = currentModel;
        return {
          content: text,
          modelUsed: currentModel,
          finishReason,
        };
      }
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      console.warn(`[AI-Provider] Model Groq "${currentModel}" thất bại (HTTP ${status || 'err'}): ${errMsg}`);

      const isRateLimit = status === 429 || errMsg.includes('429') || errMsg.includes('rate_limit');
      const isModelNotFound =
        status === 404 ||
        errMsg.includes('model_not_found') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('decommissioned');

      if (isRateLimit) {
        console.warn(`[AI-Provider] Groq rate limit (429) trên "${currentModel}", tự động chuyển sang model tiếp theo có quota riêng.`);
      }

      if (isModelNotFound && !hasTriedDiscovery) {
        hasTriedDiscovery = true;
        try {
          const discovered = await discoverAvailableModels(groqKey, groqBaseUrl);
          for (const dm of discovered) {
            if (!candidateList.includes(dm)) {
              candidateList.push(dm);
            }
          }
        } catch (discErr) {
          console.warn('[AI-Provider] Không thể khám phá thêm model Groq:', discErr);
        }
      }
    }
  }

  throw lastError || new Error('Tất cả các model Groq đều không phản hồi.');
}

/**
 * Cổng 3: Cổng AI dự phòng trực tuyến miễn phí (Free AI Gateway)
 * Sử dụng endpoint tương thích chuẩn OpenAI Chat Completions không yêu cầu API key.
 * Timeout 14s.
 */
export async function callFreeAiChatCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
  // 1. Thử endpoint OpenAI-compatible POST của Pollinations
  const endpoint = 'https://text.pollinations.ai/openai/chat/completions';

  const payload = {
    model: 'openai',
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.35,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(14000),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
      };

      const choice = json?.choices?.[0];
      const finishReason = choice?.finish_reason;
      const rawText = choice?.message?.content?.trim() ?? '';
      const cleanText = stripThinkingTags(rawText);

      if (cleanText) {
        return {
          content: cleanText,
          modelUsed: 'pollinations-free-openai',
          finishReason,
        };
      }
    } else {
      console.warn(`[AI-Provider] Free AI OpenAI POST trả về HTTP ${res.status}`);
    }
  } catch (postErr) {
    console.warn('[AI-Provider] Free AI OpenAI POST thất bại:', postErr);
  }

  // 2. Thử Direct POST endpoint của Pollinations
  try {
    const directPostRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      signal: AbortSignal.timeout(14000),
    });

    if (directPostRes.ok) {
      const rawText = (await directPostRes.text()).trim();
      const cleanText = stripThinkingTags(rawText);
      if (cleanText && !cleanText.startsWith('<!DOCTYPE') && !cleanText.startsWith('<html')) {
        return {
          content: cleanText,
          modelUsed: 'pollinations-free-direct-post',
        };
      }
    }
  } catch (directPostErr) {
    console.warn('[AI-Provider] Free AI Direct POST thất bại:', directPostErr);
  }

  // 3. Thử Fallback GET endpoint trực tiếp của Pollinations
  try {
    const latestUserMsg = [...options.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const sysMsg = options.messages.find((m) => m.role === 'system')?.content || '';
    if (latestUserMsg) {
      const encodedPrompt = encodeURIComponent(latestUserMsg);
      const encodedSystem = sysMsg ? `?system=${encodeURIComponent(sysMsg.slice(0, 1000))}` : '';
      const getUrl = `https://text.pollinations.ai/${encodedPrompt}${encodedSystem}`;

      const resGet = await fetch(getUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(14000),
      });

      if (resGet.ok) {
        const rawText = (await resGet.text()).trim();
        const cleanText = stripThinkingTags(rawText);
        if (cleanText && !cleanText.startsWith('<!DOCTYPE') && !cleanText.startsWith('<html')) {
          return {
            content: cleanText,
            modelUsed: 'pollinations-free-get',
          };
        }
      }
    }
  } catch (getErr) {
    console.warn('[AI-Provider] Free AI GET fallback thất bại:', getErr);
  }

  throw new Error('Cổng Free AI Gateway trực tuyến không phản hồi.');
}

/**
 * Thực hiện 1 lượt gọi đơn (Single Turn) qua cơ chế Cascade:
 * Cổng 1 Gemini -> Cổng 2 Groq -> Cổng 3 Free Gateway
 */
async function executeSingleTurn(options: AiCompletionOptions): Promise<AiCompletionResult> {
  // CỔNG 1: Google Gemini REST API chính thức
  const { apiKey: geminiKey } = getGeminiConfig();
  if (geminiKey) {
    try {
      const geminiResult = await callGoogleGeminiChatCompletion(options);
      return geminiResult;
    } catch (geminiErr) {
      console.warn('[AI-Provider] Cổng 1 Google Gemini gặp sự cố, tự động chuyển sang Cổng 2 Groq:', geminiErr);
    }
  }

  // CỔNG 2: Groq Cloud LLM
  const { apiKey: groqKey } = getAiConfig();
  if (groqKey) {
    try {
      const groqResult = await callGroqChatCompletion(options);
      return groqResult;
    } catch (groqErr) {
      console.warn('[AI-Provider] Cổng 2 Groq gặp sự cố, tự động chuyển sang Cổng 3 Free Gateway:', groqErr);
    }
  }

  // CỔNG 3: Cổng AI Trực Tuyến Miễn Phí
  try {
    const freeResult = await callFreeAiChatCompletion(options);
    return freeResult;
  } catch (freeErr) {
    console.warn('[AI-Provider] Cổng 3 Free Gateway không phản hồi:', freeErr);
  }

  throw new Error('Tất cả các cổng AI trực tuyến (Gemini, Groq và Free Gateway) đều không phản hồi.');
}

/**
 * Gọi chat completion với cơ chế Đa Cổng Chuẩn Gemini (Multi-Provider Cascade)
 * VÀ TỰ ĐỘNG TIẾP TỤC Ở SERVER (SERVER-SIDE AUTO-CONTINUATION):
 * - Nâng trần 8192 tokens
 * - Tự động phát hiện khi phản hồi bị cắt cụt giữa chừng
 * - Tự động gọi tiếp tối đa 2 lần để ghép thành nội dung hoàn chỉnh 100% trước khi trả về.
 */
export async function callAiChatCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
  const sanitizedMessages = sanitizeChatHistory(options.messages);
  const cleanOptions: AiCompletionOptions = {
    ...options,
    messages: sanitizedMessages.length > 0 ? sanitizedMessages : options.messages,
    max_tokens: options.max_tokens ?? 8192,
  };

  // Lấy câu hỏi user gần nhất để đánh giá độ trọn vẹn (ví dụ user hỏi "Tạo 10 câu...")
  const latestUserPrompt =
    [...cleanOptions.messages].reverse().find((m) => m.role === 'user')?.content || '';

  // LƯỢT 1: Gọi sinh nội dung ban đầu
  const initialResult = await executeSingleTurn(cleanOptions);

  let accumulatedContent = initialResult.content;
  let lastFinishReason = initialResult.finishReason;
  const modelUsed = initialResult.modelUsed;

  // Nếu bị cấm auto-continuation (ví dụ các tác vụ JSON ngắn), trả về ngay
  if (options.disableAutoContinuation) {
    return {
      content: accumulatedContent,
      modelUsed,
      finishReason: lastFinishReason,
      isTruncated: isTextIncomplete(accumulatedContent, lastFinishReason, latestUserPrompt),
    };
  }

  // VÒNG LẶP AUTO-CONTINUATION (Tối đa 2 lần lặp)
  const MAX_AUTO_CONTINUATION = 2;
  let continuationCount = 0;

  while (
    continuationCount < MAX_AUTO_CONTINUATION &&
    isTextIncomplete(accumulatedContent, lastFinishReason, latestUserPrompt)
  ) {
    continuationCount++;
    console.log(
      `[AI-Provider] Phát hiện câu trả lời bị ngắt dở (lần ${continuationCount}/${MAX_AUTO_CONTINUATION}, reason: ${lastFinishReason || 'tail'}). Đang tự động gửi yêu cầu viết tiếp...`
    );

    try {
      const continuationPrompt = buildContinuationPrompt(latestUserPrompt, accumulatedContent);

      // Tạo ngữ cảnh tiếp nối: giữ system instruction (nếu có), thêm assistant đã sinh, và user prompt yêu cầu viết tiếp
      const continuationMessages: AiChatMessage[] = [
        ...cleanOptions.messages.filter((m) => m.role === 'system'),
        { role: 'user', content: latestUserPrompt },
        { role: 'assistant', content: accumulatedContent },
        { role: 'user', content: continuationPrompt },
      ];

      const contResult = await executeSingleTurn({
        ...cleanOptions,
        messages: sanitizeChatHistory(continuationMessages),
        max_tokens: cleanOptions.max_tokens ?? 8192,
      });

      lastFinishReason = contResult.finishReason;

      // Ghép chuỗi thông minh, loại bỏ trùng lặp
      accumulatedContent = mergeContinuation(accumulatedContent, contResult.content);

      // Nếu lần tiếp nối kết thúc trọn vẹn thì dừng sớm
      if (!isTextIncomplete(accumulatedContent, lastFinishReason, latestUserPrompt)) {
        break;
      }
    } catch (contErr) {
      console.warn(`[AI-Provider] Lượt auto-continuation thứ ${continuationCount} gặp lỗi:`, contErr);
      break; // Giữ lại nội dung tốt nhất đã có
    }
  }

  const stillIncomplete = isTextIncomplete(accumulatedContent, lastFinishReason, latestUserPrompt);

  return {
    content: accumulatedContent,
    modelUsed,
    finishReason: lastFinishReason,
    isTruncated: stillIncomplete,
  };
}

/**
 * Khởi tạo Chat Completion Stream với Cascade Fallback cho Streaming
 */
export async function callAiChatStream(
  options: AiCompletionOptions
): Promise<{ stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>; modelUsed: string }> {
  const sanitizedMessages = sanitizeChatHistory(options.messages);
  const cleanOptions: AiCompletionOptions = {
    ...options,
    messages: sanitizedMessages.length > 0 ? sanitizedMessages : options.messages,
    max_tokens: options.max_tokens ?? 8192,
  };

  const { apiKey: groqKey, envModel: groqModel, baseUrl: groqBaseUrl } = getAiConfig();

  // 1. Thử stream trực tiếp qua Groq nếu có Groq key
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey, baseURL: groqBaseUrl });
      let candidateList = await buildCandidateList(groqKey, groqBaseUrl, cleanOptions.preferredModel, groqModel);
      let hasTriedDiscovery = false;

      for (let i = 0; i < candidateList.length; i++) {
        const currentModel = candidateList[i];
        const isHighCapacity = HIGH_CAPACITY_MODELS.has(currentModel);
        const maxTokens = cleanOptions.max_tokens ?? (isHighCapacity ? 8192 : 4096);

        try {
          const stream = await groq.chat.completions.create(
            {
              model: currentModel,
              messages: cleanOptions.messages,
              temperature: cleanOptions.temperature ?? 0.3,
              max_tokens: maxTokens,
              stream: true,
            },
            {
              signal: AbortSignal.timeout(15000),
            }
          );

          cachedWorkingModel = currentModel;
          return { stream, modelUsed: currentModel };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const status = (err as { status?: number })?.status;
          console.warn(`[AI-Provider Stream] Model Groq "${currentModel}" thất bại (HTTP ${status || 'err'}): ${errMsg}`);

          const isModelNotFound =
            status === 404 ||
            errMsg.includes('model_not_found') ||
            errMsg.includes('does not exist');

          if (isModelNotFound && !hasTriedDiscovery) {
            hasTriedDiscovery = true;
            try {
              const discovered = await discoverAvailableModels(groqKey, groqBaseUrl);
              for (const dm of discovered) {
                if (!candidateList.includes(dm)) {
                  candidateList.push(dm);
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch (groqStreamErr) {
      console.warn('[AI-Provider Stream] Groq stream thất bại, chuyển sang fallback:', groqStreamErr);
    }
  }

  // 2. Fallback streaming qua Gemini hoặc Free AI Gateway (giữ auto-continuation)
  const { content, modelUsed } = await callAiChatCompletion(cleanOptions);
  async function* mockChunkStream() {
    const parts = content.split(' ');
    for (let i = 0; i < parts.length; i++) {
      const part = (i === 0 ? '' : ' ') + parts[i];
      yield {
        id: 'chunk-' + i,
        choices: [
          {
            delta: { content: part },
            index: 0,
            finish_reason: i === parts.length - 1 ? 'stop' : null,
          },
        ],
      } as unknown as Groq.Chat.Completions.ChatCompletionChunk;
    }
  }

  return { stream: mockChunkStream(), modelUsed: `${modelUsed}-stream` };
}
