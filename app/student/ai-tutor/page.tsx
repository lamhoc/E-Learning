'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';

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
    <main className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* 1. Sidebar bên trái đồng bộ khu vực Sinh viên */}
      <StudentSidebar studentName={studentName} activeRoute="ai-tutor" />

      {/* 2. Vùng nội dung bên phải Flexbox tràn 100% viewport */}
      <div className="flex h-screen flex-col overflow-hidden min-w-0">
        {/* Topbar đồng bộ khu vực Sinh viên */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10 shrink-0">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
              <BrandLogo size="sm" />
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
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Gia sư AI</h1>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
              >
                <RotateCcw className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Đoạn chat mới</span>
              </button>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 3. Khung Chat Flexbox cao vừa khít màn hình hiển thị bên phải: h-[calc(100vh-61px)] */}
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-61px)] bg-[#f8faf8] dark:bg-[#070D18]">
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
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-[#17372e] text-white shadow-2xs'
                        : 'rounded-tl-sm border border-[#d9e3dc] dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-800 dark:text-slate-100 shadow-2xs'
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
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-[#d9e3dc] dark:border-slate-800 bg-white dark:bg-[#111C2D] px-4 py-3 shadow-2xs">
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
                <div className="mt-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-4">
                  <p className="mb-2.5 text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Gợi ý câu hỏi ôn tập dành cho bạn:</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-blue-50 dark:bg-[#162235] dark:hover:bg-[#1E2F48] p-2.5 text-left text-xs font-medium text-slate-800 dark:text-slate-100 shadow-2xs transition hover:border-emerald-400 dark:hover:border-emerald-500"
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
          <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1628] px-4 py-4 sm:px-6">
            <form onSubmit={sendMessage} className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 dark:border-emerald-500/50 bg-white dark:bg-[#111C2D] p-2 focus-within:border-blue-600 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-emerald-500/20 transition-all shadow-2xs">
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
                  spellCheck={false}
                  placeholder="Nhập câu hỏi, bài tập hoặc chủ đề bạn muốn ôn tập cùng Gia sư AI..."
                  rows={1}
                  maxLength={4000}
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm !text-slate-900 dark:!text-white caret-blue-600 dark:caret-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-400 outline-none"
                  style={{ maxHeight: '140px', overflowY: 'auto' }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Gửi tin nhắn"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 dark:bg-emerald-600 text-white shadow-2xs transition hover:bg-blue-700 dark:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
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
    </main>
  );
}

