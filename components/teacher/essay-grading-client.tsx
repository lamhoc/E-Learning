'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  FileQuestion,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LoaderCircle,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MathText } from '@/components/ui/math-text';
import { saveEssayGradesAction } from '@/app/teacher/grading/[attemptId]/actions';
import type { TeacherGradingPageData } from '@/lib/teacher-grading';

type EssayGradingClientProps = {
  data: TeacherGradingPageData;
};

export function EssayGradingClient({ data }: EssayGradingClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Local state for grading each essay question: questionId -> { points, feedback }
  const [grades, setGrades] = useState<
    Record<string, { points: number; feedback: string }>
  >(() => {
    const initial: Record<string, { points: number; feedback: string }> = {};
    data.essayQuestions.forEach((q) => {
      initial[q.questionId] = {
        points: q.currentAwardedPoints !== null ? q.currentAwardedPoints : 0,
        feedback: q.currentFeedback || '',
      };
    });
    return initial;
  });

  // Action status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update points for a question
  const handlePointsChange = (questionId: string, maxPoints: number, val: string) => {
    const num = parseFloat(val);
    const safePoints = isNaN(num) ? 0 : Math.min(Math.max(0, num), maxPoints);
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: safePoints,
      },
    }));
  };

  // Quick points helpers (0%, 50%, 75%, 100%)
  const handleQuickPoints = (questionId: string, ratio: number, maxPoints: number) => {
    const val = Math.round(ratio * maxPoints * 100) / 100;
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: val,
      },
    }));
  };

  // Update feedback for a question
  const handleFeedbackChange = (questionId: string, text: string) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback: text,
      },
    }));
  };

  // Calculate scores
  const currentEssayAwardedScore = useMemo(() => {
    const sum = Object.values(grades).reduce((acc, g) => acc + (g.points || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [grades]);

  const totalScorePreview = useMemo(() => {
    const sum = data.mcAwardedScore + currentEssayAwardedScore;
    return Math.round(sum * 100) / 100;
  }, [data.mcAwardedScore, currentEssayAwardedScore]);

  const maxTotalScore = data.mcTotalScore + data.essayMaxScore;

  // Handle Save
  const handleSaveGrades = async (releaseResult: boolean) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setToastMsg(null);

    const gradesPayload = data.essayQuestions.map((q) => ({
      questionId: q.questionId,
      awardedPoints: grades[q.questionId]?.points ?? 0,
      feedback: grades[q.questionId]?.feedback ?? null,
    }));

    const res = await saveEssayGradesAction({
      attemptId: data.attemptId,
      examId: data.examId,
      studentId: data.student.id,
      grades: gradesPayload,
      releaseResult,
    });

    setIsSubmitting(false);

    if (res.status === 'error') {
      setErrorMsg(res.message);
      setToastMsg({ type: 'error', text: res.message });
    } else {
      setToastMsg({ type: 'success', text: res.message });
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft className="size-3.5" /> Quay về Tổng quan
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#e5f0e9] text-[#246348]">
              <FileCheck className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Chấm bài tự luận
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Đối chiếu bài làm của thí sinh với thang điểm và đáp án mẫu chuẩn khảo thí.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSaveGrades(false)}
            className="h-9 gap-1.5 text-xs font-semibold text-slate-700"
          >
            <Save className="size-3.5 text-slate-500" />
            Lưu tạm điểm
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveGrades(true)}
            className="h-9 gap-1.5 bg-[#17372e] text-xs font-bold text-white hover:bg-[#20493e] shadow-xs"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-3.5 animate-spin text-[#c9ed99]" />
            ) : (
              <Award className="size-3.5 text-[#c9ed99]" />
            )}
            <span>Chốt điểm & Công bố</span>
          </Button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-top-4 ${
            toastMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-destructive" />
          )}
          <span className="text-xs font-bold">{toastMsg.text}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="ml-2 rounded-md p-1 hover:bg-black/5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Candidate & Exam Metadata Banner */}
      <Card className="overflow-hidden shadow-xs border-slate-200">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Student & Exam Info */}
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#17372e] to-[#2d6856] text-white font-bold text-base shadow-xs">
                {data.student.fullName
                  .split(/\s+/)
                  .map((n) => n[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase()}
              </span>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {data.student.fullName}
                  </h2>
                  {data.student.studentCode && (
                    <Badge variant="outline" className="text-[11px] font-mono font-semibold">
                      MSSV: {data.student.studentCode}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-slate-300 text-[10px]">
                    Lượt #{data.attemptNo}
                  </Badge>
                  {data.releasedAt ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                      Đã công bố điểm
                    </Badge>
                  ) : (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                      Chờ chấm tự luận
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600 truncate">
                  Đề thi: <strong className="text-slate-900">{data.exam.title}</strong> · {data.exam.subjectName} ({data.exam.subjectCode})
                </p>

                <p className="text-[11px] text-slate-400">
                  Nộp bài lúc:{' '}
                  {data.submittedAt
                    ? new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      }).format(new Date(data.submittedAt))
                    : 'Chưa ghi nhận'}
                </p>
              </div>
            </div>

            {/* Score Strip */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
              {/* Multiple Choice Score */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-center min-w-[110px]">
                <p className="text-[11px] font-semibold text-blue-700">Điểm Trắc nghiệm</p>
                <p className="mt-0.5 text-lg font-bold text-blue-900">
                  {data.mcAwardedScore} <span className="text-xs font-normal text-blue-600">/ {data.mcTotalScore}</span>
                </p>
              </div>

              {/* Essay Score (Live) */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-2.5 text-center min-w-[110px]">
                <p className="text-[11px] font-semibold text-purple-700">Điểm Tự luận</p>
                <p className="mt-0.5 text-lg font-bold text-purple-900">
                  {currentEssayAwardedScore} <span className="text-xs font-normal text-purple-600">/ {data.essayMaxScore}</span>
                </p>
              </div>

              {/* Total Projected Score */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center min-w-[120px] ring-1 ring-emerald-300">
                <p className="text-[11px] font-bold text-emerald-800">TỔNG ĐIỂM</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-950">
                  {totalScorePreview} <span className="text-xs font-normal text-emerald-700">/ {maxTotalScore}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proctoring Warning Banner if Student Switched Tabs */}
      {data.proctoring?.hasViolations && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-950 shadow-xs">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-red-900">
                Cảnh báo giám thị AI: Thí sinh đã rời khỏi tab bài thi {data.proctoring.tabSwitchCount} lần!
              </h4>
              <Badge className="border-red-300 bg-red-100 text-red-800 text-[10px] font-bold">
                {data.proctoring.tabSwitchCount >= 3 ? 'Đã quá ngưỡng (Auto-submit)' : 'Cần lưu ý khi chấm'}
              </Badge>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              Hệ thống ghi nhận thí sinh đã chuyển đổi tab hoặc mở ứng dụng khác {data.proctoring.tabSwitchCount} lần trong lúc làm bài. Thầy/cô vui lòng đối chiếu kỹ lời giải tự luận với đáp án mẫu để phát hiện nghi vấn gian lận hoặc sao chép.
            </p>
          </div>
        </div>
      )}

      {/* ESSAY QUESTIONS LIST (SPLIT VIEW) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-[#17372e] text-[11px] font-bold text-white">
              {data.essayQuestions.length}
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Danh sách câu hỏi tự luận cần chấm điểm
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Điểm tối đa phần tự luận: <strong>{data.essayMaxScore} điểm</strong>
          </span>
        </div>

        {data.essayQuestions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-xs text-slate-400">
              Đề thi này không có câu hỏi tự luận (100% trắc nghiệm đã được chấm tự động).
            </CardContent>
          </Card>
        ) : (
          data.essayQuestions.map((q, idx) => {
            const currentPoints = grades[q.questionId]?.points ?? 0;
            const currentFeedback = grades[q.questionId]?.feedback ?? '';

            return (
              <Card
                key={q.questionId}
                className="overflow-hidden shadow-xs border-slate-200 transition hover:border-slate-300"
              >
                {/* Question Card Header */}
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 py-3 px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#17372e] text-xs font-bold text-white">
                      Câu {q.position}
                    </span>
                    <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold">
                      Tự luận · Tối đa {q.points} điểm
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Đang cho: <span className="text-emerald-700 text-sm">{currentPoints}</span> / {q.points} đ
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* SPLIT VIEW: 2 COLUMNS ON DESKTOP */}
                  <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    {/* LEFT PANEL: PROMPT & STANDARD ANSWER KEY */}
                    <div className="p-5 sm:p-6 space-y-4 bg-slate-50/30">
                      {/* Question Text */}
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Đề bài câu hỏi #{q.position}:
                        </Label>
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-900 leading-relaxed shadow-2xs">
                          <MathText content={q.questionText} />
                        </div>
                      </div>

                      {/* Model Answer (KaTeX) */}
                      {q.modelAnswer && (
                        <div className="space-y-1.5 rounded-xl border border-purple-200/80 bg-purple-50/50 p-4 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-purple-900">
                            <Sparkles className="size-3.5 text-purple-600" />
                            <span>Đáp án tham khảo / Bài giải mẫu:</span>
                          </div>
                          <div className="mt-1 text-purple-950 leading-relaxed">
                            <MathText content={q.modelAnswer} />
                          </div>
                        </div>
                      )}

                      {/* Grading Rubric */}
                      {q.gradingRubric && (
                        <div className="space-y-1.5 rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <Layers className="size-3.5 text-blue-600" />
                            <span>Thang điểm & Tiêu chuẩn chấm (Rubric):</span>
                          </div>
                          <div className="mt-1 text-blue-950 leading-relaxed">
                            <MathText content={q.gradingRubric} />
                          </div>
                        </div>
                      )}

                      {/* Explanation note */}
                      {q.explanation && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 text-[11px] text-amber-900 leading-relaxed">
                          <strong>Ghi chú:</strong> <MathText content={q.explanation} className="inline" />
                        </div>
                      )}
                    </div>

                    {/* RIGHT PANEL: STUDENT SUBMISSION & GRADING FORM */}
                    <div className="p-5 sm:p-6 space-y-5 bg-white flex flex-col justify-between">
                      {/* Student's Answer */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <User className="size-3.5 text-slate-500" />
                            Bài làm của thí sinh:
                          </Label>
                          <span className="text-[11px] text-slate-400">
                            {q.studentAnswerText?.length || 0} ký tự
                          </span>
                        </div>

                        <div className="min-h-[160px] rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-900 leading-relaxed shadow-inner">
                          {q.studentAnswerText && q.studentAnswerText.trim() ? (
                            <MathText content={q.studentAnswerText} />
                          ) : (
                            <span className="italic text-slate-400 text-xs">
                              (Thí sinh không nhập nội dung câu trả lời cho câu này)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grading Input & Feedback Controls */}
                      <div className="space-y-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        {/* Points Control */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <Label className="text-xs font-bold text-slate-800">
                              Điểm chấm cho câu #{q.position}:
                            </Label>
                            <span className="text-[11px] text-slate-500">
                              (Tối đa: <strong>{q.points}</strong> điểm)
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Number Input */}
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.25"
                                min={0}
                                max={q.points}
                                value={currentPoints}
                                onChange={(e) =>
                                  handlePointsChange(q.questionId, q.points, e.target.value)
                                }
                                className="h-9 w-24 text-center font-bold text-sm bg-white border-slate-300 text-emerald-800 focus:ring-emerald-500"
                              />
                            </div>

                            {/* Quick score buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickPoints(q.questionId, 0, q.points)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                0đ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPoints(q.questionId, 0.5, q.points)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPoints(q.questionId, 0.75, q.points)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                75%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPoints(q.questionId, 1, q.points)}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                              >
                                100% ({q.points}đ)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Feedback Textarea */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Nhận xét / Góp ý cho thí sinh (tùy chọn):
                          </Label>
                          <textarea
                            rows={2}
                            value={currentFeedback}
                            onChange={(e) => handleFeedbackChange(q.questionId, e.target.value)}
                            placeholder="Chỉ ra điểm làm đúng, thiếu sót hoặc lỗi tư duy trong bài..."
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-5 py-3.5 shadow-2xl backdrop-blur-md lg:pl-[268px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <Trophy className="size-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Tổng điểm toàn bài dự kiến:</p>
              <p className="text-base font-bold text-slate-900">
                <span className="text-emerald-700 text-lg">{totalScorePreview}</span> / {maxTotalScore} điểm
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (TN: {data.mcAwardedScore}đ + TL: {currentEssayAwardedScore}đ)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleSaveGrades(false)}
              className="h-10 text-xs font-semibold text-slate-700"
            >
              <Save className="size-3.5 mr-1 text-slate-500" />
              Lưu tạm điểm
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveGrades(true)}
              className="h-10 gap-1.5 bg-[#17372e] text-xs font-bold text-white hover:bg-[#20493e] shadow-sm"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin text-[#c9ed99]" />
              ) : (
                <Award className="size-4 text-[#c9ed99]" />
              )}
              <span>Chốt điểm & Công bố</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

