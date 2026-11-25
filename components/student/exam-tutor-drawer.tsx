'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  Layers,
  Lightbulb,
  ListFilter,
  LoaderCircle,
  MessageCircleQuestion,
  Send,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MathText, stripLeadingQuestionPrefix } from '@/components/ui/math-text';
import { ChatMessageRenderer } from '@/components/chat/ChatMessageRenderer';
import type { AttemptReviewQuestion } from '@/lib/student-exam-review';

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
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialQuestionNumber?: number | null;
};

export function ExamTutorDrawer({
  attemptId,
  examTitle,
  attemptNo,
  variant = 'button',
  isOpenControlled,
  onOpenChange,
  initialQuestionNumber = null,
}: ExamTutorDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof isOpenControlled === 'boolean';
  const isOpen = isControlled ? isOpenControlled : internalIsOpen;

  const setIsOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [questions, setQuestions] = useState<AttemptReviewQuestion[]>([]);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [selectedQuestion, setSelectedQuestion] = useState<AttemptReviewQuestion | null>(null);
  const [isQuestionsCollapsed, setIsQuestionsCollapsed] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'incorrect'>('all');

  const [draft, setDraft] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!isOpen) return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, isSending]);

  // Focus input when opened
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSending) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSending]);

  // Load conversation & questions when opened
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
      const loadedQuestions: AttemptReviewQuestion[] = payload.questions ?? [];
      setQuestions(loadedQuestions);
      const isAllowed = Boolean(payload.showAnswers);
      setShowAnswers(isAllowed);

      // Nếu có câu làm sai và được xem đáp án, mặc định chọn tab lọc câu sai
      const hasIncorrect = loadedQuestions.some((q) => q.isCorrect === false);
      if (hasIncorrect && isAllowed) {
        setQuestionFilter('incorrect');
      }

      // Nếu có initialQuestionNumber được truyền vào, chọn ngay câu đó
      if (initialQuestionNumber) {
        const found = loadedQuestions.find((q) => q.questionNumber === initialQuestionNumber);
        if (found) setSelectedQuestion(found);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể mở gia sư AI.');
    } finally {
      setIsLoadingHistory(false);
    }
  }

  // Tự động load khi isOpen được bật từ bên ngoài (controlled)
  useEffect(() => {
    if (isOpen && !conversationId && !isLoadingHistory) {
      void openTutor();
    }
  }, [isOpen]);

  // Đồng bộ initialQuestionNumber nếu thay đổi
  useEffect(() => {
    if (initialQuestionNumber && questions.length > 0) {
      const found = questions.find((q) => q.questionNumber === initialQuestionNumber);
      if (found) {
        setSelectedQuestion(found);
        setIsQuestionsCollapsed(false);
      }
    }
  }, [initialQuestionNumber, questions]);

  const incorrectQuestions = useMemo(() => {
    return questions.filter((q) => q.isCorrect === false);
  }, [questions]);

  const displayedQuestions = useMemo(() => {
    if (questionFilter === 'incorrect' && showAnswers) {
      return questions.filter((q) => q.isCorrect === false);
    }
    return questions;
  }, [questions, questionFilter, showAnswers]);

  // Gửi tin nhắn tới AI
  async function sendMessage(textToSend: string) {
    const content = textToSend.trim();
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
      const message = error instanceof Error ? error.message : 'Gia sư AI gặp lỗi khi trả lời.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let text = draft.trim();
    if (selectedQuestion) {
      text = `[Hỏi Câu ${selectedQuestion.questionNumber}] ${text}`;
    }
    await sendMessage(text);
  }

  // Tương tác 1 chạm: Chọn hỏi 1 câu hỏi cụ thể
  const handleAskSpecificQuestion = (q: AttemptReviewQuestion) => {
    setSelectedQuestion(q);
    const prompt = `Giải thích chi tiết từng bước Câu ${q.questionNumber} giúp mình và chỉ ra chỗ mình bị nhầm nhé!`;
    void sendMessage(prompt);
  };

  // Tương tác 1 chạm: Chữa toàn bộ các câu làm sai
  const handleFixAllIncorrect = () => {
    if (incorrectQuestions.length === 0) return;
    const listStr = incorrectQuestions.map((q) => `Câu ${q.questionNumber}`).join(', ');
    const prompt = `Mình làm sai các câu sau: ${listStr}. Hãy tổng hợp các lỗi sai trọng tâm và hướng dẫn phương pháp giải từng câu giúp mình nhé!`;
    void sendMessage(prompt);
  };

  const handleCopyMessage = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Nút kích hoạt mở Drawer nếu không phải chế độ controlled */}
      {!isControlled && (
        variant === 'banner' ? (
          <button
            type="button"
            onClick={openTutor}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-violet-800 cursor-pointer"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Hỏi gia sư AI ngay
          </button>
        ) : (
          <button
            type="button"
            onClick={openTutor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300 transition hover:bg-violet-100 dark:hover:bg-violet-900/60 cursor-pointer"
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            Hỏi gia sư AI
          </button>
        )
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Đóng cửa sổ gia sư AI"
            className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => !isSending && setIsOpen(false)}
          />

          {/* Drawer Section - Mở rộng tối đa 640px */}
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Gia sư AI cho ${examTitle}`}
            className="relative flex h-full w-full max-w-full sm:w-[560px] lg:w-[640px] flex-col border-l border-border bg-white dark:bg-[#09111E] shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
          >
            {/* Header Drawer */}
            <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0A275C] px-5 py-3.5 text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FACC15] text-[#0A275C] shadow-xs">
                  <MessageCircleQuestion aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base truncate">Gia sư AI chữa đề</h2>
                    <Badge className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.2">
                      Lượt #{attemptNo}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/70 truncate mt-0.5">
                    {examTitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                disabled={isSending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </header>

            {/* ── KHU VỰC DANH SÁCH CÂU HỎI TRONG BÀI THI (Có thể thu gọn/mở rộng) ── */}
            {questions.length > 0 && (
              <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-[#0E1726] shrink-0 transition-all">
                {/* Header thanh câu hỏi */}
                <div className="flex items-center justify-between px-4 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="size-3.5 text-blue-600 dark:text-blue-400" />
                      Danh sách câu hỏi ({questions.length})
                    </span>

                    {/* Bộ lọc nhanh: Tất cả / Câu làm sai */}
                    {showAnswers && incorrectQuestions.length > 0 && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => setQuestionFilter('incorrect')}
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition cursor-pointer ${
                            questionFilter === 'incorrect'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          ❌ Câu sai ({incorrectQuestions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionFilter('all')}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition cursor-pointer ${
                            questionFilter === 'all'
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Tất cả
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQuestionsCollapsed((prev) => !prev)}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span>{isQuestionsCollapsed ? 'Hiện câu hỏi' : 'Thu gọn'}</span>
                    {isQuestionsCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                  </button>
                </div>

                {/* Nội dung danh sách nút câu hỏi (khi không bị thu gọn) */}
                {!isQuestionsCollapsed && (
                  <div className="px-4 pb-3 space-y-2.5">
                    {/* Nút hành động nhanh: Chữa toàn bộ câu sai */}
                    {showAnswers && incorrectQuestions.length > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleFixAllIncorrect}
                          disabled={isSending}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="size-3.5" />
                          <span>🔥 Chữa toàn bộ {incorrectQuestions.length} câu làm sai</span>
                        </button>
                      </div>
                    )}

                    {/* Lưới nút số câu hỏi */}
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 no-scrollbar">
                      {displayedQuestions.map((q) => {
                        const isSelected = selectedQuestion?.questionId === q.questionId;
                        let btnStyle = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                        if (showAnswers) {
                          if (q.isCorrect === true) {
                            btnStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                          } else if (q.isCorrect === false) {
                            btnStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold';
                          }
                        }

                        if (isSelected) {
                          btnStyle += ' ring-2 ring-blue-500 scale-105 shadow-sm';
                        }

                        return (
                          <button
                            key={q.questionId}
                            type="button"
                            onClick={() => setSelectedQuestion(q)}
                            className={`min-w-8 h-7 px-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center transition cursor-pointer ${btnStyle}`}
                            title={`Câu ${q.questionNumber}: ${q.questionText.slice(0, 60)}...`}
                          >
                            C{q.questionNumber}
                          </button>
                        );
                      })}
                    </div>

                    {/* Hộp chi tiết câu hỏi đang chọn (Preview) */}
                    {selectedQuestion && (
                      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-[#111C2D] p-3 text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Câu {selectedQuestion.questionNumber}:
                            </span>
                            {showAnswers && (
                              selectedQuestion.isCorrect === true ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                                  Làm đúng
                                </Badge>
                              ) : selectedQuestion.isCorrect === false ? (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]">
                                  Làm sai
                                </Badge>
                              ) : null
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedQuestion(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Bỏ chọn câu này"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>

                        <MathText
                          content={stripLeadingQuestionPrefix(selectedQuestion.questionText)}
                          className="line-clamp-2 text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Bạn chọn: <strong>{selectedQuestion.studentOption || selectedQuestion.studentText || 'Bỏ trống'}</strong>
                            {showAnswers && selectedQuestion.correctOption && (
                              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                | Đáp án đúng: <strong>{selectedQuestion.correctOption}</strong>
                              </span>
                            )}
                          </span>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isSending}
                            onClick={() => handleAskSpecificQuestion(selectedQuestion)}
                            className="h-6 text-[11px] font-bold gap-1 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                          >
                            <Sparkles className="size-3" />
                            <span>⚡ Hỏi AI câu này ngay</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── KHU VỰC NỘI DUNG CHAT CUỘN DỌC ── */}
            <div
              aria-live="polite"
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50 dark:bg-[#09111E] px-4 py-5 sm:px-5"
            >
              {isLoadingHistory ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Đang mở cuộc hội thoại & đồng bộ dữ liệu bài thi...
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-violet-100 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 text-center shadow-xs space-y-3">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                    <Sparkles aria-hidden="true" className="size-6" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cùng ôn tập và chữa bài nhé!
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {showAnswers
                      ? 'Chọn một câu hỏi ở danh sách bên trên hoặc gõ câu hỏi để Gia sư AI phân tích lý do sai, hướng dẫn công thức và cách giải chi tiết.'
                      : 'Đề thi đang ở chế độ bảo mật khóa đáp án. Gia sư AI sẽ hướng dẫn phương pháp giải và định lý để bạn tự rèn luyện mà không tiết lộ trực tiếp kết quả.'}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.sender === 'student'
                          ? 'rounded-br-xs bg-[#154C99] text-white shadow-sm'
                          : 'rounded-bl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 shadow-xs'
                      }`}
                    >
                      {message.sender === 'assistant' && (
                        <div className="mb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                            <Sparkles aria-hidden="true" className="size-3" />
                            Gia sư AI Chữa đề
                          </p>

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Sao chép câu trả lời"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span className="text-emerald-500 font-semibold">Đã chép</span>
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

                      {message.sender === 'assistant' ? (
                        <ChatMessageRenderer content={message.content} />
                      ) : (
                        <MathText content={message.content} className="whitespace-pre-wrap break-words" />
                      )}
                    </div>
                  </article>
                ))
              )}

              {isSending && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs shadow-xs animate-pulse">
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Gia sư AI đang soạn câu trả lời...</span>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <div
                role="alert"
                className="mx-4 mt-2 flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300 sm:mx-5"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                <p>{error}</p>
              </div>
            )}

            {/* ── KHU VỰC NHẬP LIỆU CÂU HỎI ── */}
            <form onSubmit={handleSubmit} className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1628] p-3 sm:p-4 shrink-0">
              {/* Chip hiển thị ngữ cảnh câu hỏi đang chọn */}
              {selectedQuestion && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  <span className="truncate">
                    Đang thảo luận: <strong>Câu {selectedQuestion.questionNumber}</strong> · {stripLeadingQuestionPrefix(selectedQuestion.questionText).slice(0, 45)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion(null)}
                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    title="Bỏ ghim câu này"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              <label htmlFor={`tutor-message-${attemptId}`} className="sr-only">
                Nhập câu hỏi cho gia sư AI
              </label>
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-[#162235] p-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15">
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
                  spellCheck={false}
                  maxLength={2000}
                  rows={2}
                  disabled={!conversationId || isLoadingHistory || isSending}
                  placeholder={
                    selectedQuestion
                      ? `Hỏi bất kỳ điều gì về Câu ${selectedQuestion.questionNumber}...`
                      : 'Hỏi gia sư AI về bài làm (ví dụ: giải thích câu 2 giúp mình)...'
                  }
                  className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-2 py-1 text-xs sm:text-sm leading-relaxed !text-slate-900 dark:!text-white caret-blue-600 dark:caret-amber-400 outline-none placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || !conversationId || isLoadingHistory || isSending}
                  aria-label="Gửi câu hỏi"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 cursor-pointer shadow-xs"
                >
                  {isSending ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Send aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 text-center">
                Enter để gửi · Shift + Enter để xuống dòng
              </p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
