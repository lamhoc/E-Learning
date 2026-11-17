import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAiChatCompletion } from '@/lib/ai-provider';
import { generateSmartAcademicResponse } from '@/lib/academic-fallback-responder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_MESSAGES = 25;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 });
  }

  // 1. Chuẩn hóa Input Payload linh hoạt: nhận cả { messages: [...] } lẫn { message: "...", history: [...] }
  const rawInput = body as {
    messages?: unknown;
    message?: unknown;
    history?: unknown;
  } | null;

  let rawList: unknown[] = [];

  if (Array.isArray(rawInput?.messages)) {
    rawList = rawInput.messages;
  } else if (typeof rawInput?.message === 'string' && rawInput.message.trim()) {
    if (Array.isArray(rawInput?.history)) {
      rawList = [...rawInput.history, { role: 'user', content: rawInput.message }];
    } else {
      rawList = [{ role: 'user', content: rawInput.message }];
    }
  }

  if (rawList.length === 0 || rawList.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'Danh sách tin nhắn không hợp lệ hoặc vượt quá giới hạn.' },
      { status: 400 }
    );
  }

  const messages: ChatMessage[] = [];
  for (const item of rawList) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('role' in item) ||
      !('content' in item) ||
      (item.role !== 'user' && item.role !== 'assistant') ||
      typeof item.content !== 'string' ||
      item.content.trim().length === 0 ||
      item.content.length > MAX_MESSAGE_LENGTH
    ) {
      continue;
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }

  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json(
      { error: 'Tin nhắn cuối cùng phải là tin nhắn từ người dùng.' },
      { status: 400 }
    );
  }

  const latestUserMessage = messages[messages.length - 1].content;

  // 2. Xác định vai trò người dùng (Giảng viên / Sinh viên) để cá nhân hóa System Prompt
  let userRole: 'teacher' | 'admin' | 'student' = 'student';
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: roleRecord } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleRecord?.role === 'teacher' || roleRecord?.role === 'admin') {
        userRole = roleRecord.role;
      }
    }
  } catch (authErr) {
    // Không làm gián đoạn luồng chat nếu lỗi session
    console.warn('[Chat-AI] Bỏ qua kiểm tra session:', authErr);
  }

  const isTeacher = userRole === 'teacher' || userRole === 'admin';

  const systemPrompt = isTeacher
    ? 'Bạn là Trợ lý Học thuật & Khảo thí AI cấp cao dành cho Giảng viên Đại học Lạc Hồng (LHU). Nhiệm vụ của bạn là hỗ trợ giảng viên biên soạn đề cương, thiết kế ngân hàng câu hỏi trắc nghiệm và tự luận chất lượng cao, xây dựng thang điểm và rubric chấm chi tiết, giải thích thuật toán, phân tích code và giải toán đại cương/chuyên ngành. Mọi công thức Toán học, Vật lý và Khoa học hãy dùng cú pháp KaTeX: $...$ cho công thức nằm trong dòng và $$...$$ cho công thức riêng dòng. Trình bày khoa học, chuẩn xác, tiếng Việt sư phạm chuẩn mực.'
    : 'Bạn là Gia sư AI tận tâm dành cho Sinh viên Đại học Lạc Hồng (LHU). Giải thích rõ ràng bằng tiếng Việt, ân cần, kiên nhẫn, gợi mở tư duy từng bước để sinh viên tự hiểu bản chất bài toán. Khi sinh viên yêu cầu "Tạo X câu hỏi..." hoặc "ôn tập...", bạn BẮT BUỘC biên soạn đúng số lượng câu hỏi trắc nghiệm (mỗi câu có đề bài, 4 phương án A-B-C-D, đáp án đúng và lời giải chi tiết từng bước bằng KaTeX $...$). Mọi công thức Toán học, Vật lý và Khoa học hãy dùng cú pháp KaTeX: $...$ cho công thức nằm trong dòng và $$...$$ cho công thức riêng dòng. Trình bày Markdown sạch đẹp, khoa học.';

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  // 3. Gọi AI qua ai-provider trung tâm (Hỗ trợ Dynamic Discovery & Cascade Fallback)
  if (apiKey) {
    try {
      const { content: reply } = await callAiChatCompletion({
        messages: groqMessages,
        temperature: 0.4,
        max_tokens: 4096,
      });

      if (reply) {
        return NextResponse.json({ reply });
      }
    } catch (aiErr) {
      console.warn('[Chat-AI] AI Provider thất bại, chuyển sang Smart Academic Fallback:', aiErr);
    }
  }

  // === LỚP 3: Smart Academic Fallback (Đảm bảo 100% luôn phản hồi học thuật thật chính xác) ===
  const fallbackReply = generateSmartAcademicResponse(latestUserMessage, isTeacher);
  return NextResponse.json({ reply: fallbackReply });
}
