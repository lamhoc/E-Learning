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
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'gemma2-9b-it',
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
 * Lớp 2: Cổng AI dự phòng trực tuyến miễn phí (Free AI Gateway)
 * Sử dụng endpoint tương thích chuẩn OpenAI Chat Completions không yêu cầu API key.
 * Đảm bảo hệ thống luôn phản hồi AI thật 100% theo thời gian thực kể cả khi chưa cấu hình GROQ_API_KEY.
 */
export async function callFreeAiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  const endpoint = 'https://text.pollinations.ai/openai/chat/completions';

  const payload = {
    model: 'openai',
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.3,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000), // 25s timeout cho mạng chậm
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Free AI Gateway phản hồi lỗi HTTP ${res.status}: ${errorText.slice(0, 150)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawText = json?.choices?.[0]?.message?.content?.trim() ?? '';
  const cleanText = stripThinkingTags(rawText);

  if (!cleanText) {
    throw new Error('Free AI Gateway trả về phản hồi rỗng.');
  }

  return { content: cleanText, modelUsed: 'pollinations-free-openai' };
}

/**
 * Gọi chat completion với cơ chế Đa Tầng Dự Phòng (3 Lớp):
 * - Lớp 1: Groq API với Dynamic Discovery & Candidate Cascade
 * - Lớp 2: Cổng AI Trực Tuyến Miễn Phí (Không cần key)
 * - Lớp 3: Caller tự động chuyển sang Offline Smart Academic Fallback
 */
export async function callAiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  const { apiKey, envModel, baseUrl } = getAiConfig();

  // =========================================================================
  // LỚP 1: Thử gọi Groq API nếu có API Key
  // =========================================================================
  if (apiKey) {
    try {
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
    } catch (groqErr) {
      console.warn('[AI-Provider] Groq API gặp sự cố, tự động chuyển sang Lớp 2 Free AI Gateway:', groqErr);
    }
  }

  // =========================================================================
  // LỚP 2: Cổng AI Trực Tuyến Miễn Phí (Không cần key)
  // =========================================================================
  try {
    const freeAi = await callFreeAiChatCompletion(options);
    return freeAi;
  } catch (freeAiErr) {
    console.warn('[AI-Provider] Lớp 2 Free AI Gateway không phản hồi (có thể do mất kết nối mạng):', freeAiErr);
  }

  throw new Error('Tất cả các cổng AI trực tuyến (Groq và Free Gateway) đều không phản hồi.');
}

/**
 * Khởi tạo Chat Completion Stream với Cascade Fallback cho Streaming
 */
export async function callAiChatStream(
  options: AiCompletionOptions
): Promise<{ stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>; modelUsed: string }> {
  const { apiKey, envModel, baseUrl } = getAiConfig();

  if (apiKey) {
    try {
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
    } catch (groqStreamErr) {
      console.warn('[AI-Provider Stream] Groq stream thất bại, chuyển sang fallback chunked:', groqStreamErr);
    }
  }

  // Fallback streaming giả lập qua Free AI hoàn chỉnh
  const { content } = await callFreeAiChatCompletion(options);
  async function* mockChunkStream() {
    // Tách thành từng từ hoặc dòng để stream tự nhiên
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

  return { stream: mockChunkStream(), modelUsed: 'pollinations-free-stream' };
}
