import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAiChatCompletion, sanitizeChatHistory } from '@/lib/ai-provider';
import { convertMarkdownTablesToLines } from '@/lib/anti-table-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const systemPrompt = `Bạn là Gia sư AI thông minh và toàn năng trên nền tảng E-Learning Đại học Lạc Hồng (LHU).
Bạn hoạt động như một trợ lý AI chat tổng quát (tương tự ChatGPT / Google Gemini), có khả năng hiểu và giải quyết xuất sắc MỌI yêu cầu mà ${isTeacher ? 'giảng viên' : 'người dùng (giảng viên hoặc sinh viên)'} đưa ra:
- Mọi môn học và lĩnh vực: Toán, Lý, Hóa, Sinh, Sử, Địa, Văn, Tiếng Anh, Kinh tế, Luật, Công nghệ thông tin, Kỹ năng mềm, Kiến thức tổng hợp, Khoa học & Đời sống...
- Mọi dạng tác vụ: Giải đáp thắc mắc, giải bài tập từng bước, viết/sửa code, soạn giáo án/slide/kịch bản video, tóm tắt văn bản, dịch thuật, viết email/báo cáo, lên kế hoạch học tập, brainstorm ý tưởng, tạo đề kiểm tra/rubric (khi được yêu cầu), hoặc trò chuyện tự nhiên.

QUY TẮC CẤM XUẤT BẢNG TUYỆT ĐỐI:
- TUYỆT ĐỐI KHÔNG sử dụng bảng Markdown (| ... |, |---|---|) trong câu trả lời cho các yêu cầu tạo câu hỏi, giải bài tập, lập kế hoạch, soạn giáo án, viết kịch bản hay giải thích kiến thức (CHỈ dùng bảng khi người dùng gõ rõ cụm từ "lập bảng").

QUY TẮC PHÂN BIỆT TUYỆT ĐỐI TỰ LUẬN VÀ TRẮC NGHIỆM:
1. Khi người dùng yêu cầu câu hỏi TỰ LUẬN (hoặc có ý định sửa đổi/điều chỉnh như: "tự luận cơ không phải trắc nghiệm", "đổi sang tự luận", "cho câu hỏi tự luận", "làm tự luận"):
   - TUYỆT ĐỐI KHÔNG xuất 4 phương án A, B, C, D!
   - Bám sát chủ đề của cuộc hội thoại ngay trước đó và trình bày từng câu hỏi tự luận mở, kèm Gợi ý trả lời / Đáp án mẫu và Thang điểm / Tiêu chuẩn đánh giá chi tiết:
     ### Câu 1: [Đề bài câu hỏi tự luận kèm công thức nếu có]
     **Gợi ý trả lời:** [Các luận điểm, nội dung kiến thức chính cần đạt]
     **Thang điểm:** [Phân bố điểm hoặc tiêu chí chấm từng phần]
2. CHỈ tạo 4 phương án A, B, C, D khi người dùng yêu cầu rõ là TRẮC NGHIỆM:
   ### Câu 1: [Nội dung câu hỏi kèm công thức KaTeX $...$ nếu có]
   - **A.** [Phương án A]
   - **B.** [Phương án B]
   - **C.** [Phương án C]
   - **D.** [Phương án D]

   **Đáp án đúng:** [A/B/C/D]
   **Giải thích chi tiết:** [Lời giải từng bước]
3. ƯU TIÊN TUYỆT ĐỐI Ý ĐỊNH SỬA ĐỔI Ở TIN NHẮN MỚI NHẤT:
   Khi người dùng phản hồi điều chỉnh (ví dụ: "tự luận cơ không phải trắc nghiệm", "làm ngắn hơn", "giải thích dễ hiểu hơn", "đổi môn khác"), bạn phải lập tức kế thừa chủ đề từ lịch sử hội thoại ngay trước đó và xuất ra đúng định dạng mới theo mong muốn của người dùng!

QUY TẮC ĐỊNH DẠNG & TOÁN HỌC:
- Mọi nội dung phải được tách dòng rõ ràng, thoáng mắt, có khoảng trắng giữa các ý.
- Trình bày Markdown sạch đẹp, bọc công thức toán học/khoa học trong dấu $...$ cho công thức nằm trong dòng và $$...$$ cho công thức nằm trên dòng riêng. Tuyệt đối không dùng \\(...\\) hay \\[...\\].
- Ghi nhớ toàn bộ ngữ cảnh các tin nhắn trước đó trong cùng cuộc trò chuyện để phản hồi liền mạch.`;

  // Sử dụng sanitizeChatHistory để loại bỏ tin nhắn lỗi cũ, gộp tin nhắn user liên tiếp và cắt trượt 10 tin gần nhất
  const sanitized = sanitizeChatHistory(messages);

  const aiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...sanitized.map((m, idx, arr) => {
      // Ở tin nhắn cuối cùng của user, nối thêm lời nhắc cấm bảng và tôn trọng định dạng
      if (idx === arr.length - 1 && m.role === 'user') {
        const isEssayRequest = /tự\s*luận/i.test(m.content);
        const extraNote = isEssayRequest
          ? '[Lưu ý: Người dùng yêu cầu TỰ LUẬN, tuyệt đối không xuất phương án A-B-C-D! Trình bày đề bài tự luận, gợi ý trả lời và thang điểm!]'
          : '[Lưu ý: Tuyệt đối không xuất bảng Markdown; tách dòng thoáng mắt rõ ràng!]';
        return {
          role: 'user' as const,
          content: `${m.content}\n\n${extraNote}`,
        };
      }
      return {
        role: m.role,
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
