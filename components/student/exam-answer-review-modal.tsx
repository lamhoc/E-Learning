'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MathText, stripLeadingQuestionPrefix } from '@/components/ui/math-text';
import { fetchAttemptReviewAction } from '@/app/student/exams/[examId]/review-action';
import type { AttemptReviewData, AttemptReviewQuestion } from '@/lib/student-exam-review';

type Props = {
  attemptId: string;
  examTitle: string;
  attemptNo: number;
  isOpen: boolean;
  onClose: () => void;
  onAskTutor?: (questionNumber: number, questionText: string) => void;
};

export function ExamAnswerReviewModal({
  attemptId,
  examTitle,
  attemptNo,
  isOpen,
  onClose,
  onAskTutor,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttemptReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'correct' | 'essay'>('all');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    void fetchAttemptReviewAction(attemptId).then((res) => {
      if (!isMounted) return;
      setLoading(false);
      if (res.status === 'success') {
        setData(res.data);
      } else {
        setError(res.message);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, attemptId]);

  // Đóng khi bấm ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    return data.questions.filter((q) => {
      if (filter === 'all') return true;
      if (filter === 'incorrect') return q.isCorrect === false;
      if (filter === 'correct') return q.isCorrect === true;
      if (filter === 'essay') return q.questionType === 'essay';
      return true;
    });
  }, [data, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-review-title"
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1628] px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-10 place-items-center rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
              <FileCheck2 className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                  Lượt #{attemptNo}
                </Badge>
                <h2 id="exam-review-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  Chi tiết bài làm & Đối chiếu đáp án
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {examTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="grid size-9 place-items-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <LoaderCircle className="size-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Đang nạp dữ liệu câu hỏi và đối chiếu kết quả...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-5 text-center space-y-2">
              <AlertCircle className="mx-auto size-7 text-rose-600 dark:text-rose-400" />
              <h3 className="font-bold text-rose-800 dark:text-rose-200">Không thể tải bài làm</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
              <Button size="sm" variant="outline" onClick={() => fetchAttemptReviewAction(attemptId)}>
                Thử lại
              </Button>
            </div>
          ) : data ? (
            <>
              {/* 1. Thanh Tổng Kết Metric */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 text-center">
                  <Trophy className="mx-auto size-5 text-blue-600 dark:text-blue-400" />
                  <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Tổng điểm</p>
                  <p className="mt-0.5 text-xl font-extrabold text-blue-700 dark:text-blue-300">
                    {data.totalScore != null ? Number(data.totalScore).toFixed(1) : '—'}
                    <span className="text-xs font-normal text-slate-500"> / 10</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 text-center">
                  <CheckCircle2 className="mx-auto size-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Số câu đúng</p>
                  <p className="mt-0.5 text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {data.correctCount}
                    <span className="text-xs font-normal text-slate-500"> / {data.totalQuestions}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 p-3.5 text-center">
                  <XCircle className="mx-auto size-5 text-rose-600 dark:text-rose-400" />
                  <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Số câu sai</p>
                  <p className="mt-0.5 text-xl font-extrabold text-rose-700 dark:text-rose-300">
                    {data.incorrectCount}
                    <span className="text-xs font-normal text-slate-500"> / {data.totalQuestions}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-3.5 text-center">
                  <HelpCircle className="mx-auto size-5 text-slate-500 dark:text-slate-400" />
                  <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Chưa làm / Bỏ trống</p>
                  <p className="mt-0.5 text-xl font-extrabold text-slate-700 dark:text-slate-300">
                    {data.unansweredCount}
                    <span className="text-xs font-normal text-slate-500"> câu</span>
                  </p>
                </div>
              </div>

              {/* 2. Thanh lọc nhanh (Filter Pills) */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Tất cả ({data.totalQuestions})
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('incorrect')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    filter === 'incorrect'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  ❌ Câu làm sai ({data.incorrectCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('correct')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    filter === 'correct'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60'
                  }`}
                >
                  ✅ Câu làm đúng ({data.correctCount})
                </button>

                {data.questions.some((q) => q.questionType === 'essay') && (
                  <button
                    type="button"
                    onClick={() => setFilter('essay')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      filter === 'essay'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60'
                    }`}
                  >
                    📝 Tự luận ({data.questions.filter((q) => q.questionType === 'essay').length})
                  </button>
                )}
              </div>

              {/* 3. Danh sách câu hỏi chi tiết */}
              <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">
                    Không có câu hỏi nào khớp với bộ lọc đang chọn.
                  </p>
                ) : (
                  filteredQuestions.map((q) => (
                    <div
                      key={q.questionId}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      {/* Top Header của câu */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            Câu {q.questionNumber}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-normal border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {q.questionType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            ({q.awardedPoints != null ? q.awardedPoints : 0} / {q.maxPoints} điểm)
                          </span>
                        </div>

                        <div>
                          {q.isCorrect === true ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1">
                              <CheckCircle2 className="size-3.5" /> Chính xác
                            </Badge>
                          ) : q.isCorrect === false ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-semibold gap-1">
                              <XCircle className="size-3.5" /> Làm sai
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs">
                              ⏳ Chờ chấm
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Nội dung đề bài */}
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                        <MathText content={stripLeadingQuestionPrefix(q.questionText)} />
                      </div>

                      {/* Các phương án Trắc nghiệm */}
                      {q.questionType === 'multiple_choice' && (
                        <div className="space-y-2 pt-1">
                          {q.options.map((opt) => {
                            const isStudentPick = q.studentOption === opt.key;
                            const isCorrectPick = data.showAnswers && q.correctOption === opt.key;

                            let optionClasses = 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200';
                            if (isStudentPick && isCorrectPick) {
                              optionClasses = 'border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/40';
                            } else if (isStudentPick && !isCorrectPick) {
                              optionClasses = 'border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100 font-medium ring-1 ring-rose-400/30';
                            } else if (!isStudentPick && isCorrectPick) {
                              optionClasses = 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-semibold';
                            }

                            return (
                              <div
                                key={opt.key}
                                className={`flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm transition-colors ${optionClasses}`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="grid size-6 shrink-0 place-items-center rounded-lg font-bold text-xs bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                                    {opt.key}
                                  </span>
                                  <div className="min-w-0 pt-0.5">
                                    <MathText content={opt.text} />
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                                  {isStudentPick && (
                                    <Badge
                                      className={`text-[10px] ${
                                        isCorrectPick
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-rose-600 text-white'
                                      }`}
                                    >
                                      Bạn chọn
                                    </Badge>
                                  )}
                                  {isCorrectPick && !isStudentPick && (
                                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                      <Check className="size-3" /> Đáp án đúng
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Phần câu trả lời Tự luận */}
                      {q.questionType === 'essay' && (
                        <div className="space-y-3 pt-1">
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Bài làm của bạn:
                            </span>
                            <div className="text-xs text-slate-800 dark:text-slate-200">
                              {q.studentText ? (
                                <MathText content={q.studentText} />
                              ) : (
                                <span className="italic text-slate-400">Không có câu trả lời</span>
                              )}
                            </div>
                          </div>

                          {data.showAnswers && q.modelAnswer && (
                            <div className="rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                Đáp án tham khảo:
                              </span>
                              <div className="text-xs text-emerald-950 dark:text-emerald-200">
                                <MathText content={q.modelAnswer} />
                              </div>
                            </div>
                          )}

                          {q.teacherFeedback && (
                            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3 space-y-1">
                              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                <MessageSquare className="size-3.5" /> Nhận xét chấm bài:
                              </span>
                              <MathText content={q.teacherFeedback} className="text-xs text-blue-950 dark:text-blue-200" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lời giải chi tiết (Nếu có) */}
                      {data.showAnswers && q.explanation && (
                        <div className="rounded-xl border border-blue-200/90 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 text-xs font-bold">
                            <Lightbulb className="size-4 text-amber-500" />
                            <span>💡 Lời giải chi tiết:</span>
                          </div>
                          <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 pl-5">
                            <MathText content={q.explanation} />
                          </div>
                        </div>
                      )}

                      {/* Footer thẻ: Nút hỏi Gia sư AI */}
                      {onAskTutor && (
                        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onAskTutor(q.questionNumber, q.questionText)}
                            className="text-xs font-semibold gap-1.5 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/60 cursor-pointer"
                          >
                            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                            <span>Hỏi Gia sư AI câu này</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1628] px-5 py-3 shrink-0">
          <p className="text-[11px] text-slate-400">
            Hệ thống Khảo thí Trực tuyến Đại học Lạc Hồng (LHU)
          </p>
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Đóng
          </Button>
        </footer>
      </div>
    </div>
  );
}
