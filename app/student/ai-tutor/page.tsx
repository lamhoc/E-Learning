'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CornerDownLeft,
  GraduationCap,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { StudentSidebar } from '@/components/student/student-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import { createClient } from '@/lib/supabase/client';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'Giải thích giúp tôi về cơ sở dữ liệu quan hệ và khóa ngoại',
  'Hướng dẫn thuật toán tìm kiếm nhị phân (Binary Search) bằng C++',
  'Tạo 5 câu hỏi ôn tập trắc nghiệm về cấu trúc dữ liệu cây (Tree)',
  'Giải phương trình vi phân y\u2019 = y với điều kiện đầu y(0)=1',
];

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Xin chào bạn! Mình là Gia sư AI của Mầm Học. Bạn đang gặp vướng mắc bài tập nào hoặc muốn ôn tập chủ đề gì hôm nay?',
};

export default function StudentAiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState('Sinh viên');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Lấy thông tin sinh viên đang đăng nhập để hiển thị trên Sidebar
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.full_name) {
              setStudentName(data.full_name);
            } else if (user.email) {
              setStudentName(user.email);
            }
          });
      }
    });
  }, []);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-20) }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Không thể kết nối với Gia sư AI.');
      setMessages((cur) => [...cur, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      setMessages((cur) => [
        ...cur,
        { role: 'assistant', content: `⚠️ Lỗi kết nối: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
  }

  const isFirstMessage = messages.length === 1;

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* 1. Sidebar bên trái đồng bộ khu vực Sinh viên */}
      <StudentSidebar studentName={studentName} activeRoute="ai-tutor" />

      {/* 2. Vùng nội dung bên phải Flexbox tràn 100% viewport */}
      <div className="flex h-screen flex-col overflow-hidden min-w-0">
        {/* Topbar đồng bộ khu vực Sinh viên */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10 shrink-0">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <span className="text-sm font-semibold">Mầm Học</span>
              </div>
              <Link
                href="/student/dashboard"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5' })}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Tổng quan</span>
              </Link>
              <div className="hidden h-4 w-px bg-slate-300 sm:block" />
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 leading-tight">Gia sư AI</h1>
                  <p className="text-[11px] text-slate-500 leading-tight hidden sm:block">
                    Trợ lý học tập & giải đáp 24/7
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <RotateCcw className="size-3.5 text-emerald-700" />
                <span>Đoạn chat mới</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* 3. Khung Chat Flexbox cao vừa khít màn hình hiển thị bên phải: h-[calc(100vh-61px)] */}
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-61px)] bg-[#f8faf8]">
          {/* Vùng danh sách tin nhắn: flex-1 overflow-y-auto để cuộn độc lập */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      msg.role === 'user'
                        ? 'bg-[#17372e] text-[#c9ed99]'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="size-4" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </div>

                  {/* Bong bóng tin nhắn */}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-[#17372e] text-white shadow-2xs'
                        : 'rounded-tl-sm border border-[#d9e3dc] bg-white text-slate-800 shadow-2xs'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MathText
                        content={msg.content}
                        className="whitespace-pre-wrap leading-relaxed text-sm"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Hiệu ứng loading khi AI đang phản hồi */}
              {loading && (
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-[#d9e3dc] bg-white px-4 py-3 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Gợi ý câu hỏi khi mới mở cuộc hội thoại */}
              {isFirstMessage && !loading && (
                <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-700" />
                    <span>Gợi ý câu hỏi ôn tập dành cho bạn:</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs text-slate-700 shadow-2xs transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Vùng ô nhập text (Input area): Nằm cố định ở đáy trang (shrink-0) */}
          <footer className="shrink-0 border-t border-[#e2e8e2] bg-white px-4 py-4 sm:px-6">
            <form onSubmit={sendMessage} className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50/80 p-2 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all shadow-2xs">
                <textarea
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Nhập câu hỏi, bài tập hoặc chủ đề bạn muốn ôn tập cùng Gia sư AI..."
                  rows={1}
                  maxLength={4000}
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  style={{ maxHeight: '140px', overflowY: 'auto' }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Gửi tin nhắn"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#17372e] text-white shadow-2xs transition hover:bg-[#122c25] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Nhấn <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">Enter</kbd> để gửi ·{' '}
                <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">Shift + Enter</kbd> để xuống dòng
              </p>
            </form>
          </footer>
        </div>
      </div>
    </main>
  );
}

