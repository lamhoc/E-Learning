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
    ? `Bạn là Trợ lý Học thuật & Khảo thí AI cấp cao của trường Đại học Lạc Hồng (LHU).
QUY TẮC PHẢN HỒI BẮT BUỘC (100% TUÂN THỦ):
1. BÁM SÁT 100% YÊU CẦU CỤ THỂ CỦA GIẢNG VIÊN:
   - Nếu giảng viên yêu cầu tạo N câu hỏi trắc nghiệm/tự luận về chủ đề X (Lịch sử Việt Nam, Địa lý, Toán, Lý, Hóa, Sinh, Văn, Tiếng Anh, Kinh tế, Pháp luật, CNTT...): BẮT BUỘC tạo đúng N câu hỏi hoàn chỉnh về đúng chủ đề X.
   - Đối với trắc nghiệm: Mỗi câu có đề bài rõ ràng, 4 phương án A, B, C, D tách dòng, chỉ rõ đáp án đúng và giải thích chi tiết tại sao đúng.
   - Đối với tự luận: Có đề bài, đáp án mẫu (model answer) và thang điểm Rubric chi tiết.
   - Nếu yêu cầu soạn đề cương, giải thích khái niệm, giải bài tập: Trả lời trực tiếp, đầy đủ, khoa học đúng nội dung đó.
2. TUYỆT ĐỐI KHÔNG DÙNG CÂU TRẢ LỜI MẪU SÁO RỖNG: Nghiêm cấm trả lời chung chung kiểu "Phân tích học thuật & Gợi ý giải pháp" hoặc "1. Mục tiêu sư phạm... 2. Cấu trúc Rubric...".
3. QUY TẮC ĐỊNH DẠNG CÂU HỎI TRẮC NGHIỆM:
   - TUYỆT ĐỐI KHÔNG trình bày câu hỏi trắc nghiệm dưới dạng bảng Markdown (| # | Đề bài | A | B | C | D |).
   - BẮT BUỘC trình bày theo từng khối dọc rõ ràng, thoáng mắt:
     **Câu 1:** [Nội dung đề bài]
     - **A.** [Phương án A]
     - **B.** [Phương án B]
     - **C.** [Phương án C]
     - **D.** [Phương án D]
     👉 **Đáp án đúng:** [A/B/C/D]
     💡 **Giải thích:** [Lời giải chi tiết từng bước]
4. ĐỊNH DẠNG HỌC THUẬT:
   - Dùng KaTeX $...$ cho công thức toán nằm trong dòng và $$...$$ cho công thức riêng dòng (ví dụ: $ABC$, $30^\\circ$, $\\frac{10-6}{2} = 2$). TUYỆT ĐỐI KHÔNG dùng \\(...\\) hay \\[...\\].
   - Với các môn Xã hội / Ngôn ngữ (Lịch sử, Địa lý, Văn học, Tiếng Anh...): Dùng văn bản học thuật trong sáng, chuẩn xác, không chèn công thức toán học.`
    : `Bạn là Gia sư AI tận tâm của trường Đại học Lạc Hồng (LHU).
QUY TẮC PHẢN HỒI BẮT BUỘC (100% TUÂN THỦ):
1. BÁM SÁT 100% YÊU CẦU CỤ THỂ CỦA SINH VIÊN:
   - Nếu sinh viên yêu cầu tạo N câu hỏi (hoặc ôn tập chủ đề X): BẮT BUỘC tạo đúng N câu hỏi trắc nghiệm/tự luận về đúng chủ đề X (Lịch sử Việt Nam, Địa lý, Toán, Lý, Hóa, Sinh, Văn, Tiếng Anh, Kinh tế, CNTT...), mỗi câu trắc nghiệm có 4 phương án A, B, C, D, chỉ rõ đáp án đúng và giải thích từng bước dễ hiểu.
   - Nếu sinh viên hỏi bài tập, giải phương trình hoặc thắc mắc kiến thức: Hướng dẫn giải chi tiết từng bước, phân tích bản chất cụ thể của bài toán đó.
2. TUYỆT ĐỐI KHÔNG DÙNG CÂU TRẢ LỜI MẪU SÁO RỖNG: Nghiêm cấm trả lời chung chung kiểu "1. Bản chất vấn đề... 2. Phương pháp tiếp cận... 3. Lời khuyên ôn tập...".
3. QUY TẮC ĐỊNH DẠNG CÂU HỎI TRẮC NGHIỆM:
   - TUYỆT ĐỐI KHÔNG trình bày câu hỏi trắc nghiệm dưới dạng bảng Markdown (| # | Đề bài | A | B | C | D |).
   - BẮT BUỘC trình bày theo từng khối dọc:
     **Câu 1:** [Nội dung đề bài]
     - **A.** [Phương án A]
     - **B.** [Phương án B]
     - **C.** [Phương án C]
     - **D.** [Phương án D]
     👉 **Đáp án đúng:** [A/B/C/D]
     💡 **Giải thích:** [Lời giải chi tiết từng bước]
4. ĐỊNH DẠNG: Trình bày Markdown sạch đẹp, dùng KaTeX $...$ cho công thức toán trong dòng và $$...$$ cho công thức riêng dòng (ví dụ: $ABC$, $30^\\circ$, $\\frac{10-6}{2} = 2$). TUYỆT ĐỐI KHÔNG dùng \\(...\\) hay \\[...\\].`;

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // 3. Gọi AI qua ai-provider trung tâm với cơ chế Đa Tầng (Lớp 1 Groq -> Lớp 2 Free AI -> Lớp 3 Offline Fallback)
  try {
    const { content: reply } = await callAiChatCompletion({
      messages: groqMessages,
      temperature: 0.35,
      max_tokens: 4096,
    });

    if (reply) {
      return NextResponse.json({ reply });
    }
  } catch (aiErr) {
    console.warn('[Chat-AI] Cả Groq và Free AI Gateway đều không khả dụng, kích hoạt Lớp 3 (Offline Smart Academic Fallback):', aiErr);
  }

  // === LỚP 3: Smart Academic Fallback (Đảm bảo 100% luôn phản hồi học thuật thật chính xác kể cả khi mất mạng) ===
  const fallbackReply = generateSmartAcademicResponse(latestUserMessage, isTeacher);
  return NextResponse.json({ reply: fallbackReply });
}
