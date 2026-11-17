import 'server-only';
import Groq from 'groq-sdk';

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
};

// Danh sách các model theo thứ tự ưu tiên giảm dần
const DEFAULT_CANDIDATE_MODELS: string[] = [
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'gemma2-9b-it',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
];

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

// Cache model đang hoạt động tốt trên môi trường hiện tại
let cachedWorkingModel: string | null = null;
let cachedDiscoveredModels: string[] | null = null;
let lastDiscoveryTime = 0;

/**
 * Lấy cấu hình Groq API (key & base url)
 */
export function getAiConfig() {
  const apiKey = (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  const envModel = process.env.GROQ_MODEL?.trim();

  let baseUrl = (process.env.GROQ_BASE_URL || '').trim();
  if (!baseUrl) {
    baseUrl = 'https://api.groq.com/openai/v1';
  }

  return { apiKey, envModel, baseUrl };
}

/**
 * Tự động gọi endpoint GET /models để khám phá danh sách model thực tế tài khoản có quyền truy cập
 */
export async function discoverAvailableModels(apiKey: string, baseUrl: string): Promise<string[]> {
  const now = Date.now();
  // Cache danh sách trong 10 phút
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
      // Hạn chế timeout 5 giây
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[AI-Provider] Không thể lấy danh sách /models (HTTP ${res.status}):`, await res.text());
      return DEFAULT_CANDIDATE_MODELS;
    }

    const json = (await res.json()) as { data?: Array<{ id?: string; active?: boolean }> };
    const rawList = Array.isArray(json?.data) ? json.data : [];

    // Lọc lấy các model text/chat (loại trừ whisper, guard, vision, embedding)
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
      console.log('[AI-Provider] Đã tự động dò tìm các model khả dụng:', chatModels);
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
 * Gọi chat completion với cơ chế Dynamic Discovery và Cascade Fallback an toàn tuyệt đối
 */
export async function callAiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  const { apiKey, envModel, baseUrl } = getAiConfig();

  if (!apiKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY trên server.');
  }

  const groq = new Groq({ apiKey, baseURL: baseUrl });
  let candidateList = await buildCandidateList(apiKey, baseUrl, options.preferredModel, envModel);

  let lastError: unknown = null;
  let hasTriedDiscovery = false;

  for (let i = 0; i < candidateList.length; i++) {
    const currentModel = candidateList[i];
    try {
      const response = await groq.chat.completions.create({
        model: currentModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 4096,
        ...(options.response_format ? { response_format: options.response_format } : {}),
      });

      const rawText = response.choices?.[0]?.message?.content?.trim() ?? '';
      const text = stripThinkingTags(rawText);
      if (text) {
        // Ghi nhận model hoạt động tốt
        cachedWorkingModel = currentModel;
        return { content: text, modelUsed: currentModel };
      }
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI-Provider] Model "${currentModel}" thất bại: ${errMsg}`);

      const isModelNotFound =
        errMsg.includes('model_not_found') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('decommissioned') ||
        errMsg.includes('not have access') ||
        (err as { status?: number })?.status === 404;

      // Nếu gặp lỗi 404 model_not_found và chưa dò tìm động từ /models, thực hiện dò tìm ngay
      if (isModelNotFound && !hasTriedDiscovery) {
        hasTriedDiscovery = true;
        try {
          const discovered = await discoverAvailableModels(apiKey, baseUrl);
          for (const dm of discovered) {
            if (!candidateList.includes(dm)) {
              candidateList.push(dm);
            }
          }
        } catch (discErr) {
          console.warn('[AI-Provider] Không thể khám phá thêm model:', discErr);
        }
      }
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Không thể hoàn tất yêu cầu AI sau khi thử các model [${candidateList.slice(0, 4).join(', ')}...]: ${lastError.message}`
      : 'Không thể kết nối đến mô hình AI khả dụng nào.'
  );
}

/**
 * Khởi tạo Chat Completion Stream với Cascade Fallback cho Streaming
 */
export async function callAiChatStream(
  options: AiCompletionOptions
): Promise<{ stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>; modelUsed: string }> {
  const { apiKey, envModel, baseUrl } = getAiConfig();

  if (!apiKey) {
    throw new Error('Chưa cấu hình GROQ_API_KEY trên server.');
  }

  const groq = new Groq({ apiKey, baseURL: baseUrl });
  let candidateList = await buildCandidateList(apiKey, baseUrl, options.preferredModel, envModel);

  let lastError: unknown = null;
  let hasTriedDiscovery = false;

  for (let i = 0; i < candidateList.length; i++) {
    const currentModel = candidateList[i];
    try {
      const stream = await groq.chat.completions.create({
        model: currentModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 4096,
        stream: true,
      });

      cachedWorkingModel = currentModel;
      return { stream, modelUsed: currentModel };
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI-Provider Stream] Model "${currentModel}" thất bại: ${errMsg}`);

      const isModelNotFound =
        errMsg.includes('model_not_found') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('decommissioned') ||
        (err as { status?: number })?.status === 404;

      if (isModelNotFound && !hasTriedDiscovery) {
        hasTriedDiscovery = true;
        try {
          const discovered = await discoverAvailableModels(apiKey, baseUrl);
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

  throw new Error(
    lastError instanceof Error
      ? `Không thể khởi tạo streaming AI: ${lastError.message}`
      : 'Không thể kết nối dịch vụ AI streaming.'
  );
}
