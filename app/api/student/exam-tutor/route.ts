import { NextResponse } from 'next/server';
import { callAiChatStream } from '@/lib/ai-provider';
import { authorizeReleasedAttempt, ExamTutorError } from '@/lib/ai-exam-tutor';
import { getStudentAttemptReviewData } from '@/lib/student-exam-review';
import { getRepo } from '@/lib/db/data-source';
import { AiTutorConversationSchema, AiTutorMessageSchema } from '@/lib/db/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type TutorMessage = {
  id: string;
  sender: 'student' | 'assistant';
  content: string;
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 24;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function parseRequest(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ExamTutorError('Dữ liệu gửi lên không hợp lệ.', 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUniqueConstraintError(err: unknown): boolean {
  const num = (err as { number?: number; driverError?: { number?: number } })?.number
    ?? (err as { driverError?: { number?: number } })?.driverError?.number;
  return num === 2627 || num === 2601;
}

export async function POST(request: Request) {
  try {
    const body = await parseRequest(request);
    if (
      !isRecord(body) ||
      typeof body.action !== 'string' ||
      typeof body.attemptId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(body.attemptId)
    ) {
      throw new ExamTutorError('Yêu cầu không hợp lệ.', 400);
    }

    const { action, attemptId } = body;
    if (action !== 'initialize' && action !== 'send') {
      throw new ExamTutorError('Thao tác không được hỗ trợ.', 400);
    }

    const { user, examTitle } = await authorizeReleasedAttempt(attemptId);
    const [convRepo, msgRepo] = await Promise.all([
      getRepo(AiTutorConversationSchema),
      getRepo(AiTutorMessageSchema),
    ]);

    if (action === 'initialize') {
      let conversation = await convRepo.findOne({
        where: { attempt_id: attemptId, student_id: user.id },
      });

      if (!conversation) {
        try {
          conversation = await convRepo.save({
            attempt_id: attemptId,
            student_id: user.id,
            title: `Ôn tập: ${examTitle}`.slice(0, 120),
          });
        } catch (createErr) {
          if (isUniqueConstraintError(createErr)) {
            conversation = await convRepo.findOne({
              where: { attempt_id: attemptId, student_id: user.id },
            });
          } else {
            console.error('Failed to create AI tutor conversation:', createErr);
            throw new ExamTutorError('Không thể tạo cuộc hội thoại.', 500);
          }
        }
      }

      if (!conversation) {
        throw new ExamTutorError('Không thể mở cuộc hội thoại.', 500);
      }

      const [messages, reviewResult] = await Promise.all([
        msgRepo.find({
          where: { conversation_id: conversation.id },
          order: { created_at: 'ASC' },
          take: 50,
        }),
        getStudentAttemptReviewData(attemptId),
      ]);

      const reviewData = reviewResult.status === 'success' ? reviewResult.data : null;

      return NextResponse.json({
        conversationId: conversation.id,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
        })) as TutorMessage[],
        showAnswers: reviewData?.showAnswers ?? false,
        questions: reviewData?.questions ?? [],
        stats: reviewData
          ? {
              totalQuestions: reviewData.totalQuestions,
              correctCount: reviewData.correctCount,
              incorrectCount: reviewData.incorrectCount,
              unansweredCount: reviewData.unansweredCount,
              totalScore: reviewData.totalScore,
            }
          : null,
      });
    }

    if (
      typeof body.conversationId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(body.conversationId) ||
      typeof body.content !== 'string' ||
      !body.content.trim() ||
      body.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new ExamTutorError('Tin nhắn trống hoặc vượt quá 2.000 ký tự.', 400);
    }

    const conversation = await convRepo.findOne({
      where: {
        id: body.conversationId,
        attempt_id: attemptId,
        student_id: user.id,
      },
    });

    if (!conversation) throw new ExamTutorError('Không tìm thấy cuộc hội thoại này.', 404);

    const [savedMessages, reviewResult] = await Promise.all([
      msgRepo.find({
        where: { conversation_id: conversation.id },
        order: { created_at: 'DESC' },
        take: MAX_HISTORY_MESSAGES,
      }),
      getStudentAttemptReviewData(attemptId),
    ]);

    const reviewData = reviewResult.status === 'success' ? reviewResult.data : null;
    const isAllowedViewAnswers = reviewData?.showAnswers ?? false;

    const examQuestionsContext = (reviewData?.questions ?? []).map((q) => {
      const base: Record<string, unknown> = {
        cau: q.questionNumber,
        loai: q.questionType,
        de_bai: q.questionText,
        cac_lua_chon: q.options.map((opt) => `${opt.key}. ${opt.text}`),
        sinh_vien_tra_loi:
          q.questionType === 'multiple_choice'
            ? q.studentOption || 'Bỏ trống'
            : q.studentText || 'Bỏ trống',
      };

      if (isAllowedViewAnswers) {
        base.dap_an_dung = q.questionType === 'multiple_choice' ? q.correctOption : q.modelAnswer;
        base.dung_hay_sai = q.isCorrect ? 'Đúng' : 'Sai';
        if (q.explanation) base.loi_giai = q.explanation;
        if (q.teacherFeedback) base.nhan_xet_gv = q.teacherFeedback;
      } else {
        base.chinh_sach = 'ĐÁP ÁN ĐANG ĐƯỢC GIẢNG VIÊN KHÓA. KHÔNG ĐƯỢC NÓI KẾT QUẢ CUỐI CÙNG!';
      }

      return base;
    });

    const context = JSON.stringify({
      bai_thi: examTitle,
      luot_thi: reviewData?.attemptNo ?? 1,
      duoc_xem_dap_an: isAllowedViewAnswers,
      danh_sach_cau_hoi: examQuestionsContext,
    });

    await msgRepo.insert({
      conversation_id: conversation.id,
      sender: 'student',
      content: body.content.trim(),
    });

    const systemPromptRules = isAllowedViewAnswers
      ? `Bạn là "Gia sư AI Chữa đề tận tâm" của Đại học Lạc Hồng.
Bài thi này CHO PHÉP xem đáp án.
Khi học sinh hỏi về một hoặc nhiều câu trong bài thi (ví dụ "giải thích câu 3", "tại sao câu 5 sai"):
1. Đọc đúng nội dung câu hỏi đó trong NGỮ CẢNH BÀI THI bên dưới.
2. Chỉ rõ đáp án đúng là gì và phân tích vì sao phương án học sinh chọn bị sai hoặc chưa tối ưu.
3. Hướng dẫn từng bước giải chi tiết, rõ ràng, đưa ra công thức và phương pháp ghi nhớ.
4. QUY TẮC ĐỊNH DẠNG:
   - TUYỆT ĐỐI KHÔNG xuất bảng Markdown (|...|).
   - Trình bày chi tiết từng dòng, có khoảng cách giữa các ý.
   - Giữ nguyên công thức toán bằng KaTeX: dùng $...$ cho công thức trong dòng và $$...$$ cho công thức riêng một dòng.`
      : `Bạn là "Gia sư AI Hướng dẫn Ôn tập" của Đại học Lạc Hồng.
QUY CHẾ BẢO MẬT PHÒNG THI ĐẶC BIỆT: Giảng viên ĐANG KHÓA ĐÁP ÁN của đề thi này để tránh lộ đề.
1. TUYỆT ĐỐI KHÔNG tiết lộ đáp án đúng trực tiếp (không nói đáp án là A, B, C hay D, không đưa ra kết quả số cuối cùng).
2. HÃY hướng dẫn phương pháp giải, định lý, công thức liên quan và gợi ý tư duy để sinh viên tự tìm ra đáp án.
3. Đọc đúng nội dung câu hỏi học sinh đang hỏi dựa trên NGỮ CẢNH BÀI THI bên dưới.
4. QUY TẮC ĐỊNH DẠNG:
   - TUYỆT ĐỐI KHÔNG xuất bảng Markdown (|...|).
   - Trình bày chi tiết từng dòng, có khoảng cách giữa các ý.
   - Giữ nguyên công thức toán bằng KaTeX: dùng $...$ cho công thức trong dòng và $$...$$ cho công thức riêng một dòng.`;

    const messages = [
      {
        role: 'system' as const,
        content: `${systemPromptRules}\n\nNGỮ CẢNH BÀI THI CỦA SINH VIÊN:\n${context}`,
      },
      ...[...savedMessages].reverse().map((message) => ({
        role: message.sender === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.content,
      })),
      { role: 'user' as const, content: body.content.trim() },
    ];

    let completion;
    try {
      const streamRes = await callAiChatStream({
        temperature: 0.3,
        max_tokens: 4096,
        messages,
      });
      completion = streamRes.stream;
    } catch (error) {
      console.error('Failed to start AI exam tutor stream:', error);
      throw new ExamTutorError('Không thể kết nối gia sư AI. Vui lòng thử lại.', 502);
    }

    const iterator = completion[Symbol.asyncIterator]();
    let firstChunk: Awaited<ReturnType<typeof iterator.next>>;
    try {
      firstChunk = await iterator.next();
    } catch (error) {
      console.error('Groq exam tutor stream failed before first token:', error);
      throw new ExamTutorError('Gia sư AI chưa thể trả lời. Vui lòng thử lại.', 502);
    }

    if (firstChunk.done) {
      throw new ExamTutorError('Gia sư AI chưa tạo được câu trả lời.', 502);
    }

    const conversationId = conversation.id;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullReply = '';

        const emit = (chunk: typeof firstChunk.value) => {
          const text = chunk.choices[0]?.delta?.content;
          if (typeof text === 'string' && text) {
            fullReply += text;
            controller.enqueue(encoder.encode(text));
          }
        };

        try {
          emit(firstChunk.value);
          while (true) {
            const { done, value } = await iterator.next();
            if (done) break;
            emit(value);
          }

          if (!fullReply.trim()) {
            throw new Error('Groq returned an empty exam tutor response.');
          }

          const messageRepo = await getRepo(AiTutorMessageSchema);
          await messageRepo.insert({
            conversation_id: conversationId,
            sender: 'assistant',
            content: fullReply.trim(),
          });

          controller.close();
        } catch (error) {
          console.error('Groq exam tutor stream failed:', error);
          controller.error(error instanceof Error ? error : new Error('Gia sư AI gặp lỗi.'));
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof ExamTutorError) return jsonError(error.message, error.status);
    console.error('Student exam tutor request failed:', error);
    return jsonError('Đã xảy ra lỗi khi xử lý yêu cầu gia sư AI.', 500);
  }
}
