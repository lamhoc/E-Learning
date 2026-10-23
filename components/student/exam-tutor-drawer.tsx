'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  LoaderCircle,
  MessageCircleQuestion,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { MathText } from '@/components/ui/math-text';

type TutorMessage = {
  id: string;
  sender: 'student' | 'assistant';
  content: string;
};

type ExamTutorDrawerProps = {
  attemptId: string;
  examTitle: string;
  attemptNo: number;
  variant?: 'button' | 'banner';
};

export function ExamTutorDrawer({
  attemptId,
  examTitle,
  attemptNo,
  variant = 'button',
}: ExamTutorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSending) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSending]);

  async function openTutor() {
    setIsOpen(true);
    setError('');
    if (conversationId || isLoadingHistory) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/student/exam-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize', attemptId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể mở gia sư AI.');
      }

      setConversationId(payload.conversationId);
      setMessages(payload.messages ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể mở gia sư AI.');
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !conversationId || isSending || content.length > 2000) return;

    const pendingId = `pending-${Date.now()}`;
    setMessages((current) => [...current, { id: pendingId, sender: 'student', content }]);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/student/exam-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          attemptId,
          conversationId,
          content,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Không thể gửi câu hỏi.');
      }
      if (!response.body) throw new Error('Trình duyệt không hỗ trợ nhận phản hồi streaming.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';

      setMessages((current) => [
        ...current,
        { id: `assistant-${pendingId}`, sender: 'assistant', content: '' },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === `assistant-${pendingId}` ? { ...message, content: reply } : message,
          ),
        );
      }

      reply += decoder.decode();
      setMessages((current) =>
        current.map((message) =>
          message.id === `assistant-${pendingId}` ? { ...message, content: reply } : message,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== pendingId && message.id !== `assistant-${pendingId}`,
        ),
      );
      let recoveryError = '';
      try {
        const response = await fetch('/api/student/exam-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize', attemptId }),
        });
        if (response.ok) {
          const payload = await response.json();
          setConversationId(payload.conversationId);
          setMessages(payload.messages ?? []);
        } else {
          const payload = await response.json();
          recoveryError = payload.error || 'Không thể đồng bộ lại lịch sử hội thoại.';
        }
      } catch (recoveryFailure) {
        recoveryError =
          recoveryFailure instanceof Error
            ? recoveryFailure.message
            : 'Không thể đồng bộ lại lịch sử hội thoại.';
      }
      const message = error instanceof Error ? error.message : 'Gia sư AI gặp lỗi khi trả lời.';
      setError(recoveryError ? `${message} ${recoveryError}` : message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {variant === 'banner' ? (
        <button
          type="button"
          onClick={openTutor}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-violet-800"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Hỏi gia sư AI ngay
        </button>
      ) : (
        <button
          type="button"
          onClick={openTutor}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
        >
          <Sparkles aria-hidden="true" className="size-3.5" />
          Hỏi gia sư AI
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Đóng cửa sổ gia sư AI"
            className="absolute inset-0 cursor-default bg-slate-950/40"
            onClick={() => !isSending && setIsOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Gia sư AI cho ${examTitle}`}
            className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#17372e] px-5 py-4 text-white">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c9ed99] text-[#17372e]">
                  <MessageCircleQuestion aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold">Gia sư AI chữa đề</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-white/70">
                    {examTitle} · Lượt {attemptNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={isSending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </header>

            <div
              aria-live="polite"
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-5"
            >
              {isLoadingHistory ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Đang mở cuộc hội thoại...
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-violet-100 bg-white p-5 text-center shadow-xs">
                  <span className="mx-auto grid size-11 place-items-center rounded-full bg-violet-50 text-violet-700">
                    <Sparkles aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    Cùng xem lại bài làm nhé
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Hỏi về câu bạn chưa hiểu. Gia sư sẽ dựa trên đề bài, đáp án và nhận xét đã công bố.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.sender === 'student'
                          ? 'rounded-br-md bg-[#17372e] text-white'
                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-xs'
                      }`}
                    >
                      {message.sender === 'assistant' && (
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                          <Sparkles aria-hidden="true" className="size-3" />
                          Gia sư AI
                        </p>
                      )}
                      <MathText content={message.content} className="whitespace-pre-wrap break-words" />
                    </div>
                  </article>
                ))
              )}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  Gia sư đang suy nghĩ...
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {error && (
              <div
                role="alert"
                className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 sm:mx-5"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4 sm:p-5">
              <label htmlFor={`tutor-message-${attemptId}`} className="sr-only">
                Nhập câu hỏi cho gia sư AI
              </label>
              <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15">
                <textarea
                  id={`tutor-message-${attemptId}`}
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  maxLength={2000}
                  rows={2}
                  disabled={!conversationId || isLoadingHistory || isSending}
                  placeholder="Bạn chưa hiểu câu nào? Hãy hỏi gia sư..."
                  className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-1.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || !conversationId || isLoadingHistory || isSending}
                  aria-label="Gửi câu hỏi"
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#17372e] text-white transition hover:bg-[#20493e] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSending ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Send aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Enter để gửi · Shift + Enter để xuống dòng</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
