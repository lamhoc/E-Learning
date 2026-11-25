import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callAiChatStream } from '@/lib/ai-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import {
  authorizeReleasedAttempt,
  ExamTutorError,
} from '@/lib/ai-exam-tutor';
import { getStudentAttemptReviewData } from '@/lib/student-exam-review';

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

    const { supabase, user, attempt, examTitle } = await authorizeReleasedAttempt(attemptId);

    if (action === 'initialize') {
      const { data: existingConversation, error: conversationError } = await supabase
        .from('ai_tutor_conversations')
        .select('id')
        .eq('attempt_id', attemptId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (conversationError) {
        console.error('Failed to load AI tutor conversation:', conversationError);
        throw new ExamTutorError('Không thể mở cuộc hội thoại.', 500);
      }

      let conversation = existingConversation;
      if (!conversation) {
        const { data: created, error: createError } = await supabase
          .from('ai_tutor_conversations')
          .insert({
            attempt_id: attemptId,
            student_id: user.id,
            title: `Ôn tập: ${examTitle}`.slice(0, 120),
          })
          .select('id')
          .single();

        if (createError?.code === '23505') {
          const { data: existing, error: retryError } = await supabase
            .from('ai_tutor_conversations')
            .select('id')
            .eq('attempt_id', attemptId)
            .eq('student_id', user.id)
            .maybeSingle();
          if (retryError || !existing) {
            console.error('Failed to reload concurrent AI tutor conversation:', retryError);
            throw new ExamTutorError('Không thể mở cuộc hội thoại.', 500);
          }
          conversation = existing;
        } else if (createError || !created) {
          console.error('Failed to create AI tutor conversation:', createError);
          throw new ExamTutorError('Không thể tạo cuộc hội thoại.', 500);
        } else {
          conversation = created;
        }
      }

      const { data: messages, error: messagesError } = await supabase
        .from('ai_tutor_messages')
        .select('id, sender, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) {
        console.error('Failed to load AI tutor messages:', messagesError);
        throw new ExamTutorError('Không thể tải lịch sử hội thoại.', 500);
      }

      // Nạp danh sách câu hỏi của bài thi đã làm
      const reviewResult = await getStudentAttemptReviewData(attemptId);
      const reviewData = reviewResult.status === 'success' ? reviewResult.data : null;

      return NextResponse.json({
        conversationId: conversation.id,
        messages: (messages ?? []) as TutorMessage[],
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

    const { data: conversation, error: conversationError } = await supabase
      .from('ai_tutor_conversations')
      .select('id')
      .eq('id', body.conversationId)
      .eq('attempt_id', attemptId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (conversationError) {
      console.error('Failed to verify AI tutor conversation:', conversationError);
      throw new ExamTutorError('Không thể xác minh cuộc hội thoại.', 500);
    }
    if (!conversation) throw new ExamTutorError('Không tìm thấy cuộc hội thoại này.', 404);



    const { data: savedMessages, error: historyError } = await supabase
      .from('ai_tutor_messages')
      .select('sender, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);

    if (historyError) {
      console.error('Failed to load AI tutor conversation history:', historyError);
      throw new ExamTutorError('Không thể tải lịch sử hội thoại.', 500);
    }

    const reviewResult = await getStudentAttemptReviewData(attemptId);
    const reviewData = reviewResult.status === 'success' ? reviewResult.data : null;
    const isAllowedViewAnswers = reviewData?.showAnswers ?? false;

    // Chuẩn bị danh sách câu hỏi cho System Context
    const examQuestionsContext = (reviewData?.questions ?? []).map((q) => {
      const base: Record<string, unknown> = {
        cau: q.questionNumber,
        loai: q.questionType,
        de_bai: q.questionText,
        cac_lua_chon: q.options.map((opt) => `${opt.key}. ${opt.text}`),
        sinh_vien_tra_loi: q.questionType === 'multiple_choice' ? (q.studentOption || 'Bỏ trống') : (q.studentText || 'Bỏ trống'),
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

    const { error: insertUserError } = await supabase.from('ai_tutor_messages').insert({
      conversation_id: conversation.id,
      sender: 'student',
      content: body.content.trim(),
    });

    if (insertUserError) {
      console.error('Failed to save student AI tutor message:', insertUserError);
      throw new ExamTutorError('Không thể lưu tin nhắn của bạn.', 500);
    }

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
      ...(savedMessages ?? [])
        .reverse()
        .map((message) => ({
          role: message.sender === 'assistant' ? 'assistant' as const : 'user' as const,
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

          const { error: saveReplyError } = await createAdminClient().from('ai_tutor_messages').insert({
            conversation_id: conversation.id,
            sender: 'assistant',
            content: fullReply.trim(),
          });

          if (saveReplyError) {
            console.error('Failed to save AI tutor response:', saveReplyError);
            controller.error(new Error('Không thể lưu câu trả lời của gia sư AI.'));
            return;
          }

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
