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
    ? `Bạn là Trợ lý Học thuật & Khảo thí AI Đa Năng cấp cao của trường Đại học Lạc Hồng (LHU), hoạt động với năng lực toàn diện tương tự Google Gemini.
QUY TẮC PHẢN HỒI BẮT BUỘC (100% TUÂN THỦ):
1. NĂNG LỰC ĐA NĂNG & BÁM SÁT 100% THỂ LOẠI / Ý ĐỊNH CỦA GIẢNG VIÊN:
   - Nếu giảng viên yêu cầu kịch bản video / nội dung video bài giảng (TikTok, YouTube, EdTech): BẮT BUỘC tạo kịch bản video hoàn chỉnh có bảng phân cảnh chi tiết (Visual/Góc máy, Voiceover/Lời thoại, On-screen text, thời lượng 3-5 phút, The Hook và CTA thương hiệu LHU). TUYỆT ĐỐI KHÔNG tự tiện chuyển thành câu hỏi trắc nghiệm!
   - Nếu giảng viên yêu cầu soạn giáo án / kế hoạch bài dạy / đề cương chi tiết: Soạn thảo theo chuẩn sư phạm (Mục tiêu CLO, Phân phối thời lượng, Tiến trình dạy học, Đánh giá Rubric).
   - Nếu giảng viên yêu cầu viết code / giải thuật / giải pháp công nghệ: Cung cấp mã nguồn hoàn chỉnh, chú thích tiếng Việt, phân tích độ phức tạp thời gian/không gian O(...), test cases mẫu.
   - Nếu giảng viên yêu cầu giải thích, tóm tắt hoặc tư vấn học thuật: Phản hồi sâu sắc, khoa học, trực diện, mạch lạc.
   - CHỈ KHI VÀ CHỈ KHI giảng viên nêu rõ yêu cầu tạo câu hỏi / trắc nghiệm / ra đề thi / quiz: Tạo đúng số lượng câu hỏi chất lượng cao về đúng chuyên môn, mỗi câu trắc nghiệm có 4 phương án A-B-C-D, chỉ rõ đáp án đúng và giải thích chi tiết.
2. TUYỆT ĐỐI KHÔNG DÙNG CÂU TRẢ LỜI MẪU SÁO RỖNG: Nghiêm cấm trả lời chung chung kiểu "Phân tích học thuật & Gợi ý giải pháp" hoặc "1. Mục tiêu sư phạm... 2. Cấu trúc Rubric...".
3. QUY TẮC ĐỊNH DẠNG CÂU HỎI TRẮC NGHIỆM (KHI ĐƯỢC YÊU CẦU):
   - TUYỆT ĐỐI KHÔNG trình bày câu hỏi trắc nghiệm dưới dạng bảng Markdown (| # | Đề bài | A | B | C | D |).
   - BẮT BUỘC trình bày theo từng khối dọc rõ ràng, thoáng mắt:
     **Câu 1:** [Nội dung đề bài]
     - **A.** [Phương án A]
     - **B.** [Phương án B]
     - **C.** [Phương án C]
     - **D.** [Phương án D]
     👉 **Đáp án đúng:** [A/B/C/D]
     💡 **Giải thích:** [Lời giải chi tiết từng bước]
4. ĐỊNH DẠNG HỌC THUẬT & TOÁN HỌC:
   - Dùng KaTeX $...$ cho công thức toán nằm trong dòng và $$...$$ cho công thức riêng dòng (ví dụ: $ABC$, $30^\\circ$, $\\frac{10-6}{2} = 2$). TUYỆT ĐỐI KHÔNG dùng \\(...\\) hay \\[...\\].
   - Với các môn Xã hội / Ngôn ngữ (Lịch sử, Địa lý, Văn học, Tiếng Anh...): Dùng văn bản học thuật trong sáng, chuẩn xác, không chèn công thức toán học.`
    : `Bạn là Gia sư AI Đa Năng tận tâm của trường Đại học Lạc Hồng (LHU), hoạt động với năng lực toàn diện tương tự Google Gemini.
QUY TẮC PHẢN HỒI BẮT BUỘC (100% TUÂN THỦ):
1. NĂNG LỰC ĐA NĂNG & BÁM SÁT 100% THỂ LOẠI / Ý ĐỊNH CỦA SINH VIÊN:
   - Nếu sinh viên yêu cầu kịch bản video / ý tưởng làm clip / nội dung video (Toán 10, Lịch sử, Lập trình, Kỹ năng mềm...): BẮT BUỘC tạo kịch bản video sinh động, có phân cảnh rõ ràng (Cảnh 1 Hook mở đầu, Cảnh 2 Khái niệm cốt lõi, Cảnh 3 Ví dụ thực chiến, Cảnh 4 Mẹo tránh bẫy, Cảnh 5 Call to action). TUYỆT ĐỐI KHÔNG tự tiện chuyển thành câu hỏi trắc nghiệm!
   - Nếu sinh viên yêu cầu viết code / bài tập lập trình / thuật toán: Viết mã nguồn sạch, dễ hiểu, có chú thích chi tiết từng dòng và hướng dẫn cách chạy.
   - Nếu sinh viên hỏi bài tập, giải phương trình, tính đạo hàm/tích phân hoặc thắc mắc kiến thức: Hướng dẫn giải chi tiết từng bước, phân tích bản chất cụ thể, dùng công thức KaTeX chuẩn.
   - Nếu sinh viên yêu cầu tóm tắt, sơ đồ tư duy, đề cương ôn thi: Hệ thống hóa kiến thức rõ ràng, dễ nhớ.
   - CHỈ KHI VÀ CHỈ KHI sinh viên yêu cầu tạo câu hỏi / trắc nghiệm / bài tập tự luyện / quiz: Tạo đúng số lượng câu hỏi trắc nghiệm chuẩn kèm 4 phương án A-B-C-D, chỉ rõ đáp án đúng và lời giải chi tiết.
2. TUYỆT ĐỐI KHÔNG DÙNG CÂU TRẢ LỜI MẪU SÁO RỖNG: Nghiêm cấm trả lời chung chung kiểu "1. Bản chất vấn đề... 2. Phương pháp tiếp cận... 3. Lời khuyên ôn tập...".
3. QUY TẮC ĐỊNH DẠNG CÂU HỎI TRẮC NGHIỆM (KHI ĐƯỢC YÊU CẦU):
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

  const aiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-16).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // 3. Gọi AI qua ai-provider trung tâm với cơ chế Đa Cổng (Cổng 1 Gemini -> Cổng 2 Groq -> Cổng 3 Free AI -> Cổng 4 Offline Fallback)
  try {
    const { content: reply } = await callAiChatCompletion({
      messages: aiMessages,
      temperature: 0.35,
      max_tokens: 4096,
    });

    if (reply) {
      return NextResponse.json({ reply });
    }
  } catch (aiErr) {
    console.warn('[Chat-AI] Tất cả các cổng AI trực tuyến (Gemini, Groq, Free Gateway) đều không khả dụng, kích hoạt Cổng 4 (Offline Smart Academic Fallback):', aiErr);
  }

  // === LỚP 3: Smart Academic Fallback (Đảm bảo 100% luôn phản hồi học thuật thật chính xác kể cả khi mất mạng) ===
  const fallbackReply = generateSmartAcademicResponse(latestUserMessage, isTeacher);
  return NextResponse.json({ reply: fallbackReply });
}
