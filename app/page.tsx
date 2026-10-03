'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const suggestions = [
  'Giải thích giúp tôi về cơ sở dữ liệu quan hệ',
  'Tạo 5 câu hỏi ôn tập về cấu trúc dữ liệu',
  'Hướng dẫn tôi lập kế hoạch học trong tuần này',
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Xin chào! Mình là gia sư AI. Bạn đang học chủ đề nào?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      if (!response.ok) {
        throw new Error(data.error || 'Không thể kết nối với gia sư AI.');
      }

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      setMessages((current) => [...current, { role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([
      {
        role: 'assistant',
        content: 'Xin chào! Mình là gia sư AI. Bạn đang học chủ đề nào?',
      },
    ]);
    setInput('');
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#202b27]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col border-x border-[#dfe5dd] bg-[#fbfcf9]">
        <header className="flex items-center justify-between border-b border-[#dfe5dd] px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">
              E-Learning
            </p>
            <h1 className="mt-1 text-lg font-semibold">Gia sư AI</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/subjects"
              className="rounded-md border border-[#cbd7ce] px-3 py-2 text-sm font-medium text-[#355347] transition hover:bg-[#edf3ed]"
            >
              Môn học
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-[#cbd7ce] px-3 py-2 text-sm font-medium text-[#355347] transition hover:bg-[#edf3ed]"
            >
              Đăng nhập
            </Link>
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-md border border-[#cbd7ce] px-3 py-2 text-sm font-medium text-[#355347] transition hover:bg-[#edf3ed]"
            >
              Chat mới
            </button>
          </nav>
        </header>

        <section
          aria-live="polite"
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-8 sm:px-10"
        >
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`max-w-2xl rounded-lg px-4 py-3 text-sm leading-6 ${
                message.role === 'user'
                  ? 'ml-auto bg-[#dce9df] text-[#23392e]'
                  : 'mr-auto border border-[#e2e8e1] bg-white text-[#26342d]'
              }`}
            >
              <p className="mb-1 text-xs font-semibold text-[#60776a]">
                {message.role === 'user' ? 'Bạn' : 'Gia sư AI'}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </article>
          ))}
          {loading && (
            <p className="mr-auto text-sm text-[#60776a]" role="status">
              Gia sư đang trả lời...
            </p>
          )}

          {messages.length === 1 && (
            <div className="mt-auto flex flex-wrap gap-2 pt-8">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-md border border-[#d9e2d9] bg-white px-3 py-2 text-left text-xs text-[#40594b] transition hover:border-[#95b39f] hover:bg-[#f2f7f1]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={sendMessage} className="border-t border-[#dfe5dd] bg-white p-4 sm:px-8 sm:py-5">
          <label htmlFor="message" className="sr-only">
            Tin nhắn cho gia sư AI
          </label>
          <div className="flex items-end gap-3">
            <textarea
              id="message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Nhập câu hỏi hoặc chủ đề bạn muốn ôn tập..."
              rows={2}
              maxLength={4000}
              className="min-h-12 flex-1 resize-y rounded-md border border-[#cbd7ce] bg-[#fbfcf9] px-3 py-2.5 text-sm outline-none placeholder:text-[#87948b] focus:border-[#648675] focus:ring-2 focus:ring-[#648675]/15"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-[#285845] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f4837] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
          <p className="mt-2 text-xs text-[#7c8980]">Enter để gửi, Shift + Enter để xuống dòng</p>
        </form>
      </div>
    </main>
  );
}
