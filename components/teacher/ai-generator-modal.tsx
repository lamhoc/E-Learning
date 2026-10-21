'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MathText } from '@/components/ui/math-text';
import {
  generateAIQuestionsAction,
  saveAIQuestionsBatchAction,
} from '@/app/teacher/questions/ai-actions';
import type { SubjectSummary } from '@/lib/question-bank';
import type { AIDifficulty, GeneratedQuestionDraft } from '@/lib/ai-question-generator';

type AIGeneratorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectSummary[];
  onSuccess: () => void;
};

export function AIGeneratorModal({
  isOpen,
  onClose,
  subjects,
  onSuccess,
}: AIGeneratorModalProps) {
  const [step, setStep] = useState<'config' | 'review'>('config');

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'essay'>('multiple_choice');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [count, setCount] = useState<number>(3);
  const [additionalNote, setAdditionalNote] = useState('');

  // Generation & Review State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedQuestionDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);

    const res = await generateAIQuestionsAction({
      subjectId: selectedSubjectId,
      topic,
      questionType,
      difficulty,
      count,
      additionalNote,
    });

    setIsGenerating(false);

    if (res.status === 'error' || !res.questions) {
      setGenerateError(res.message);
    } else {
      setGeneratedDrafts(res.questions);
      // Select all by default
      setSelectedIds(new Set(res.questions.map((q) => q.tempId)));
      setStep('review');
    }
  };

  const handleToggleSelect = (tempId: string) => {
    const next = new Set(selectedIds);
    if (next.has(tempId)) {
      next.delete(tempId);
    } else {
      next.add(tempId);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === generatedDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedDrafts.map((q) => q.tempId)));
    }
  };

  const handleSaveApproved = async () => {
    const approvedQuestions = generatedDrafts.filter((q) => selectedIds.has(q.tempId));
    if (approvedQuestions.length === 0) return;

    setIsSaving(true);
    const res = await saveAIQuestionsBatchAction(selectedSubjectId, approvedQuestions);
    setIsSaving(false);

    if (res.status === 'error') {
      setGenerateError(res.message);
    } else {
      setSaveSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset state
        setStep('config');
        setSaveSuccessMsg(null);
        setGeneratedDrafts([]);
      }, 1200);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#17372e] to-[#2d6856] text-[#c9ed99] shadow-xs">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                AI Sinh câu hỏi tự động (Groq)
              </h2>
              <p className="text-xs text-muted-foreground">
                Tạo nhanh bộ câu hỏi khảo thí chuẩn xác kèm công thức LaTeX và lời giải chi tiết.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Đóng"
            disabled={isGenerating || isSaving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {saveSuccessMsg ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95">
              <span className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-7 stroke-[3]" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">Thành công!</h3>
              <p className="mt-1 text-sm text-muted-foreground">{saveSuccessMsg}</p>
            </div>
          ) : step === 'config' ? (
            /* STEP 1: CONFIGURATION */
            <form onSubmit={handleStartGenerate} className="space-y-4">
              {generateError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              {/* Subject & Question Type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-subject">Môn học áp dụng</Label>
                  <select
                    id="ai-subject"
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
                  <Label htmlFor="ai-type">Loại câu hỏi</Label>
                  <select
                    id="ai-type"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as 'multiple_choice' | 'essay')}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="multiple_choice">Trắc nghiệm (4 lựa chọn A-B-C-D)</option>
                    <option value="essay">Tự luận / Tự giải</option>
                  </select>
                </div>
              </div>

              {/* Topic / Knowledge Domain */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-topic">
                  Chủ đề / Bài học / Nội dung kiến thức <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ai-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  placeholder="Ví dụ: Ma trận vuông cấp 2, định thức và ma trận khả nghịch..."
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Gợi ý: Càng nêu rõ bài học hoặc dạng bài, AI sẽ tạo câu hỏi càng bám sát chương trình.
                </p>
              </div>

              {/* Difficulty & Quantity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-difficulty">Mức độ nhận thức</Label>
                  <select
                    id="ai-difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="easy">Nhận biết (Lý thuyết / 1 bước cơ bản)</option>
                    <option value="medium">Thông hiểu (Áp dụng công thức chuẩn)</option>
                    <option value="hard">Vận dụng (Bài toán logic nhiều bước)</option>
                    <option value="expert">Vận dụng cao (Phân loại học sinh giỏi)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-count">Số lượng câu hỏi cần sinh</Label>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCount(num)}
                        className={`flex-1 rounded-md border py-2 text-xs font-semibold transition ${
                          count === num
                            ? 'border-[#17372e] bg-[#17372e] text-white shadow-xs'
                            : 'border-input bg-background text-foreground hover:bg-muted'
                        }`}
                      >
                        {num} câu
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Instructions (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="ai-note">Yêu cầu bổ sung (tùy chọn)</Label>
                <textarea
                  id="ai-note"
                  rows={2}
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder="Ví dụ: Cho số liệu nguyên dễ tính, không dùng số thập phân quá dài..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isGenerating || !topic.trim()}
                  className="h-11 w-full gap-2 bg-[#17372e] text-white hover:bg-[#20493e] shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin text-[#c9ed99]" />
                      <span>AI đang suy nghĩ và sinh câu hỏi chuẩn LaTeX...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-[#c9ed99]" />
                      <span>Bắt đầu sinh {count} câu hỏi với AI</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* STEP 2: REVIEW & APPROVAL */
            <div className="space-y-5">
              {/* Review Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce7e0] bg-[#f8faf8] p-3.5">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('config')}
                    disabled={isSaving}
                    className="h-8 gap-1 text-xs"
                  >
                    <ArrowLeft className="size-3.5" /> Sửa cấu hình
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Môn: <strong className="text-foreground">{currentSubject?.name}</strong> · Chủ đề:{' '}
                    <strong className="text-foreground">{topic}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {selectedIds.size === generatedDrafts.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    Đã chọn: {selectedIds.size}/{generatedDrafts.length} câu
                  </span>
                </div>
              </div>

              {/* Draft Questions List */}
              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {generatedDrafts.map((draft, idx) => {
                  const isSelected = selectedIds.has(draft.tempId);
                  const isMC = draft.question_type === 'multiple_choice';

                  return (
                    <div
                      key={draft.tempId}
                      className={`relative rounded-xl border p-4 transition ${
                        isSelected
                          ? 'border-[#246348] bg-white ring-1 ring-[#246348]/25'
                          : 'border-border/60 bg-muted/20 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Select Checkbox & Number Badge */}
                      <div className="flex items-start justify-between gap-3 pb-2.5">
                        <label className="flex cursor-pointer items-center gap-2.5 select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(draft.tempId)}
                            className="size-4 rounded border-border text-[#246348] focus:ring-[#246348]"
                          />
                          <span className="text-xs font-bold text-foreground">
                            Câu hỏi #{idx + 1}
                          </span>
                        </label>

                        <Badge
                          className={
                            isMC
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-purple-200 bg-purple-50 text-purple-700'
                          }
                        >
                          {isMC ? 'Trắc nghiệm' : 'Tự luận'}
                        </Badge>
                      </div>

                      {/* Question Text */}
                      <MathText
                        content={draft.question_text}
                        className="text-sm font-medium leading-relaxed text-foreground"
                      />

                      {/* Multiple Choice Options */}
                      {isMC && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {(
                            [
                              { key: 'A', text: draft.option_a },
                              { key: 'B', text: draft.option_b },
                              { key: 'C', text: draft.option_c },
                              { key: 'D', text: draft.option_d },
                            ] as const
                          ).map((opt) => {
                            const isCorrect = draft.correct_option === opt.key;
                            return (
                              <div
                                key={opt.key}
                                className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${
                                  isCorrect
                                    ? 'border-[#246348] bg-[#eef6f1] text-[#1b4e38]'
                                    : 'border-border/70 bg-card text-foreground'
                                }`}
                              >
                                <span
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-full font-bold ${
                                    isCorrect
                                      ? 'bg-[#246348] text-white'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <MathText
                                  content={opt.text}
                                  className="min-w-0 flex-1 leading-relaxed"
                                />
                                {isCorrect && (
                                  <span className="text-[10px] font-semibold text-[#246348]">
                                    (Đáp án đúng)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Essay Fields */}
                      {!isMC && (
                        <div className="mt-3 space-y-1.5 rounded-lg border border-purple-100 bg-purple-50/40 p-2.5 text-xs">
                          {draft.model_answer && (
                            <div>
                              <strong className="text-purple-900">Đáp án mẫu:</strong>{' '}
                              <MathText
                                content={draft.model_answer}
                                className="inline text-purple-950"
                              />
                            </div>
                          )}
                          {draft.grading_rubric && (
                            <div>
                              <strong className="text-purple-900">Thang điểm:</strong>{' '}
                              <MathText
                                content={draft.grading_rubric}
                                className="inline text-purple-950"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation */}
                      {draft.explanation && (
                        <div className="mt-2.5 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                          <strong className="text-foreground">Giải thích:</strong>{' '}
                          <MathText content={draft.explanation} className="inline" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveApproved}
                  disabled={isSaving || selectedIds.size === 0}
                  className="gap-2 bg-[#17372e] text-white hover:bg-[#20493e]"
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin text-[#c9ed99]" />
                  ) : (
                    <CheckCircle2 className="size-4 text-[#c9ed99]" />
                  )}
                  {isSaving
                    ? 'Đang lưu vào ngân hàng...'
                    : `Lưu ${selectedIds.size} câu đã chọn vào ngân hàng`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

