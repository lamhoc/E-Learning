'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ChatMessageContent } from '@/components/chat/chat-message-content';
import { createClient } from '@/lib/supabase/client';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  {
    icon: '🎬',
    title: 'Kịch bản bài giảng',
    prompt: 'Soạn kịch bản video bài giảng 3 phút về ứng dụng AI trong giáo dục',
  },
  {
    icon: '📋',
    title: 'Rubric chấm điểm',
    prompt: 'Xây dựng thang điểm Rubric đánh giá đồ án môn Lập trình Web',
  },
  {
    icon: '🧪',
    title: 'Ngân hàng câu hỏi',
    prompt: 'Tạo 5 câu hỏi trắc nghiệm kèm giải thích chi tiết về Cấu trúc dữ liệu & Giải thuật',
  },
  {
    icon: '📖',
    title: 'Đề cương môn học',
    prompt: 'Soạn đề cương chi tiết môn học 15 buổi chuẩn đào tạo tín chỉ',
  },
];

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Xin chào Thầy/Cô! Tôi là Trợ lý AI Đa Năng của trường Đại học Lạc Hồng. Tôi sẵn sàng hỗ trợ Thầy/Cô soạn thảo giáo án, xây dựng kịch bản bài giảng, tạo rubric chấm điểm, ra đề kiểm tra hoặc nghiên cứu học thuật trong mọi lĩnh vực. Thầy/Cô muốn bắt đầu với nội dung nào?',
};

export default function TeacherAiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState('Giảng viên');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lấy thông tin giảng viên
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.full_name) {
          setTeacherName(profile.full_name);
        } else if (user.email) {
          setTeacherName(user.email);
        }
      }
    });
  }, []);

  // Tự động focus vào ô nhập liệu khi vào trang
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Tự động co giãn textarea khi gõ nhiều dòng
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  async function sendContent(contentToSend: string) {
    const content = contentToSend.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-20) }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể kết nối với Gia sư AI.');
      }
      setMessages((cur) => [...cur, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      setMessages((cur) => [
        ...cur,
        { role: 'assistant', content: `⚠️ Lỗi kết nối: ${message}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    sendContent(input);
  }

  function handleSelectSuggestion(prompt: string) {
    sendContent(prompt);
  }

  function retryLastMessage() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setMessages((cur) => {
      const filtered = cur.filter((m, idx) => idx !== cur.length - 1);
      return filtered;
    });

    sendContent(lastUserMsg.content);
  }

  function startNewChat() {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }

  const handleCopyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Ignore
    }
  };

  const isInitialState = messages.length === 1;

  return (
    <div className="min-w-0">
      {/* Vùng nội dung Flexbox tràn 100% viewport */}
      <div className="flex h-[calc(100dvh-56px)] lg:h-screen flex-col overflow-hidden min-w-0">
        {/* Topbar khu vực Giảng viên */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-4 py-3 backdrop-blur sm:px-8 lg:px-10 shrink-0">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Gia sư AI</h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:block">
                    Trợ lý học thuật & khảo thí toàn năng 24/7
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Đoạn chat mới</span>
              </button>
              <NotificationBell />
              {/* Chỉ hiển thị ThemeToggle trên Desktop để tránh lặp 2 nút trên Mobile Topbar */}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Khung Chat Flexbox cao vừa khít màn hình hiển thị */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8faf8] dark:bg-[#070D18]">
          {/* Vùng danh sách tin nhắn: flex-1 overflow-y-auto để cuộn độc lập */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-5 min-h-full">
              {/* MÀN HÌNH CHỜ (EMPTY STATE) HIỆN ĐẠI KHI CHƯA CHAT */}
              {isInitialState && (
                <div className="my-auto py-8 sm:py-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-2">
                  <div className="size-14 sm:size-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-emerald-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/15 mb-4 animate-in fade-in zoom-in duration-300">
                    <div className="size-full bg-white dark:bg-[#0B1628] rounded-[22px] grid place-items-center">
                      <Sparkles className="size-7 sm:size-8 text-blue-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Xin chào Thầy/Cô{teacherName && teacherName !== 'Giảng viên' ? ` ${teacherName}` : ''}! Hôm nay tôi có thể hỗ trợ gì cho Thầy/Cô?
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
                    Hỗ trợ soạn giáo án, kịch bản video bài giảng, tạo rubric chấm điểm, ra đề thi, viết code hoặc giải đáp chuyên môn mọi lĩnh vực.
                  </p>

                  {/* 4 Thẻ gợi ý mở tự do */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full text-left">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s.prompt)}
                        className="group flex flex-col justify-between p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-[#111C2D]/80 hover:bg-white dark:hover:bg-[#162235] hover:border-blue-400 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">{s.icon}</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-emerald-400 transition-colors">
                            {s.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {s.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DANH SÁCH TIN NHẮN KHI ĐÃ BẮT ĐẦU TRÒ CHUYỆN */}
              {!isInitialState &&
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${
                        msg.role === 'user'
                          ? 'bg-[#17372e] dark:bg-emerald-950 text-[#c9ed99] dark:text-emerald-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="size-4" />
                      ) : (
                        <Bot className="size-4" />
                      )}
                    </div>

                    {/* Bong bóng tin nhắn */}
                    <div className="flex flex-col max-w-[92%] sm:max-w-[80%] lg:max-w-[75%]">
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
                          msg.role === 'user'
                            ? 'rounded-tr-sm bg-[#17372e] text-white shadow-2xs'
                            : 'rounded-tl-sm border border-[#d9e3dc] dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-800 dark:text-slate-100 shadow-2xs'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <ChatMessageContent content={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Nút Sao chép câu trả lời dưới mỗi tin nhắn Assistant */}
                      {msg.role === 'assistant' && !msg.content.startsWith('⚠️ Lỗi kết nối') && (
                        <div className="mt-1 px-1 flex items-center justify-start">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, i)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                            title="Sao chép toàn bộ câu trả lời"
                          >
                            {copiedIndex === i ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Nút Thử gửi lại khi gặp lỗi */}
                      {msg.role === 'assistant' && msg.content.startsWith('⚠️ Lỗi kết nối') && (
                        <div className="mt-2 flex items-center justify-start">
                          <button
                            type="button"
                            onClick={retryLastMessage}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>Thử gửi lại</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {/* Hiệu ứng đang soạn câu trả lời */}
              {loading && (
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-[#d9e3dc] dark:border-slate-800 bg-white dark:bg-[#111C2D] px-4 py-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Đang soạn câu trả lời</span>
                      <div className="flex items-center gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Vùng ô nhập text (Input area): Nằm cố định ở đáy trang (shrink-0) */}
          <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1628] px-4 py-4 sm:px-6">
            <form onSubmit={sendMessage} className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C2D] p-2 focus-within:border-blue-600 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-emerald-500/20 transition-all shadow-2xs">
                <textarea
                  ref={textareaRef}
                  id="chat-input"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  spellCheck={false}
                  placeholder="Hỏi Gia sư AI bất cứ điều gì bạn cần..."
                  rows={1}
                  maxLength={4000}
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-base sm:text-sm text-slate-900 dark:text-white caret-blue-600 dark:caret-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  style={{ maxHeight: '140px', overflowY: 'auto' }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Gửi tin nhắn"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 dark:bg-emerald-600 text-white shadow-2xs transition hover:bg-blue-700 dark:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <Send className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Nhấn <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold">Enter</kbd> để gửi ·{' '}
                <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold">Shift + Enter</kbd> để xuống dòng
              </p>
            </form>
          </footer>
        </div>
      </div>
    </div>
  );
}
