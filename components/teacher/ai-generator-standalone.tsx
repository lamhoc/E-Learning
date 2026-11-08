'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Cpu,
  FileQuestion,
  LibraryBig,
  LoaderCircle,
  Pencil,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MathText } from '@/components/ui/math-text';
import {
  generateAIQuestionsAction,
  saveAIQuestionsBatchAction,
} from '@/app/teacher/questions/ai-actions';
import type { SubjectSummary } from '@/lib/question-bank';
import type { AIDifficulty, GeneratedQuestionDraft } from '@/lib/ai-question-generator';

type Props = {
  subjects: SubjectSummary[];
  teacherName: string;
};

const LOADING_STAGES = [
  'Đang kết nối tới siêu mô hình Groq AI...',
  'Đang phân tích chủ đề và biên soạn câu hỏi chuẩn KaTeX LaTeX...',
  'Đang thiết lập phương án nhiễu & lời giải chi tiết...',
  'Đang kiểm tra tính nhất quán và hoàn thiện dữ liệu câu hỏi...',
];

const PROMPT_SUGGESTIONS = [
  'Đạo hàm và khảo sát hàm số',
  'Lập trình Hướng đối tượng OOP trong C#',
  'Mô hình mạng OSI và giao thức TCP/IP',
  'Cơ sở dữ liệu quan hệ và chuẩn hóa dữ liệu 3NF',
  'Cấu trúc dữ liệu Cây nhị phân tìm kiếm (BST)',
];

export function AIGeneratorStandalone({ subjects, teacherName }: Props) {
  const [step, setStep] = useState<'config' | 'review'>('config');

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'essay'>('multiple_choice');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [count, setCount] = useState<number>(5);
  const [additionalNote, setAdditionalNote] = useState('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedQuestionDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Edit State
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GeneratedQuestionDraft | null>(null);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setLoadingStageIdx(0);
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleStartGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);
    setSaveSuccessMsg(null);

    const res = await generateAIQuestionsAction({
      subjectId: selectedSubjectId,
      topic,
      questionType,
      difficulty,
      count,
      additionalNote,
    });

    setIsGenerating(false);

    if (res.status === 'success' && res.questions && res.questions.length > 0) {
      setGeneratedDrafts(res.questions);
      setSelectedIds(new Set(res.questions.map((q) => q.tempId)));
      setStep('review');
    } else {
      setGenerateError(res.message || 'Không thể sinh câu hỏi. Vui lòng thử lại với chủ đề khác.');
    }
  };

  const toggleSelectOne = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === generatedDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedDrafts.map((q) => q.tempId)));
    }
  };

  const handleDeleteDraft = (tempId: string) => {
    setGeneratedDrafts((prev) => prev.filter((q) => q.tempId !== tempId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  const handleStartEdit = (draft: GeneratedQuestionDraft) => {
    setEditingTempId(draft.tempId);
    setEditForm(JSON.parse(JSON.stringify(draft)));
  };

  const handleSaveInlineEdit = () => {
    if (!editForm) return;
    setGeneratedDrafts((prev) =>
      prev.map((q) => (q.tempId === editForm.tempId ? { ...editForm } : q))
    );
    setEditingTempId(null);
    setEditForm(null);
  };

  const handleSaveSelectedQuestions = async () => {
    const toSave = generatedDrafts.filter((q) => selectedIds.has(q.tempId));
    if (toSave.length === 0) return;

    setIsSaving(true);
    setGenerateError(null);

    const res = await saveAIQuestionsBatchAction(selectedSubjectId, toSave);
    setIsSaving(false);

    if (res.status === 'success') {
      setSaveSuccessMsg(res.message);
      setGeneratedDrafts((prev) => prev.filter((q) => !selectedIds.has(q.tempId)));
      setSelectedIds(new Set());
    } else {
      setGenerateError(res.message || 'Lỗi khi lưu câu hỏi vào ngân hàng.');
    }
  };

  if (subjects.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            Chưa có môn học được phân công
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Bạn cần được Quản trị viên phân công phụ trách ít nhất một môn học để sử dụng tính năng sinh câu hỏi AI.
          </p>
          <Link
            href="/teacher/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Quay lại Tổng quan
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab/Progress switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('config')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              step === 'config'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Wand2 className="size-3.5" />
            1. Cấu hình sinh câu hỏi
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <button
            type="button"
            disabled={generatedDrafts.length === 0}
            onClick={() => setStep('review')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              step === 'review'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            2. Xem trước & Lưu ({generatedDrafts.length})
          </button>
        </div>

        <Link
          href="/teacher/questions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <LibraryBig className="size-3.5" />
          <span>Vào Ngân hàng câu hỏi</span>
        </Link>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="font-medium">{saveSuccessMsg}</p>
          </div>
          <Link
            href="/teacher/questions"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
          >
            Xem ngân hàng câu hỏi
          </Link>
        </div>
      )}

      {generateError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-sm text-rose-900 dark:text-rose-200">
          <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="font-medium">{generateError}</p>
        </div>
      )}

      {step === 'config' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Thiết lập yêu cầu sinh câu hỏi
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                AI sẽ căn cứ vào đề tài môn học để tạo các câu hỏi trắc nghiệm hoặc tự luận kèm lời giải chi tiết.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleStartGenerate} className="space-y-4">
                {/* Môn học */}
                <div className="space-y-1.5">
                  <Label htmlFor="ai-subject" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Môn học mục tiêu <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="ai-subject"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} · {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chủ đề bài học */}
                <div className="space-y-1.5">
                  <Label htmlFor="ai-topic" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Chủ đề bài học / Nội dung kiến thức <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ai-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Giới hạn của hàm số, Kế thừa và Đa hình trong OOP..."
                    required
                    className="h-10 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-[#0B1422] dark:text-white"
                  />
                  {/* Gợi ý chủ đề nhanh */}
                  <div className="pt-1">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gợi ý nhanh:</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {PROMPT_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setTopic(sug)}
                          className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Loại câu & Độ khó */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Định dạng câu hỏi
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuestionType('multiple_choice')}
                        className={`rounded-xl border p-2.5 text-xs font-semibold transition ${
                          questionType === 'multiple_choice'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Trắc nghiệm (A-B-C-D)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionType('essay')}
                        className={`rounded-xl border p-2.5 text-xs font-semibold transition ${
                          questionType === 'essay'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Tự luận (Kèm Rubric)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ai-difficulty" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Mức độ nhận thức
                    </Label>
                    <select
                      id="ai-difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
                      className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">Nhận biết / Dễ (Easy)</option>
                      <option value="medium">Thông hiểu / Trung bình (Medium)</option>
                      <option value="hard">Vận dụng / Khá (Hard)</option>
                      <option value="expert">Vận dụng cao / Khó (Expert)</option>
                    </select>
                  </div>
                </div>

                {/* Số lượng câu */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-count" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Số lượng câu hỏi (1 - 10 câu)
                    </Label>
                    <Input
                      id="ai-count"
                      type="number"
                      min={1}
                      max={10}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                      className="h-10 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-[#0B1422] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ai-note" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Ghi chú thêm cho AI (Tùy chọn)
                    </Label>
                    <Input
                      id="ai-note"
                      value={additionalNote}
                      onChange={(e) => setAdditionalNote(e.target.value)}
                      placeholder="VD: Tập trung vào ví dụ thực tế..."
                      className="h-10 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-[#0B1422] dark:text-white"
                    />
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isGenerating || !topic.trim()}
                    className="h-11 w-full gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        <span>{LOADING_STAGES[loadingStageIdx]}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Bắt đầu sinh {count} câu hỏi bằng AI</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Sidebar Info & Guidelines */}
          <div className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="size-4 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Công nghệ Groq Llama 3
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  Hệ thống tích hợp mô hình AI siêu tốc độ <strong>Groq Llama 3 70B</strong> với khả năng suy luận mạnh mẽ, chính xác và định dạng chuẩn học thuật.
                </p>
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    💡 Hỗ trợ công thức Toán & Khoa học
                  </p>
                  <p className="mt-1 text-[11px] text-blue-800/80 dark:text-blue-300/80">
                    Mọi ký hiệu, biểu thức toán học sẽ được tự động xuất dưới dạng LaTeX KaTeX rõ nét và đẹp mắt.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Quy trình kiểm soát chất lượng
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                    1
                  </span>
                  <span>Cấu hình môn học và nhập chủ đề bài giảng.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                    2
                  </span>
                  <span>AI tạo nháp câu hỏi kèm 4 đáp án và lời giải thích.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                    3
                  </span>
                  <span>Giảng viên duyệt, chỉnh sửa trực tiếp và lưu vào kho.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Review Step */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('config')}
                className="gap-1.5 rounded-lg border-slate-300 dark:border-slate-700"
              >
                <ArrowLeft className="size-3.5" />
                <span>Thiết lập lại</span>
              </Button>
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Đã chọn {selectedIds.size} / {generatedDrafts.length} câu hỏi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs rounded-lg border-slate-300 dark:border-slate-700"
              >
                {selectedIds.size === generatedDrafts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
              <Button
                onClick={handleSaveSelectedQuestions}
                disabled={isSaving || selectedIds.size === 0}
                className="gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                {isSaving ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Lưu {selectedIds.size} câu vào Ngân hàng</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Danh sách câu hỏi sinh ra */}
          <div className="space-y-4">
            {generatedDrafts.map((draft, idx) => {
              const isSelected = selectedIds.has(draft.tempId);
              const isEditing = editingTempId === draft.tempId;
              const isMC = draft.question_type === 'multiple_choice';

              return (
                <Card
                  key={draft.tempId}
                  className={`border transition-all ${
                    isSelected
                      ? 'border-blue-500/80 bg-white dark:bg-[#111C2D] shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#111C2D]/70 opacity-80'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(draft.tempId)}
                          className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Câu {idx + 1}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-slate-100 dark:bg-slate-800"
                        >
                          {isMC ? 'Trắc nghiệm' : 'Tự luận'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(draft)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Chỉnh sửa nội dung"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.tempId)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1">
                    {isEditing && editForm ? (
                      /* Inline Edit Form */
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label className="text-xs font-semibold">Nội dung câu hỏi</Label>
                          <textarea
                            value={editForm.question_text}
                            onChange={(e) =>
                              setEditForm({ ...editForm, question_text: e.target.value })
                            }
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] p-2 text-xs"
                          />
                        </div>

                        {isMC && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Các phương án & Đáp án đúng</Label>
                            {(['A', 'B', 'C', 'D'] as const).map((key) => {
                              const fieldName = `option_${key.toLowerCase()}` as
                                | 'option_a'
                                | 'option_b'
                                | 'option_c'
                                | 'option_d';
                              const isCorrect = editForm.correct_option === key;

                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${draft.tempId}`}
                                    checked={isCorrect}
                                    onChange={() =>
                                      setEditForm({ ...editForm, correct_option: key })
                                    }
                                    className="size-3.5 text-blue-600"
                                  />
                                  <span className="font-bold text-xs">{key}:</span>
                                  <input
                                    type="text"
                                    value={editForm[fieldName] ?? ''}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, [fieldName]: e.target.value })
                                    }
                                    className="h-8 flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] px-2 text-xs"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isMC && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs font-semibold">Đáp án mẫu</Label>
                              <textarea
                                value={editForm.model_answer ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, model_answer: e.target.value })
                                }
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] p-2 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Thang điểm / Hướng dẫn chấm</Label>
                              <textarea
                                value={editForm.grading_rubric ?? ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, grading_rubric: e.target.value })
                                }
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1422] p-2 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTempId(null);
                              setEditForm(null);
                            }}
                            className="text-xs"
                          >
                            Hủy
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveInlineEdit}
                            className="text-xs bg-blue-600 text-white"
                          >
                            Lưu thay đổi
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Draft */
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          <MathText content={draft.question_text} />
                        </div>

                        {isMC && (
                          <div className="grid gap-2 sm:grid-cols-2 pt-1">
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
                                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition ${
                                    isCorrect
                                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {opt.key}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <MathText content={opt.text ?? ''} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isMC && draft.model_answer && (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              Gợi ý đáp án / Rubric chấm:
                            </p>
                            <div className="mt-1 text-slate-600 dark:text-slate-300">
                              <MathText content={draft.model_answer} />
                            </div>
                          </div>
                        )}

                        {draft.explanation && (
                          <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-2.5 text-xs text-blue-900 dark:text-blue-200">
                            <span className="font-bold">💡 Giải thích chi tiết: </span>
                            <MathText content={draft.explanation} />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
