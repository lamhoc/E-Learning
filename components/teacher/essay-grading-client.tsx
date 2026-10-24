'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type { EssayQuestionGradingItem, TeacherGradingPageData } from '@/lib/teacher-grading';

type EssayGradingClientProps = {
  data: TeacherGradingPageData;
};

type FormValues = {
  grades: Record<string, { points: number; feedback?: string }>;
};

// Hàm khởi tạo Schema Zod linh hoạt dựa trên danh sách câu hỏi tự luận và điểm tối đa của từng câu
function createGradingZodSchema(essayQuestions: EssayQuestionGradingItem[]) {
  const shape: Record<
    string,
    z.ZodObject<{
      points: z.ZodNumber;
      feedback: z.ZodOptional<z.ZodString>;
    }>
  > = {};

  essayQuestions.forEach((q) => {
    shape[q.questionId] = z.object({
      points: z
        .number()
        .min(0, 'Điểm số không được là số âm.')
        .max(q.points, `Điểm không được vượt quá tối đa (${q.points} điểm).`),
      feedback: z.string().max(2000, 'Nhận xét không được vượt quá 2000 ký tự.').optional(),
    });
  });

  return z.object({
    grades: z.object(shape),
  });
}

export function EssayGradingClient({ data }: EssayGradingClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Khởi tạo Schema Zod
  const gradingSchema = useMemo(() => {
    return createGradingZodSchema(data.essayQuestions);
  }, [data.essayQuestions]);

  // Giá trị khởi tạo
  const defaultValues: FormValues = useMemo(() => {
    const initialGrades: Record<string, { points: number; feedback?: string }> = {};
    data.essayQuestions.forEach((q) => {
      initialGrades[q.questionId] = {
        points: q.currentAwardedPoints !== null ? q.currentAwardedPoints : 0,
        feedback: q.currentFeedback || '',
      };
    });
    return { grades: initialGrades };
  }, [data.essayQuestions]);

  // Khởi tạo React Hook Form kết hợp Zod Resolver
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(gradingSchema) as never,
    defaultValues,
    mode: 'onChange',
  });

  // Watch grades để tự động cập nhật tổng điểm trực tiếp (Live Calculation)
  const watchedGrades = watch('grades') as Record<string, { points?: number; feedback?: string }> | undefined;

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isReleasedLocal, setIsReleasedLocal] = useState<boolean>(Boolean(data.releasedAt));

  // Tính tổng điểm phần tự luận đang chấm
  const currentEssayAwardedScore = useMemo(() => {
    if (!watchedGrades) return 0;
    const sum = Object.values(watchedGrades).reduce((acc: number, item) => {
      const val = typeof item?.points === 'number' && !isNaN(item.points) ? item.points : 0;
      return acc + val;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [watchedGrades]);

  // Tổng điểm toàn bài (Trắc nghiệm + Tự luận)
  const totalScorePreview = useMemo(() => {
    const sum = data.mcAwardedScore + currentEssayAwardedScore;
    return Math.round(sum * 100) / 100;
  }, [data.mcAwardedScore, currentEssayAwardedScore]);

  const maxTotalScore = data.mcTotalScore + data.essayMaxScore;

  // Cụm nút gán điểm nhanh (0%, 50%, 75%, 100%)
  const handleQuickPoints = (questionId: string, ratio: number, maxPoints: number) => {
    const val = Math.round(ratio * maxPoints * 100) / 100;
    // Set value thông qua React Hook Form để trigger validate Zod
    setValue(`grades.${questionId}.points` as never, val as never, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Submit Handler chung: phân biệt giữa Lưu tạm và Chốt điểm/Công bố
  const onValidSubmit = async (values: FormValues, releaseResult: boolean) => {
    setServerError(null);
    setToastMsg(null);

    const gradesPayload = data.essayQuestions.map((q) => {
      const item = values.grades?.[q.questionId];
      const pts = typeof item?.points === 'number' && !isNaN(item.points) ? item.points : 0;
      return {
        questionId: q.questionId,
        awardedPoints: pts,
        feedback: item?.feedback?.trim() || null,
      };
    });

    try {
      const response = await fetch(`/api/teacher/grading/${data.attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: data.examId,
          studentId: data.student.id,
          grades: gradesPayload,
          releaseResult,
        }),
      });

      const res = await response.json();

      if (response.ok && res && res.status === 'success') {
        setToastMsg({ type: 'success', text: res.message });
        setServerError(null);
        if (res.isReleased) {
          setIsReleasedLocal(true);
        }
        startTransition(() => {
          router.refresh();
        });
      } else {
        const errorText = res?.message || 'Có lỗi xảy ra khi lưu điểm từ máy chủ.';
        setServerError(errorText);
        setToastMsg({ type: 'error', text: errorText });
      }
    } catch (err: unknown) {
      console.error('Lỗi khi lưu điểm:', err);
      const errorMsg = err instanceof Error ? err.message : 'Đã có lỗi bất ngờ xảy ra khi lưu điểm.';
      setServerError(errorMsg);
      setToastMsg({ type: 'error', text: errorMsg });
    }
  };

  const getStatusBadge = () => {
    if (isReleasedLocal || data.releasedAt) {
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="size-3.5 mr-1" /> Đã công bố kết quả
        </Badge>
      );
    }
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
        <Clock className="size-3.5 mr-1" /> Chờ chấm tự luận
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 ${
            toastMsg.type === 'success'
              ? 'border-emerald-200 bg-white/95 text-emerald-950 ring-1 ring-emerald-500/20'
              : 'border-red-200 bg-white/95 text-red-950 ring-1 ring-red-500/20'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-red-600" />
          )}
          <span className="text-xs font-bold">{toastMsg.text}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/grading"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition shadow-2xs"
          >
            <ArrowLeft className="size-3.5" /> Danh sách bài thi
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-600 truncate max-w-[240px] sm:max-w-none">
            {data.exam.title}
          </span>
        </div>

        <div className="flex items-center gap-2">{getStatusBadge()}</div>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{serverError}</span>
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
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{data.exam.subjectCode} · {data.exam.subjectName}</span>
                  <span>•</span>
                  <span>Thời gian làm bài: {data.exam.durationMinutes} phút</span>
                </div>

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
              {/* Trắc nghiệm */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-center min-w-[110px]">
                <p className="text-[11px] font-semibold text-blue-700">Điểm Trắc nghiệm</p>
                <p className="mt-0.5 text-lg font-bold text-blue-900">
                  {data.mcAwardedScore} <span className="text-xs font-normal text-blue-600">/ {data.mcTotalScore}</span>
                </p>
              </div>

              {/* Tự luận (Live Calculation) */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-2.5 text-center min-w-[110px]">
                <p className="text-[11px] font-semibold text-purple-700">Điểm Tự luận (Live)</p>
                <p className="mt-0.5 text-lg font-bold text-purple-900">
                  {currentEssayAwardedScore} <span className="text-xs font-normal text-purple-600">/ {data.essayMaxScore}</span>
                </p>
              </div>

              {/* Tổng điểm */}
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

      {/* FORM CHẤM ĐIỂM TỰ LUẬN (REACT HOOK FORM + ZOD) */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
              Đề thi này không có câu hỏi tự luận (100% trắc nghiệm đã được hệ thống tự động chấm).
            </CardContent>
          </Card>
        ) : (
          data.essayQuestions.map((q) => {
            const currentPoints = watchedGrades?.[q.questionId]?.points ?? 0;
            const fieldError = (errors.grades as Record<string, { points?: { message?: string } }> | undefined)?.[q.questionId]?.points?.message;

            return (
              <Card
                key={q.questionId}
                className="overflow-hidden shadow-xs border-slate-200 transition hover:border-slate-300"
              >
                {/* Question Header */}
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
                      Đang cho: <span className="text-emerald-700 text-sm font-extrabold">{currentPoints}</span> / {q.points} đ
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* SPLIT VIEW: 2 COLUMNS ON DESKTOP */}
                  <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    {/* CỘT TRÁI: ĐỀ BÀI, ĐÁP ÁN MẪU & RUBRIC CHẤM ĐIỂM (KATEX) */}
                    <div className="p-5 sm:p-6 space-y-4 bg-slate-50/30">
                      {/* Đề bài */}
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Đề bài câu hỏi #{q.position}:
                        </Label>
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-900 leading-relaxed shadow-2xs">
                          <MathText content={q.questionText} />
                        </div>
                      </div>

                      {/* Đáp án mẫu (Model Answer) */}
                      {q.modelAnswer && (
                        <div className="space-y-1.5 rounded-xl border border-purple-200/80 bg-purple-50/50 p-4 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-purple-900">
                            <Sparkles className="size-3.5 text-purple-600" />
                            <span>Đáp án tham khảo / Bài giải mẫu:</span>
                          </div>
                          <div className="mt-1 text-purple-950 leading-relaxed font-normal">
                            <MathText content={q.modelAnswer} />
                          </div>
                        </div>
                      )}

                      {/* Thang điểm & Rubric */}
                      {q.gradingRubric && (
                        <div className="space-y-1.5 rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <Layers className="size-3.5 text-blue-600" />
                            <span>Thang điểm & Tiêu chuẩn chấm (Rubric):</span>
                          </div>
                          <div className="mt-1 text-blue-950 leading-relaxed font-normal">
                            <MathText content={q.gradingRubric} />
                          </div>
                        </div>
                      )}

                      {/* Lời giải chi tiết / Ghi chú */}
                      {q.explanation && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 text-[11px] text-amber-900 leading-relaxed">
                          <strong>Ghi chú:</strong> <MathText content={q.explanation} className="inline" />
                        </div>
                      )}
                    </div>

                    {/* CỘT PHẢI: BÀI LÀM CỦA SINH VIÊN, Ô NHẬP ĐIỂM & NHẬN XÉT */}
                    <div className="p-5 sm:p-6 space-y-5 bg-white flex flex-col justify-between">
                      {/* Bài làm của thí sinh */}
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

                      {/* Khung Nhập Điểm & Feedback có Zod Validation */}
                      <div className="space-y-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        {/* Ô nhập điểm */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <Label className="text-xs font-bold text-slate-800">
                              Điểm số chấm:
                            </Label>
                            <span className="text-[11px] text-slate-500">
                              (Tối đa: <strong>{q.points}</strong> điểm)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max={q.points}
                              {...register(`grades.${q.questionId}.points` as never, {
                                valueAsNumber: true,
                              })}
                              className={`h-9 w-32 rounded-xl bg-white font-mono text-sm font-bold text-center ${
                                fieldError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                              }`}
                            />

                            {/* Cụm nút gán điểm nhanh: 0%, 50%, 75%, 100% */}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleQuickPoints(q.questionId, 0, q.points)}
                                className="h-8 rounded-lg text-xs hover:bg-slate-100"
                                title="0% điểm"
                              >
                                0%
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleQuickPoints(q.questionId, 0.5, q.points)}
                                className="h-8 rounded-lg text-xs hover:bg-slate-100"
                                title="50% điểm"
                              >
                                50%
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleQuickPoints(q.questionId, 0.75, q.points)}
                                className="h-8 rounded-lg text-xs hover:bg-slate-100"
                                title="75% điểm"
                              >
                                75%
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleQuickPoints(q.questionId, 1, q.points)}
                                className="h-8 rounded-lg text-xs hover:bg-slate-100"
                                title="100% điểm"
                              >
                                100%
                              </Button>
                            </div>
                          </div>

                          {/* Error Message */}
                          {fieldError && (
                            <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="size-3 shrink-0" />
                              {fieldError}
                            </p>
                          )}
                        </div>

                        {/* Ô Nhập Nhận Xét (Feedback) */}
                        <div>
                          <Label className="text-xs font-bold text-slate-700 block mb-1">
                            Nhận xét / Lời khuyên cho câu này:
                          </Label>
                          <textarea
                            rows={2}
                            {...register(`grades.${q.questionId}.feedback` as never)}
                            placeholder="Nhận xét ưu điểm, lỗi sai hoặc giải pháp cải thiện cho thí sinh..."
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
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

        {/* BOTTOM ACTION BAR (STICKY) */}
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <Trophy className="size-5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">Tổng kết quả chấm:</p>
              <p className="text-base font-extrabold text-slate-900">
                {totalScorePreview}{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {maxTotalScore} điểm (TN: {data.mcAwardedScore} + TL: {currentEssayAwardedScore})
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Nút Lưu tạm điểm */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onValidSubmit(values, false))}
              className="flex-1 sm:flex-none gap-2 rounded-xl"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>Lưu tạm điểm</span>
            </Button>

            {/* Nút Chốt điểm & Công bố kết quả */}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onValidSubmit(values, true))}
              className="flex-1 sm:flex-none gap-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span>Chốt điểm & Công bố kết quả</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
