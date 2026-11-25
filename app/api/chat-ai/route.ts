import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import {
  callAiChatCompletion,
  callAiChatStream,
  sanitizeChatHistory,
} from '@/lib/ai-provider';
import {
  buildContinuationPrompt,
  mergeContinuation,
  isTextIncomplete,
} from '@/lib/ai-continuation';
import { convertMarkdownTablesToLines } from '@/lib/anti-table-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_MESSAGES = 25;
const MAX_MESSAGE_LENGTH = 8000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 });
  }

  // 1. Chuẩn hóa Input Payload linh hoạt
  const rawInput = body as {
    messages?: unknown;
    message?: unknown;
    history?: unknown;
    continueFrom?: unknown;
    stream?: unknown;
  } | null;

  const isStreamRequested =
    rawInput?.stream === true ||
    request.headers.get('accept')?.includes('text/event-stream');

  const continueFromText =
    typeof rawInput?.continueFrom === 'string' && rawInput.continueFrom.trim().length > 0
      ? rawInput.continueFrom.trim()
      : null;

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

  if (messages.length === 0) {
    return NextResponse.json(
      { error: 'Danh sách tin nhắn hợp lệ đang bị rỗng.' },
      { status: 400 }
    );
  }

  // 2. Xác định vai trò người dùng (Giảng viên / Sinh viên) để cá nhân hóa System Prompt
  let userRole: 'teacher' | 'admin' | 'student' = 'student';
  try {
    const ROLE_LOOKUP_TIMEOUT_MS = 1500;
    const resolved = await Promise.race([
      getCurrentUserWithRole(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ROLE_LOOKUP_TIMEOUT_MS)),
    ]);

    if (resolved?.user && (resolved.role === 'teacher' || resolved.role === 'admin')) {
      userRole = resolved.role;
    }
  } catch (authErr) {
    console.warn('[Chat-AI] Bỏ qua kiểm tra session:', authErr);
  }

  const isTeacher = userRole === 'teacher' || userRole === 'admin';

  const systemPrompt = `Bạn là Gia sư AI thông minh và toàn năng trên nền tảng E-Learning Đại học Lạc Hồng (LHU).
Bạn hoạt động như một trợ lý AI chat tổng quát (tương tự ChatGPT / Google Gemini), có khả năng hiểu và giải quyết xuất sắc MỌI yêu cầu mà ${isTeacher ? 'giảng viên' : 'người dùng (giảng viên hoặc sinh viên)'} đưa ra:
- Mọi môn học và lĩnh vực: Toán, Lý, Hóa, Sinh, Sử, Địa, Văn, Tiếng Anh, Kinh tế, Luật, Công nghệ thông tin, Kỹ năng mềm, Kiến thức tổng hợp, Khoa học & Đời sống...
- Mọi dạng tác vụ: Giải đáp thắc mắc, giải bài tập từng bước, viết/sửa code, soạn giáo án/slide/kịch bản video, tóm tắt văn bản, dịch thuật, viết email/báo cáo, lên kế hoạch học tập, brainstorm ý tưởng, tạo đề kiểm tra/rubric (khi được yêu cầu), hoặc trò chuyện tự nhiên.

QUY TẮC CẤM XUẤT BẢNG TUYỆT ĐỐI:
- TUYỆT ĐỐI KHÔNG sử dụng bảng Markdown (| ... |, |---|---|) trong câu trả lời cho các yêu cầu tạo câu hỏi, giải bài tập, lập kế hoạch, soạn giáo án, viết kịch bản hay giải thích kiến thức (CHỈ dùng bảng khi người dùng gõ rõ cụm từ "lập bảng").

QUY TẮC CHUẨN HÓA RUBRIC & THANG ĐIỂM 10 (CHUẨN KHẢO THÍ VIỆT NAM):
1. MẶC ĐỊNH ÁP DỤNG THANG ĐIỂM 10:
   - Khi tạo đề thi, bài kiểm tra hoặc câu hỏi tự luận có phân bổ điểm: Tổng điểm toàn bộ đề thi BẮT BUỘC bằng 10.0 điểm (Ví dụ: Đề 10 câu thì mỗi câu 1.0 điểm; Đề 5 câu thì mỗi câu 2.0 điểm; Đề 2 câu thì phân bổ 5.0 - 5.0 hoặc 4.0 - 6.0). Tuyệt đối không tự bịa thang điểm 30 hay 100 trừ khi người dùng yêu cầu rõ.
   - Nếu là 1 câu hỏi tự luận đơn lẻ: Điểm thành phần các tiêu chí nhỏ phải cộng lại đúng bằng điểm của câu đó (ví dụ câu 2.0 điểm gồm 2 ý, mỗi ý 1.0 điểm).
2. ĐỊNH DẠNG RUBRIC GỌN TRÊN CÙNG 1 DÒNG (DỄ ĐỌC TRÊN MOBILE):
   - Mọi tiêu chí chấm điểm phải viết ngắn gọn trên 1 dòng duy nhất theo chuẩn:
     - **[Tên tiêu chí / Luận điểm] ([X.X] điểm):** [Nội dung yêu cầu cần đạt ngắn gọn, súc tích]
     Ví dụ:
     - **Bối cảnh lịch sử và nguyên nhân đổi mới (0.5 điểm):** Nêu rõ khủng hoảng kinh tế - xã hội giai đoạn 1979 - 1985 và lạm phát phi mã.
     - **Ba đột phá chiến lược tại Đại hội VI (0.5 điểm):** Trình bày 3 chương trình kinh tế lớn (lương thực - thực phẩm, hàng tiêu dùng, hàng xuất khẩu).
3. PHÂN BỔ ĐỘ DÀI THÔNG MINH CHO YÊU CẦU NHIỀU CÂU (5 - 10 CÂU):
   - Khi người dùng yêu cầu số lượng câu lớn (như "Tạo 8 câu...", "Tạo 10 câu tự luận..."), hãy trình bày từng câu cô đọng, súc tích, đi thẳng vào bản chất câu hỏi, gợi ý đáp án và thang điểm để đảm bảo hoàn thành trọn vẹn 100% đủ từ câu 1 đến câu cuối cùng mà không bị ngắt quãng giữa chừng!

QUY TẮC PHÂN BIỆT TUYỆT ĐỐI TỰ LUẬN VÀ TRẮC NGHIỆM:
1. Khi người dùng yêu cầu câu hỏi TỰ LUẬN (hoặc sửa đổi/điều chỉnh như: "tự luận cơ không phải trắc nghiệm", "đổi sang tự luận", "cho câu hỏi tự luận", "làm tự luận"):
   - TUYỆT ĐỐI KHÔNG xuất 4 phương án A, B, C, D!
   - Bám sát chủ đề của cuộc hội thoại ngay trước đó và trình bày từng câu hỏi tự luận mở, kèm Gợi ý trả lời / Đáp án mẫu và Thang điểm chi tiết:
     ### Câu 1: [Đề bài câu hỏi tự luận kèm công thức nếu có]
     **Gợi ý trả lời:** [Các luận điểm, nội dung kiến thức chính cần đạt]
     **Thang điểm:** [Phân bố điểm các tiêu chí chấm theo chuẩn 1 dòng]
2. CHỈ tạo 4 phương án A, B, C, D khi người dùng yêu cầu rõ là TRẮC NGHIỆM:
   ### Câu 1: [Nội dung câu hỏi kèm công thức KaTeX $...$ nếu có]
   - **A.** [Phương án A]
   - **B.** [Phương án B]
   - **C.** [Phương án C]
   - **D.** [Phương án D]

   **Đáp án đúng:** [A/B/C/D]
   **Giải thích chi tiết:** [Lời giải từng bước]
3. ƯU TIÊN TUYỆT ĐỐI Ý ĐỊNH SỬA ĐỔI Ở TIN NHẮN MỚI NHẤT:
   Khi người dùng phản hồi điều chỉnh (ví dụ: "tự luận cơ không phải trắc nghiệm", "làm ngắn hơn", "đổi môn khác"), bạn phải lập tức kế thừa chủ đề từ lịch sử hội thoại ngay trước đó và xuất ra đúng định dạng mới theo mong muốn của người dùng!

QUY TẮC ĐỊNH DẠNG & TOÁN HỌC:
- Mọi nội dung phải được tách dòng rõ ràng, thoáng mắt, có khoảng trắng giữa các ý.
- Trình bày Markdown sạch đẹp, bọc công thức toán học/khoa học trong dấu $...$ cho công thức nằm trong dòng và $$...$$ cho công thức nằm trên dòng riêng. Tuyệt đối không dùng \\(...\\) hay \\[...\\].
- Ghi nhớ toàn bộ ngữ cảnh các tin nhắn trước đó trong cùng cuộc trò chuyện để phản hồi liền mạch.`;

  // Làm sạch và xử lý lịch sử
  const sanitized = sanitizeChatHistory(messages);

  // Xử lý kịch bản: Người dùng bấm "▶ Tiếp tục viết phần còn lại" (continueFrom)
  if (continueFromText) {
    const latestUserPrompt =
      [...sanitized].reverse().find((m) => m.role === 'user')?.content || 'Hãy hoàn thành tiếp phần còn lại.';
    const contPrompt = buildContinuationPrompt(latestUserPrompt, continueFromText);

    const contAiMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: latestUserPrompt },
      { role: 'assistant' as const, content: continueFromText },
      { role: 'user' as const, content: contPrompt },
    ];

    try {
      const contResult = await callAiChatCompletion({
        messages: contAiMessages,
        temperature: 0.3,
        max_tokens: 8192,
      });

      const merged = mergeContinuation(continueFromText, contResult.content);
      const cleanMerged = convertMarkdownTablesToLines(merged);
      const isStillTruncated = isTextIncomplete(cleanMerged, contResult.finishReason, latestUserPrompt);

      return NextResponse.json({
        reply: cleanMerged,
        continuedPiece: convertMarkdownTablesToLines(contResult.content),
        modelUsed: contResult.modelUsed,
        isTruncated: isStillTruncated,
      });
    } catch (contErr) {
      console.warn('[Chat-AI Continue] Lỗi khi tiếp tục sinh:', contErr);
      return NextResponse.json(
        { error: 'Không thể tiếp tục sinh nội dung. Vui lòng bấm thử lại.' },
        { status: 500 }
      );
    }
  }

  const aiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...sanitized.map((m, idx, arr) => {
      // Ở tin nhắn cuối cùng của user, nối thêm lời nhắc cấm bảng và tôn trọng định dạng
      if (idx === arr.length - 1 && m.role === 'user') {
        const isEssayRequest = /tự\s*luận/i.test(m.content);
        const extraNote = isEssayRequest
          ? '[Lưu ý: Người dùng yêu cầu TỰ LUẬN, tuyệt đối không xuất phương án A-B-C-D! Áp dụng thang điểm 10 chuẩn, rubric 1 dòng, đề bài tự luận, gợi ý trả lời và thang điểm!]'
          : '[Lưu ý: Tuyệt đối không xuất bảng Markdown; tách dòng thoáng mắt rõ ràng! Thang điểm 10 chuẩn nếu có phân bổ điểm.]';
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

  // 3. Xử lý Streaming (SSE) nếu client yêu cầu
  if (isStreamRequested) {
    try {
      const { stream } = await callAiChatStream({
        messages: aiMessages,
        temperature: 0.35,
        max_tokens: 8192,
      });

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices?.[0]?.delta?.content || '';
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (streamErr) {
            console.warn('[Chat-AI Stream] Lỗi khi truyền stream:', streamErr);
            controller.error(streamErr);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    } catch (streamInitErr) {
      console.warn('[Chat-AI Stream] Khởi tạo stream thất bại, fallback sang JSON:', streamInitErr);
      // Fallback xuống JSON bên dưới
    }
  }

  // 4. Xử lý Completion qua Multi-Provider Cascade + Server-Side Auto-Continuation
  try {
    const result = await callAiChatCompletion({
      messages: aiMessages,
      temperature: 0.35,
      max_tokens: 8192,
    });

    if (result.content) {
      // Áp dụng bộ lọc Anti-Table Post-Processor để chặn 100% bảng bị lọt ra
      const cleanReply = convertMarkdownTablesToLines(result.content);
      return NextResponse.json({
        reply: cleanReply,
        modelUsed: result.modelUsed,
        isTruncated: result.isTruncated ?? false,
      });
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
