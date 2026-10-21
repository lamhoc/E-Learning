'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CornerDownLeft,
  PlusCircle,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const suggestions = [
  'Giải thích giúp tôi về cơ sở dữ liệu quan hệ',
  'Tạo 5 câu hỏi ôn tập về cấu trúc dữ liệu',
  'Hướng dẫn tôi lập kế hoạch học trong tuần này',
  'Giải phương trình vi phân y\u2019 = y với điều kiện đầu y(0)=1',
];

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Xin chào! Mình là Gia sư AI. Bạn muốn ôn tập hoặc tìm hiểu chủ đề nào hôm nay?',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

      if (!response.ok) throw new Error(data.error || 'Không thể kết nối với gia sư AI.');
      setMessages((cur) => [...cur, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      setMessages((cur) => [...cur, { role: 'assistant', content: `⚠️ ${message}` }]);
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
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-xs sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="size-3.5" />
            Trang chủ
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Sparkles className="size-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-tight">Gia sư AI</p>
              <p className="text-[10px] text-slate-400 leading-tight">Hỗ trợ học tập 24/7</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/subjects"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:flex"
          >
            <BookOpen className="size-3.5" />
            Môn học
          </Link>
          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <PlusCircle className="size-3.5" />
            Chat mới
          </button>
        </div>
      </header>

      {/* Message List */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`grid size-8 shrink-0 place-items-center rounded-full ${
                  msg.role === 'user'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-emerald-600 text-white'
                    : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Suggestions (first message only) */}
          {isFirstMessage && !loading && (
            <div className="mt-4">
              <p className="mb-3 text-xs font-medium text-slate-500">Gợi ý câu hỏi:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <form onSubmit={sendMessage} className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
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
              placeholder="Nhập câu hỏi hoặc chủ đề bạn muốn ôn tập..."
              rows={1}
              maxLength={4000}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              style={{ maxHeight: '160px', overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Gửi tin nhắn"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Nhấn <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> để gửi ·{' '}
            <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Shift + Enter</kbd> để xuống dòng
          </p>
        </form>
      </footer>
    </div>
  );
}
