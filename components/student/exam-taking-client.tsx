'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  LoaderCircle,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MathText } from '@/components/ui/math-text';
import {
  saveStudentAnswerAction,
  submitExamAttemptAction,
} from '@/app/student/exams/[examId]/actions';
import type {
  ActiveAttemptData,
  StudentExamDetail,
  StudentExamQuestion,
} from '@/lib/student-exam';

type ExamTakingClientProps = {
  exam: StudentExamDetail;
  questions: StudentExamQuestion[];
  activeAttempt: ActiveAttemptData;
  studentName: string;
};

export function ExamTakingClient({
  exam,
  questions,
  activeAttempt,
  studentName,
}: ExamTakingClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Local Answers State
  const [answers, setAnswers] = useState<
    Record<string, { selected_option?: 'A' | 'B' | 'C' | 'D' | null; answer_text?: string | null }>
  >(activeAttempt.savedAnswers || {});

  // Save Status
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Submit Modal & Status
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Countdown Timer
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    const ends = Date.parse(activeAttempt.ends_at);
    return Math.max(0, ends - Date.now());
  });

  // Timer Tick & Auto-submit on Expiry
  useEffect(() => {
    const interval = setInterval(() => {
      const ends = Date.parse(activeAttempt.ends_at);
      const remaining = Math.max(0, ends - Date.now());
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleForceSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAttempt.ends_at]);

  const handleForceSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await submitExamAttemptAction(activeAttempt.id, exam.id);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleSelectOption = async (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    // Optimistic local update
    const updated = {
      ...answers,
      [questionId]: {
        ...answers[questionId],
        selected_option: optionKey,
      },
    };
    setAnswers(updated);
    setSavingStatus('saving');

    const res = await saveStudentAnswerAction(activeAttempt.id, exam.id, questionId, {
      selectedOption: optionKey,
      answerText: updated[questionId]?.answer_text ?? null,
    });

    if (res.status === 'success') {
      setSavingStatus('saved');
    } else {
      setSavingStatus('error');
    }
  };

  const handleEssayChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_text: text,
      },
    }));
  };

  const handleEssayBlur = async (questionId: string) => {
    const current = answers[questionId];
    setSavingStatus('saving');
    const res = await saveStudentAnswerAction(activeAttempt.id, exam.id, questionId, {
      selectedOption: current?.selected_option ?? null,
      answerText: current?.answer_text ?? null,
    });
    setSavingStatus(res.status === 'success' ? 'saved' : 'error');
  };

  const handleSubmitConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const res = await submitExamAttemptAction(activeAttempt.id, exam.id);
    if (res.status === 'error') {
      setSubmitError(res.message);
      setIsSubmitting(false);
    } else {
      setIsSubmitModalOpen(false);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const formatTimer = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Counting answered
  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    if (q.question_type === 'multiple_choice') {
      return Boolean(ans?.selected_option);
    }
    return Boolean(ans?.answer_text?.trim());
  }).length;

  const isLowTime = timeLeftMs > 0 && timeLeftMs < 5 * 60 * 1000;

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`q-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Fixed Exam Banner / Timer Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Lượt #{activeAttempt.attempt_no}
              </Badge>
              <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                {exam.title}
              </h1>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              {exam.subject?.name} · Thí sinh: <strong>{studentName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save Indicator */}
            <div className="hidden items-center gap-1.5 text-xs sm:flex">
              {savingStatus === 'saving' && (
                <span className="flex items-center gap-1 text-slate-400">
                  <LoaderCircle className="size-3 animate-spin" /> Đang lưu...
                </span>
              )}
              {savingStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="size-3" /> Đã lưu
                </span>
              )}
              {savingStatus === 'error' && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertCircle className="size-3" /> Lỗi mạng
                </span>
              )}
            </div>

            {/* Countdown Clock */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-sm font-bold transition shadow-xs ${
                isLowTime
                  ? 'animate-pulse bg-red-100 text-red-700 ring-1 ring-red-300'
                  : 'bg-slate-900 text-white'
              }`}
            >
              <Clock className="size-4" />
              <span>{formatTimer(timeLeftMs)}</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
            >
              <Send className="size-4" />
              <span>Nộp bài</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Exam Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Questions Container (Left / Center) */}
          <main className="space-y-6">
            {exam.instructions && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xs">
                <span className="font-bold text-slate-800">Hướng dẫn bài thi:</span>{' '}
                {exam.instructions}
              </div>
            )}

            {questions.map((q, idx) => {
              const isMC = q.question_type === 'multiple_choice';
              const currentAns = answers[q.id];
              const isAnswered = isMC
                ? Boolean(currentAns?.selected_option)
                : Boolean(currentAns?.answer_text?.trim());

              return (
                <Card
                  key={q.id}
                  id={`q-${q.id}`}
                  className={`scroll-mt-24 transition ${
                    isAnswered ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold ${
                            isAnswered
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {isMC ? 'Trắc nghiệm' : 'Tự luận'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs font-medium text-slate-500">
                        {q.points} điểm
                      </Badge>
                    </div>

                    {/* Question Body */}
                    <div className="text-sm font-medium leading-relaxed text-slate-900 sm:text-base">
                      <MathText content={q.question_text} />
                    </div>

                    {/* Multiple Choice Options */}
                    {isMC && q.options && (
                      <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                        {q.options.map((opt) => {
                          const isSelected = currentAns?.selected_option === opt.key;

                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.key)}
                              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition select-none sm:text-sm ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-full font-bold transition ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.key}
                              </span>
                              <div className="min-w-0 flex-1 leading-relaxed">
                                <MathText content={opt.text} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Essay Answer Textarea */}
                    {!isMC && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-semibold text-slate-600">
                          Bài giải của bạn (tự động lưu khi rời ô nhập):
                        </label>
                        <textarea
                          rows={6}
                          value={currentAns?.answer_text || ''}
                          onChange={(e) => handleEssayChange(q.id, e.target.value)}
                          onBlur={() => handleEssayBlur(q.id)}
                          placeholder="Nhập nội dung trình bày bài giải của bạn tại đây..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Bottom Actions */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row shadow-2xs">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Đã trả lời {answeredCount} / {questions.length} câu hỏi
                </p>
                <p className="text-xs text-slate-500">
                  Hãy kiểm tra lại kỹ lưỡng trước khi bấm nộp bài.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setIsSubmitModalOpen(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
              >
                <Send className="size-4" /> Nộp bài thi
              </Button>
            </div>
          </main>

          {/* Right Question Palette / Navigator (Sticky Sidebar) */}
          <aside className="space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Mục lục câu hỏi</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tiến độ: <strong className="text-slate-800">{answeredCount}</strong> / {questions.length} câu
              </p>

              {/* Progress Bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Grid Buttons */}
              <div className="mt-5 grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isMC = q.question_type === 'multiple_choice';
                  const currentAns = answers[q.id];
                  const isDone = isMC
                    ? Boolean(currentAns?.selected_option)
                    : Boolean(currentAns?.answer_text?.trim());

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(q.id)}
                      className={`flex size-10 items-center justify-center rounded-xl text-xs font-bold transition ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                      title={`Câu ${idx + 1} (${isDone ? 'Đã làm' : 'Chưa làm'})`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-600" />
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full border border-slate-300 bg-slate-100" />
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                <Send className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận nộp bài thi</h3>
                <p className="text-xs text-slate-500">Hãy kiểm tra kỹ trước khi gửi bài</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Đã hoàn thành:</span>
                <strong className="text-slate-900">
                  {answeredCount} / {questions.length} câu
                </strong>
              </div>
              {answeredCount < questions.length && (
                <div className="flex items-start gap-1.5 text-amber-700 font-medium pt-1">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Bạn còn {questions.length - answeredCount} câu chưa trả lời!</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Thời gian còn lại:</span>
                <strong className="text-slate-900">{formatTimer(timeLeftMs)}</strong>
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
              >
                Tiếp tục làm bài
              </Button>
              <Button
                onClick={handleSubmitConfirm}
                disabled={isSubmitting}
                className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài ngay'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
