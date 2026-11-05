'use client';

import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  LoaderCircle,
  Maximize2,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MathText } from '@/components/ui/math-text';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DEFAULT_MAX_TAB_SWITCHES,
  useTabSwitchDetection,
  type ProctorViolationReason,
} from '@/hooks/use-tab-switch-detection';
import {
  logExamTabViolationAction,
  saveStudentAnswerAction,
  submitExamAttemptAction,
} from '@/app/student/exams/[examId]/actions';
import { shuffleExamQuestions } from '@/lib/exam-shuffle';
import { ExamWebcamProctor } from '@/components/student/exam-webcam-proctor';
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

  // 1. Trạng thái Sảnh chuẩn bị & Khóa toàn màn hình (Fullscreen Lockdown)
  const [hasEnteredExam, setHasEnteredExam] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return Boolean(document.fullscreenElement);
    }
    return false;
  });

  // 2. Deterministic Seeded Shuffle: Xáo trộn câu hỏi và phương án A-B-C-D theo attemptId
  const shuffledQuestions = useMemo(() => {
    return shuffleExamQuestions(questions, activeAttempt.id);
  }, [questions, activeAttempt.id]);

  // 3. Local Answers State (lưu originalKey gốc để backend chấm điểm chuẩn xác)
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

  const handleForceSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await submitExamAttemptAction(activeAttempt.id, exam.id);
    startTransition(() => {
      router.refresh();
    });
  };

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

  // Tab switch & Fullscreen violation detection
  const handleAutoSubmitOnTabViolation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await submitExamAttemptAction(activeAttempt.id, exam.id);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleViolationLog = async (violationCount: number, reason: ProctorViolationReason) => {
    await logExamTabViolationAction(activeAttempt.id, exam.id, violationCount, reason);
  };

  const {
    tabSwitchCount,
    lastViolationReason,
    isWarningOpen,
    isTerminated,
    remainingChances,
    maxViolations,
    dismissWarning,
    requestFullscreen,
    triggerManualViolation,
  } = useTabSwitchDetection({
    maxViolations: DEFAULT_MAX_TAB_SWITCHES,
    onAutoSubmit: handleAutoSubmitOnTabViolation,
    onViolation: handleViolationLog,
    enabled: hasEnteredExam && !isSubmitting,
    initialCount: activeAttempt.tabSwitchCount ?? 0,
    enableFullscreenLockdown: true,
    hasStartedFullscreen: hasEnteredExam,
  });

  // Xử lý vào phòng thi và bật Toàn màn hình
  const handleStartWithFullscreen = async () => {
    await requestFullscreen();
    setHasEnteredExam(true);
  };

  // Xử lý chọn đáp án trắc nghiệm (nhận originalKey gốc)
  const handleSelectOption = async (questionId: string, originalOptionKey: 'A' | 'B' | 'C' | 'D') => {
    const updated = {
      ...answers,
      [questionId]: {
        ...answers[questionId],
        selected_option: originalOptionKey,
      },
    };
    setAnswers(updated);
    setSavingStatus('saving');

    const res = await saveStudentAnswerAction(activeAttempt.id, exam.id, questionId, {
      selectedOption: originalOptionKey,
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

  const handleCameraViolation = (violationType: 'camera_blocked' | 'camera_inactive', message: string) => {
    triggerManualViolation('camera_blocked');
    void logExamTabViolationAction(activeAttempt.id, exam.id, tabSwitchCount + 1, violationType);
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

  // Đếm số câu đã trả lời
  const answeredCount = shuffledQuestions.filter((q) => {
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

  // ─── 4. SẢNH CHUẨN BỊ VÀO PHÒNG THI (EXAM ENTRY GUARD SCREEN) ─────────────
  if (!hasEnteredExam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-6 sm:p-9 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo size="md" />
            <ThemeToggle />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <ShieldCheck className="size-3.5" />
              Quy chế thi trực tuyến Đại học Lạc Hồng
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {exam.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Thí sinh: <strong>{studentName}</strong> · Lượt thi #{activeAttempt.attempt_no} · Thời lượng: {exam.duration_minutes} phút
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="size-4 text-[#154C99] dark:text-[#3B82F6]" />
              Yêu cầu bắt buộc trong suốt giờ thi:
            </p>

            <div className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">1</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Chế độ Toàn màn hình (Lockdown):</strong>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">Không được nhấn Esc hoặc thu nhỏ trình duyệt. Thoát toàn màn hình được tính là 1 lần vi phạm.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">2</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Giám sát Camera AI định kỳ:</strong>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">Vui lòng cấp quyền truy cập Webcam. Hệ thống kiểm tra liên tục, không che ống kính máy ảnh.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">3</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Đề thi xáo trộn ngẫu nhiên:</strong>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">Thứ tự câu hỏi và 4 phương án A-B-C-D được đảo ngẫu nhiên riêng biệt cho từng thí sinh.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">4</span>
              <div>
                <strong className="text-rose-600 dark:text-rose-400">Đình chỉ thi nếu vi phạm 3 lần:</strong>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">Nếu rời tab hoặc thoát toàn màn hình chạm ngưỡng 3 lần, bài làm sẽ tự động nộp ngay lập tức.</p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleStartWithFullscreen}
            className="w-full gap-2 rounded-2xl py-6 text-sm sm:text-base font-bold bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] text-white shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Maximize2 className="size-5" />
            Bắt đầu làm bài (Chế độ Toàn màn hình)
          </Button>

          <p className="text-center text-[11px] text-slate-400">
            Bằng việc nhấn bắt đầu, bạn xác nhận tuân thủ toàn bộ quy chế thi cử của Đại học Lạc Hồng.
          </p>
        </div>
      </div>
    );
  }

  // ─── 5. GIAO DIỆN LÀM BÀI CHÍNH THỨC ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors select-none">
      {/* Khung Camera Giám sát AI (Picture-in-Picture góc dưới bên phải) */}
      <ExamWebcamProctor
        attemptId={activeAttempt.id}
        examId={exam.id}
        enabled={hasEnteredExam && !isSubmitting}
        onCameraViolation={handleCameraViolation}
      />

      {/* Top Fixed Exam Banner / Timer Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 shadow-xs backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <BrandLogo size="sm" className="hidden sm:inline-flex shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary font-semibold">
                  Lượt #{activeAttempt.attempt_no}
                </Badge>
                <Badge variant="outline" className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] hidden sm:inline-flex">
                  <Shuffle className="size-3 mr-1" /> Đề trộn ngẫu nhiên
                </Badge>
                <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
                  {exam.title}
                </h1>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block mt-0.5">
                {exam.subject?.name} · Thí sinh: <strong>{studentName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
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

            {/* Violation Counter Badge */}
            {tabSwitchCount > 0 && (
              <div
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  tabSwitchCount >= maxViolations
                    ? 'border border-red-300 bg-red-100 text-red-700 animate-pulse'
                    : 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
                title={`Đã vi phạm ${tabSwitchCount}/${maxViolations} lần`}
              >
                <ShieldAlert className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Vi phạm: {tabSwitchCount}/{maxViolations}</span>
              </div>
            )}

            {/* Countdown Clock */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs sm:text-sm font-bold transition shadow-xs ${
                isLowTime
                  ? 'animate-pulse bg-red-100 text-red-700 ring-1 ring-red-300'
                  : 'bg-slate-900 text-white dark:bg-slate-800'
              }`}
            >
              <Clock className="size-4" />
              <span>{formatTimer(timeLeftMs)}</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isSubmitting}
              className="gap-1.5 bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] text-white shadow-xs text-xs sm:text-sm"
            >
              <Send className="size-3.5" />
              <span>Nộp bài</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Exam Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Questions Container (Left / Center) */}
          <main className="space-y-6">
            {exam.instructions && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
                <span className="font-bold text-slate-800 dark:text-white">Hướng dẫn bài thi:</span>{' '}
                {exam.instructions}
              </div>
            )}

            {shuffledQuestions.map((q, idx) => {
              const isMC = q.question_type === 'multiple_choice';
              const currentAns = answers[q.id];
              const isAnswered = isMC
                ? Boolean(currentAns?.selected_option)
                : Boolean(currentAns?.answer_text?.trim());

              return (
                <Card
                  key={q.id}
                  id={`q-${q.id}`}
                  className={`scroll-mt-24 transition rounded-2xl ${
                    isAnswered
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-[#111C2D] shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]'
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold ${
                            isAnswered
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {isMC ? 'Trắc nghiệm' : 'Tự luận'}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                        {q.points} điểm
                      </Badge>
                    </div>

                    {/* Question Body with KaTeX */}
                    <div className="text-sm font-medium leading-relaxed text-slate-900 dark:text-white sm:text-base">
                      <MathText content={q.question_text} />
                    </div>

                    {/* Options (Multiple Choice) - Deterministic Seeded Shuffle */}
                    {isMC && q.options && q.options.length > 0 && (
                      <div className="mt-4 space-y-2.5">
                        {q.options.map((opt) => {
                          // So khớp phương án được chọn theo originalKey gốc
                          const isSelected = currentAns?.selected_option === opt.originalKey;
                          return (
                            <button
                              key={opt.originalKey}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.originalKey)}
                              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-medium ring-1 ring-emerald-600 shadow-2xs'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {opt.displayKey}
                              </span>
                              <div className="flex-1 pt-0.5 leading-normal">
                                <MathText content={opt.text} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Essay Text Area */}
                    {!isMC && (
                      <div className="mt-4 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Bài làm tự luận của bạn:
                        </label>
                        <textarea
                          rows={6}
                          value={currentAns?.answer_text || ''}
                          onChange={(e) => handleEssayChange(q.id, e.target.value)}
                          onBlur={() => handleEssayBlur(q.id)}
                          placeholder="Nhập nội dung bài làm hoặc các bước giải toán tại đây (hỗ trợ $công thức$ nếu cần)..."
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                          <span>Dữ liệu được tự động lưu khi bạn rời khỏi ô nhập liệu (blur).</span>
                          <span>{(currentAns?.answer_text || '').length} ký tự</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Bottom Actions */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 p-6 sm:flex-row shadow-2xs">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Đã trả lời {answeredCount} / {shuffledQuestions.length} câu hỏi
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hãy kiểm tra lại kỹ lưỡng trước khi bấm nộp bài.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setIsSubmitModalOpen(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto gap-2 bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] text-white cursor-pointer"
              >
                <Send className="size-4" /> Nộp bài thi
              </Button>
            </div>
          </main>

          {/* Right Question Palette / Navigator (Sticky Sidebar) */}
          <aside className="space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Mục lục câu hỏi</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tiến độ: <strong className="text-slate-800 dark:text-slate-200">{answeredCount}</strong> / {shuffledQuestions.length} câu
              </p>

              {/* Progress Bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${(answeredCount / shuffledQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question Grid Buttons */}
              <div className="mt-5 grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {shuffledQuestions.map((q, idx) => {
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
                      className={`flex size-10 items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                          : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={`Câu ${idx + 1} (${isDone ? 'Đã làm' : 'Chưa làm'})`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-600" />
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" />
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Manual Submit Confirmation Dialog */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                <Send className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Xác nhận nộp bài thi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hãy kiểm tra kỹ trước khi gửi bài</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Đã hoàn thành:</span>
                <strong className="text-slate-900 dark:text-white">
                  {answeredCount} / {shuffledQuestions.length} câu
                </strong>
              </div>
              {answeredCount < shuffledQuestions.length && (
                <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 font-medium pt-1">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Bạn còn {shuffledQuestions.length - answeredCount} câu chưa trả lời!</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Thời gian còn lại:</span>
                <strong className="text-slate-900 dark:text-white">{formatTimer(timeLeftMs)}</strong>
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
                className="cursor-pointer"
              >
                Tiếp tục làm bài
              </Button>
              <Button
                onClick={handleSubmitConfirm}
                disabled={isSubmitting}
                className="gap-2 bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] text-white cursor-pointer"
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

      {/* Proctoring Violation Alert Dialog (Fullscreen Exit / Tab Switch / Camera Blocked) */}
      <AlertDialog open={isWarningOpen} onOpenChange={dismissWarning}>
        <AlertDialogContent className="border-red-200 dark:border-red-900 max-w-lg bg-white dark:bg-[#111C2D]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                  isTerminated
                    ? 'bg-red-600 text-white animate-bounce'
                    : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                }`}
              >
                <ShieldAlert className="size-6" />
              </span>
              <div>
                <AlertDialogTitle className={isTerminated ? 'text-red-700 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-white font-bold'}>
                  {isTerminated
                    ? 'Đình chỉ làm bài do vi phạm quy chế'
                    : lastViolationReason === 'fullscreen_exit'
                      ? 'Cảnh báo: Phát hiện thoát Toàn màn hình!'
                      : lastViolationReason === 'camera_blocked'
                        ? 'Cảnh báo: Camera giám sát bị che khuất!'
                        : 'Cảnh báo: Phát hiện rời khỏi tab bài thi!'}
                </AlertDialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isTerminated
                    ? 'Hệ thống đã tự động khóa và nộp bài làm của bạn'
                    : 'Hệ thống giám sát thi cử trực tuyến tự động LHU'}
                </p>
              </div>
            </div>

            <AlertDialogDescription className="mt-3 text-slate-700 dark:text-slate-300">
              {isTerminated ? (
                <div className="space-y-2">
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    Bạn đã vi phạm quy chế phòng thi quá {maxViolations} lần cho phép.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Theo quy chế thi trực tuyến, bài làm của bạn đang được hệ thống <strong>tự động nộp ngay lập tức</strong>. Toàn bộ số lần vi phạm đã được lưu vết vào cơ sở dữ liệu để giáo viên đối chiếu khi chấm bài.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>
                    {lastViolationReason === 'fullscreen_exit'
                      ? 'Hệ thống phát hiện bạn vừa thoát khỏi chế độ Toàn màn hình (Lockdown). Vui lòng luôn giữ bài thi ở chế độ Toàn màn hình!'
                      : lastViolationReason === 'camera_blocked'
                        ? 'Camera giám sát của bạn bị tối đen hoặc bị che khuất. Vui lòng mở camera và đảm bảo đủ ánh sáng phòng thi.'
                        : 'Hệ thống ghi nhận bạn vừa chuyển sang ứng dụng khác hoặc tab khác trong lúc đang làm bài thi.'}
                  </p>

                  <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 text-xs">
                    <div className="flex justify-between font-bold text-amber-950 dark:text-amber-200">
                      <span>Số lần vi phạm đã ghi nhận:</span>
                      <span className="text-red-600 dark:text-red-400 font-extrabold">{tabSwitchCount} / {maxViolations} lần</span>
                    </div>
                    <div className="mt-1.5 text-amber-900 dark:text-amber-300">
                      Bạn chỉ còn <strong>{remainingChances}</strong> cơ hội trước khi bài thi bị <strong>TỰ ĐỘNG NỘP BẮT BUỘC</strong> và kết thúc phiên làm bài!
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Vui lòng nhấn nút bên dưới để quay lại chế độ Toàn màn hình và tiếp tục làm bài.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {isTerminated ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
                <LoaderCircle className="size-4 animate-spin" />
                <span>Đang tự động nộp bài thi lên hệ thống...</span>
              </div>
            ) : (
              <AlertDialogAction
                onClick={dismissWarning}
                className="w-full bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] text-white sm:w-auto cursor-pointer"
              >
                Quay lại Toàn màn hình để tiếp tục
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
