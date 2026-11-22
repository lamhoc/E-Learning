import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAiChatCompletion } from '@/lib/ai-provider';
import { convertMarkdownTablesToLines } from '@/lib/anti-table-processor';

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

  const systemPrompt = `Bạn là Gia sư AI thông minh và toàn năng trên nền tảng Mầm Học (Đại học Lạc Hồng).
Bạn hoạt động như một trợ lý AI chat tổng quát (tương tự ChatGPT / Google Gemini), có khả năng hiểu và giải quyết xuất sắc MỌI yêu cầu mà ${isTeacher ? 'giảng viên' : 'người dùng (giảng viên hoặc sinh viên)'} đưa ra:
- Mọi môn học và lĩnh vực: Toán, Lý, Hóa, Sinh, Sử, Địa, Văn, Tiếng Anh, Kinh tế, Luật, Công nghệ thông tin, Kỹ năng mềm, Kiến thức tổng hợp, Khoa học & Đời sống...
- Mọi dạng tác vụ: Giải đáp thắc mắc, giải bài tập từng bước, viết/sửa code, soạn giáo án/slide/kịch bản video, tóm tắt văn bản, dịch thuật, viết email/báo cáo, lên kế hoạch học tập, brainstorm ý tưởng, tạo đề kiểm tra/rubric (khi được yêu cầu), hoặc trò chuyện tự nhiên.

QUY TẮC CẤM XUẤT BẢNG TUYỆT ĐỐI:
- TUYỆT ĐỐI KHÔNG sử dụng bảng Markdown (| ... |, |---|---|) trong câu trả lời cho các yêu cầu tạo câu hỏi, giải bài tập, lập kế hoạch, soạn giáo án, viết kịch bản hay giải thích kiến thức (CHỈ dùng bảng khi người dùng gõ rõ cụm từ "lập bảng").

QUY TẮC TRÌNH BÀY CHI TIẾT TỪNG DÒNG:
1. Mọi nội dung phải được tách dòng rõ ràng, thoáng mắt, có khoảng trắng giữa các ý.
2. Khi tạo câu hỏi trắc nghiệm (ví dụ: "10 câu trắc nghiệm Toán lớp 10"), BẮT BUỘC trình bày từng câu theo bố cục dọc đầy đủ (mỗi phương án A, B, C, D nằm trên 1 DÒNG RIÊNG BIỆT, bắt buộc có Đáp án đúng và Giải thích chi tiết từng bước):
   ### Câu 1: [Nội dung câu hỏi kèm công thức KaTeX $...$ nếu có]
   - **A.** [Phương án A]
   - **B.** [Phương án B]
   - **C.** [Phương án C]
   - **D.** [Phương án D]

   **Đáp án đúng:** [A/B/C/D]
   **Giải thích chi tiết:** [Lời giải từng bước]
3. Trình bày Markdown sạch đẹp, bọc công thức toán học/khoa học trong dấu $...$ cho công thức nằm trong dòng và $$...$$ cho công thức nằm trên dòng riêng. Tuyệt đối không dùng \\(...\\) hay \\[...\\].
4. Ghi nhớ toàn bộ ngữ cảnh các tin nhắn trước đó trong cùng cuộc trò chuyện để phản hồi liền mạch.`;

  const aiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-16).map((m, idx, arr) => {
      // Ở tin nhắn cuối cùng của user, nối thêm lời nhắc cấm xuất bảng
      if (idx === arr.length - 1 && m.role === 'user') {
        return {
          role: 'user' as const,
          content: `${m.content}\n\n[Lưu ý bắt buộc: Tuyệt đối không xuất bảng Markdown; trình bày chi tiết từng dòng, mỗi phương án A, B, C, D trên 1 dòng riêng kèm Đáp án đúng và Giải thích chi tiết!]`,
        };
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    }),
  ];

  // 3. Gọi AI qua ai-provider trung tâm với cơ chế Đa Cổng (Cổng 1 Gemini -> Cổng 2 Groq -> Cổng 3 Free AI Gateway)
  try {
    const { content: reply } = await callAiChatCompletion({
      messages: aiMessages,
      temperature: 0.35,
      max_tokens: 4096,
    });

    if (reply) {
      // Áp dụng bộ lọc Anti-Table Post-Processor để chặn 100% bảng bị lọt ra JSON
      const cleanReply = convertMarkdownTablesToLines(reply);
      return NextResponse.json({ reply: cleanReply });
    }
  } catch (aiErr) {
    console.warn('[Chat-AI] Tất cả các cổng AI trực tuyến (Gemini, Groq, Free Gateway) đều không khả dụng:', aiErr);
  }

  // Nếu tất cả kết nối mạng đều ngắt hoàn toàn: Thông báo lỗi thân thiện để người dùng thử lại
  return NextResponse.json(
    {
      error: 'Hiện không thể kết nối tới máy chủ AI. Vui lòng kiểm tra kết nối mạng và nhấn "Thử gửi lại".',
    },
    { status: 503 }
  );
}
