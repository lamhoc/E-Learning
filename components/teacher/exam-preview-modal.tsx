'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileQuestion,
  FileText,
  Printer,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/math-text';
import type { BankQuestion } from '@/lib/question-bank';

type ExamPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  questions: BankQuestion[];
  subjectName?: string;
};

export function ExamPreviewModal({
  isOpen,
  onClose,
  questions,
  subjectName,
}: ExamPreviewModalProps) {
  const [showAnswers, setShowAnswers] = useState(true);

  if (!isOpen) return null;

  const totalQuestions = questions.length;
  const mcCount = questions.filter((q) => q.question_type === 'multiple_choice').length;
  const essayCount = questions.filter((q) => q.question_type === 'essay').length;
  const estimatedMinutes = Math.max(15, Math.round(mcCount * 1.5 + essayCount * 5));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header Actions (ẩn khi print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/40 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
              <FileText className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Xem trước đề thi từ ngân hàng câu hỏi
              </h2>
              <p className="text-xs text-muted-foreground">
                Môn: <strong className="text-foreground">{subjectName || 'Tất cả môn'}</strong> · {totalQuestions} câu hỏi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAnswers(!showAnswers)}
              className="h-8 gap-1.5 text-xs"
            >
              {showAnswers ? (
                <>
                  <EyeOff className="size-3.5" /> Ẩn đáp án
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Hiện đáp án
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs text-[#17372e] hover:bg-[#eef6f1]"
            >
              <Printer className="size-3.5" /> In đề thi
            </Button>

            <button
              onClick={onClose}
              type="button"
              aria-label="Đóng"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Paper Document Preview Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-8 print:bg-white print:p-0">
          <div className="mx-auto max-w-[800px] rounded-xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm print:border-none print:p-0 print:shadow-none">
            {/* Header Kiểu Đề Thi Quốc Gia / Học Phần */}
            <div className="border-b-2 border-slate-900 pb-5 text-center">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <div className="text-left">
                  <p>HỆ THỐNG ĐÀO TẠO MẦM HỌC</p>
                  <p className="font-normal text-slate-500">NGÂN HÀNG KHẢO THÍ CHUẨN</p>
                </div>
                <div className="text-right">
                  <p>ĐỀ THI ĐÁNH GIÁ NĂNG LỰC</p>
                  <p className="font-normal text-slate-500">HỌC KỲ HIỆN HÀNH</p>
                </div>
              </div>

              <h1 className="mt-4 text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">
                ĐỀ THI MÔN: {subjectName || 'TỔNG HỢP'}
              </h1>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> Thời gian làm bài dự kiến: <strong>{estimatedMinutes} phút</strong>
                </span>
                <span>•</span>
                <span>Tổng số câu hỏi: <strong>{totalQuestions} câu</strong></span>
                {mcCount > 0 && <span>(Trắc nghiệm: {mcCount})</span>}
                {essayCount > 0 && <span>(Tự luận: {essayCount})</span>}
              </div>

              <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs italic text-slate-500 print:bg-transparent">
                (Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm)
              </div>
            </div>

            {/* Danh Sách Câu Hỏi */}
            <div className="mt-6 space-y-6">
              {questions.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Không có câu hỏi nào để hiển thị trong đề thi xem trước.
                </div>
              ) : (
                questions.map((q, idx) => {
                  const isMC = q.question_type === 'multiple_choice';
                  const correctKey = q.answer_key?.correct_option_key;

                  return (
                    <div
                      key={q.id}
                      className="break-inside-avoid space-y-2.5 rounded-lg border border-slate-100 p-3.5 sm:p-4 hover:border-slate-300 print:border-none print:p-0"
                    >
                      {/* Đề bài */}
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-900">
                          Câu {idx + 1}:
                        </span>
                        <div className="flex-1 font-medium leading-relaxed text-slate-800">
                          <MathText content={q.question_text} />
                        </div>
                      </div>

                      {/* Các lựa chọn Trắc nghiệm */}
                      {isMC && q.options && q.options.length > 0 && (
                        <div className="grid gap-2 pl-4 sm:grid-cols-2">
                          {q.options.map((opt) => {
                            const isCorrect = opt.option_key === correctKey;
                            const shouldHighlight = showAnswers && isCorrect;

                            return (
                              <div
                                key={opt.option_key}
                                className={`flex items-baseline gap-2 rounded-md p-1.5 text-xs leading-relaxed ${
                                  shouldHighlight
                                    ? 'bg-emerald-50 font-semibold text-emerald-900 print:bg-transparent print:font-bold'
                                    : 'text-slate-700'
                                }`}
                              >
                                <span
                                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    shouldHighlight
                                      ? 'bg-emerald-600 text-white print:border print:border-slate-900 print:bg-transparent print:text-slate-900'
                                      : 'bg-slate-100 text-slate-700 print:bg-transparent'
                                  }`}
                                >
                                  {opt.option_key}
                                </span>
                                <div className="flex-1">
                                  <MathText content={opt.option_text} />
                                </div>
                                {shouldHighlight && (
                                  <span className="text-[10px] text-emerald-600 print:hidden">
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Tự luận */}
                      {!isMC && (
                        <div className="pl-4">
                          <div className="h-16 rounded border border-dashed border-slate-300 bg-slate-50/50 print:h-24 print:border-slate-400" />
                          <p className="mt-1 text-[11px] italic text-slate-400 print:hidden">
                            (Phần dành cho thí sinh trình bày bài giải tự luận)
                          </p>
                        </div>
                      )}

                      {/* Đáp án & Lời giải (Chỉ hiện khi bật showAnswers) */}
                      {showAnswers && (
                        <div className="mt-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs text-slate-700 print:border-slate-300 print:bg-slate-50">
                          {isMC && correctKey && (
                            <p className="font-semibold text-emerald-900">
                              Đáp án đúng: <span className="underline">{correctKey}</span>
                            </p>
                          )}

                          {!isMC && q.answer_key?.model_answer && (
                            <div className="mt-1">
                              <span className="font-semibold text-emerald-900">Đáp án mẫu:</span>{' '}
                              <MathText content={q.answer_key.model_answer} className="inline text-slate-800" />
                            </div>
                          )}

                          {!isMC && q.answer_key?.grading_rubric && (
                            <div className="mt-1">
                              <span className="font-semibold text-emerald-900">Thang điểm chấm:</span>{' '}
                              <MathText content={q.answer_key.grading_rubric} className="inline text-slate-800" />
                            </div>
                          )}

                          {q.explanation && (
                            <div className="mt-1 flex items-start gap-1 text-slate-600">
                              <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-600" />
                              <div className="flex-1">
                                <span className="font-semibold text-slate-700">Lời giải chi tiết:</span>{' '}
                                <MathText content={q.explanation} className="inline" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Đề thi */}
            <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              --- HẾT ---
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
