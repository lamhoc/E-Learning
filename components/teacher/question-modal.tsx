'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileQuestion,
  LoaderCircle,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  createQuestion,
  updateQuestion,
  type QuestionActionState,
} from '@/app/teacher/questions/actions';
import type { BankQuestion, SubjectSummary } from '@/lib/question-bank';

type QuestionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectSummary[];
  questionToEdit?: BankQuestion | null;
};

const initialState: QuestionActionState = { status: 'idle', message: '' };

export function QuestionModal({
  isOpen,
  onClose,
  subjects,
  questionToEdit,
}: QuestionModalProps) {
  const isEditing = Boolean(questionToEdit);

  const [questionType, setQuestionType] = useState<'multiple_choice' | 'essay'>(
    questionToEdit?.question_type ?? 'multiple_choice',
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    questionToEdit?.subject_id ?? subjects[0]?.id ?? '',
  );
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>(
    (questionToEdit?.answer_key?.correct_option_key as 'A' | 'B' | 'C' | 'D') ?? 'A',
  );

  const actionFn = isEditing ? updateQuestion : createQuestion;
  const [state, formAction, pending] = useActionState(actionFn, initialState);

  // Close modal on success
  useEffect(() => {
    if (state.status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [state.status, onClose]);

  if (!isOpen) return null;

  // Extract initial option texts if editing
  const optA = questionToEdit?.options?.find((o) => o.option_key === 'A')?.option_text ?? '';
  const optB = questionToEdit?.options?.find((o) => o.option_key === 'B')?.option_text ?? '';
  const optC = questionToEdit?.options?.find((o) => o.option_key === 'C')?.option_text ?? '';
  const optD = questionToEdit?.options?.find((o) => o.option_key === 'D')?.option_text ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-7">
        <button
          onClick={onClose}
          type="button"
          aria-label="Đóng"
          className="absolute top-5 right-5 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e5f0e9] text-[#246348]">
            {isEditing ? <FileQuestion className="size-5" /> : <Plus className="size-5" />}
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? 'Cập nhật nội dung hoặc đáp án trong ngân hàng đề.'
                : 'Thêm câu hỏi mới vào ngân hàng đề thi của bạn.'}
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          {isEditing && (
            <input type="hidden" name="questionId" value={questionToEdit?.id} />
          )}

          {/* Subject & Question Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-subject">Môn học</Label>
              <select
                id="q-subject"
                name="subjectId"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} · {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-type">Loại câu hỏi</Label>
              <select
                id="q-type"
                name="questionType"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as 'multiple_choice' | 'essay')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="multiple_choice">Trắc nghiệm (4 lựa chọn A-B-C-D)</option>
                <option value="essay">Tự luận / Tự trả lời</option>
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Nội dung câu hỏi <span className="text-destructive">*</span></Label>
            <textarea
              id="q-text"
              name="questionText"
              rows={3}
              required
              minLength={3}
              defaultValue={questionToEdit?.question_text ?? ''}
              placeholder="Nhập đề bài hoặc câu hỏi..."
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Multiple Choice Options */}
          {questionType === 'multiple_choice' ? (
            <div className="space-y-3 rounded-xl border border-[#dce7e0] bg-[#f7f9f7] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#246348]">
                  Các phương án & Chọn đáp án đúng
                </span>
                <span className="text-xs text-muted-foreground">
                  Click vào chữ cái để chọn đáp án đúng
                </span>
              </div>

              <input type="hidden" name="correctOptionKey" value={correctOption} />

              <div className="grid gap-2.5 sm:grid-cols-2">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const isCorrect = correctOption === key;
                  const defaultVal =
                    key === 'A' ? optA : key === 'B' ? optB : key === 'C' ? optC : optD;

                  return (
                    <div
                      key={key}
                      className={`relative flex items-center rounded-lg border bg-card p-1.5 transition ${
                        isCorrect
                          ? 'border-[#246348] ring-2 ring-[#246348]/20'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption(key)}
                        title={`Chọn ${key} là đáp án đúng`}
                        className={`mr-2 flex size-8 shrink-0 items-center justify-center rounded-md font-bold text-xs transition ${
                          isCorrect
                            ? 'bg-[#246348] text-white shadow-xs'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {key}
                      </button>
                      <input
                        type="text"
                        name={`option${key}`}
                        required
                        defaultValue={defaultVal}
                        placeholder={`Nội dung lựa chọn ${key}`}
                        className="h-8 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/60"
                      />
                      {isCorrect && (
                        <CheckCircle2 className="mr-2 size-4 text-[#246348]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Essay Fields */
            <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="q-model-answer" className="text-purple-900">
                  Đáp án tham khảo / Gợi ý làm bài
                </Label>
                <textarea
                  id="q-model-answer"
                  name="modelAnswer"
                  rows={2}
                  defaultValue={questionToEdit?.answer_key?.model_answer ?? ''}
                  placeholder="Nêu ngắn gọn các ý chính hoặc kết quả chuẩn..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-grading-rubric" className="text-purple-900">
                  Thang điểm & Hướng dẫn chấm (Rubric)
                </Label>
                <textarea
                  id="q-grading-rubric"
                  name="gradingRubric"
                  rows={2}
                  defaultValue={questionToEdit?.answer_key?.grading_rubric ?? ''}
                  placeholder="Ví dụ: Bước 1 được 0.5đ, Bước 2 tính ra đáp số được 0.5đ..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-1.5">
            <Label htmlFor="q-explanation">
              Lời giải chi tiết / Giải thích kiến thức (tùy chọn)
            </Label>
            <textarea
              id="q-explanation"
              name="explanation"
              rows={2}
              defaultValue={questionToEdit?.explanation ?? ''}
              placeholder="Giải thích vì sao đáp án này đúng để hỗ trợ sinh viên khi xem lại bài..."
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {state.message && (
            <div
              role={state.status === 'error' ? 'alert' : 'status'}
              className={`rounded-lg border px-3.5 py-2.5 text-sm ${
                state.status === 'error'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {state.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="gap-2 bg-[#17372e] text-white hover:bg-[#20493e]"
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isEditing ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {pending
                ? isEditing
                  ? 'Đang lưu...'
                  : 'Đang tạo...'
                : isEditing
                ? 'Lưu thay đổi'
                : 'Tạo câu hỏi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
