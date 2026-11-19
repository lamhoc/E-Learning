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

// Danh sách các model Groq theo thứ tự ưu tiên giảm dần
const DEFAULT_CANDIDATE_MODELS: string[] = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
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
 */
export async function callGoogleGeminiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  const { apiKey, envModel } = getGeminiConfig();
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY.');
  }

  // Tách system message và user/assistant message
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

  // Gemini yêu cầu lượt đầu tiên trong contents phải là user
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

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.35,
      maxOutputTokens: options.max_tokens ?? 4096,
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
        signal: AbortSignal.timeout(25000),
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
        }>;
      };

      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      const cleanText = stripThinkingTags(rawText);

      if (cleanText) {
        return { content: cleanText, modelUsed: `google/${model}` };
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
 * Cổng 3: Cổng AI dự phòng trực tuyến miễn phí (Free AI Gateway)
 * Sử dụng endpoint tương thích chuẩn OpenAI Chat Completions không yêu cầu API key.
 * Đảm bảo hệ thống luôn phản hồi AI thật 100% theo thời gian thực kể cả khi chưa cấu hình API key.
 */
export async function callFreeAiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
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
      signal: AbortSignal.timeout(25000), // 25s timeout cho mạng chậm
    });

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawText = json?.choices?.[0]?.message?.content?.trim() ?? '';
      const cleanText = stripThinkingTags(rawText);

      if (cleanText) {
        return { content: cleanText, modelUsed: 'pollinations-free-openai' };
      }
    } else {
      console.warn(`[AI-Provider] Free AI OpenAI POST trả về HTTP ${res.status}, chuyển sang thử direct POST/GET fallback.`);
    }
  } catch (postErr) {
    console.warn('[AI-Provider] Free AI OpenAI POST thất bại, chuyển sang thử direct POST/GET fallback:', postErr);
  }

  // 2. Thử Direct POST endpoint của Pollinations (hỗ trợ đầy đủ messages, không yêu cầu credit)
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
      signal: AbortSignal.timeout(25000),
    });

    if (directPostRes.ok) {
      const rawText = (await directPostRes.text()).trim();
      const cleanText = stripThinkingTags(rawText);
      if (cleanText && !cleanText.startsWith('<!DOCTYPE') && !cleanText.startsWith('<html')) {
        return { content: cleanText, modelUsed: 'pollinations-free-direct-post' };
      }
    } else {
      console.warn(`[AI-Provider] Free AI Direct POST trả về HTTP ${directPostRes.status}`);
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
        signal: AbortSignal.timeout(20000),
      });

      if (resGet.ok) {
        const rawText = (await resGet.text()).trim();
        const cleanText = stripThinkingTags(rawText);
        if (cleanText && !cleanText.startsWith('<!DOCTYPE') && !cleanText.startsWith('<html')) {
          return { content: cleanText, modelUsed: 'pollinations-free-get' };
        }
      }
    }
  } catch (getErr) {
    console.warn('[AI-Provider] Free AI GET fallback thất bại:', getErr);
  }

  throw new Error('Cổng Free AI Gateway trực tuyến không phản hồi.');
}

/**
 * Gọi chat completion với cơ chế Đa Cổng Chuẩn Gemini (Multi-Provider Cascade):
 * - Cổng 1: Google Gemini REST API chính thức (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 * - Cổng 2: Groq Cloud LLM với Dynamic Discovery & Candidate Cascade (Llama 3.3, Scout 17B, Qwen 3...)
 * - Cổng 3: Cổng AI Trực Tuyến Miễn Phí (Pollinations POST/GET)
 * - Cổng 4: Offline Smart Academic Fallback (Caller tự động kích hoạt khi mất mạng)
 */
export async function callAiChatCompletion(options: AiCompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  // =========================================================================
  // CỔNG 1: Google Gemini REST API chính thức (Nếu có cấu hình key)
  // =========================================================================
  const { apiKey: geminiKey } = getGeminiConfig();
  if (geminiKey) {
    try {
      const geminiResult = await callGoogleGeminiChatCompletion(options);
      return geminiResult;
    } catch (geminiErr) {
      console.warn('[AI-Provider] Cổng 1 Google Gemini gặp sự cố, tự động chuyển sang Cổng 2 Groq:', geminiErr);
    }
  }

  // =========================================================================
  // CỔNG 2: Groq Cloud LLM (Nếu có API Key)
  // =========================================================================
  const { apiKey: groqKey, envModel: groqModel, baseUrl: groqBaseUrl } = getAiConfig();
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey, baseURL: groqBaseUrl });
      let candidateList = await buildCandidateList(groqKey, groqBaseUrl, options.preferredModel, groqModel);
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
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[AI-Provider] Model Groq "${currentModel}" thất bại: ${errMsg}`);

          const isModelNotFound =
            errMsg.includes('model_not_found') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('decommissioned') ||
            errMsg.includes('not have access') ||
            (err as { status?: number })?.status === 404;

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
    } catch (groqErr) {
      console.warn('[AI-Provider] Groq API gặp sự cố, tự động chuyển sang Cổng 3 Free AI Gateway:', groqErr);
    }
  }

  // =========================================================================
  // CỔNG 3: Cổng AI Trực Tuyến Miễn Phí (Không cần key)
  // =========================================================================
  try {
    const freeAi = await callFreeAiChatCompletion(options);
    return freeAi;
  } catch (freeAiErr) {
    console.warn('[AI-Provider] Cổng 3 Free AI Gateway không phản hồi (có thể do mất kết nối mạng):', freeAiErr);
  }

  throw new Error('Tất cả các cổng AI trực tuyến (Gemini, Groq và Free Gateway) đều không phản hồi.');
}

/**
 * Khởi tạo Chat Completion Stream với Cascade Fallback cho Streaming
 */
export async function callAiChatStream(
  options: AiCompletionOptions
): Promise<{ stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>; modelUsed: string }> {
  const { apiKey: groqKey, envModel: groqModel, baseUrl: groqBaseUrl } = getAiConfig();

  // 1. Thử stream trực tiếp qua Groq nếu có Groq key
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey, baseURL: groqBaseUrl });
      let candidateList = await buildCandidateList(groqKey, groqBaseUrl, options.preferredModel, groqModel);
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
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[AI-Provider Stream] Model Groq "${currentModel}" thất bại: ${errMsg}`);

          const isModelNotFound =
            errMsg.includes('model_not_found') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('decommissioned') ||
            (err as { status?: number })?.status === 404;

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

  // 2. Fallback streaming qua Gemini hoặc Free AI Gateway
  const { content, modelUsed } = await callAiChatCompletion(options);
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

  return { stream: mockChunkStream(), modelUsed: `${modelUsed}-stream` };
}
