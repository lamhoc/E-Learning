'use client';

import { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  FileUp,
  HelpCircle,
  LoaderCircle,
  Pencil,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MathText } from '@/components/ui/math-text';
import { saveAIQuestionsBatchAction } from '@/app/teacher/questions/ai-actions';
import type { SubjectSummary } from '@/lib/question-bank';
import type { ParsedQuestionItem } from '@/lib/document-parser';
import type { GeneratedQuestionDraft } from '@/lib/ai-question-generator';

type UploadDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectSummary[];
  onSuccess: () => void;
};

const LOADING_STAGES = [
  'Đang tải file lên máy chủ...',
  'Đang phân tích định dạng Word (DOCX) / PDF...',
  'Đang quét cấu trúc XML và nhận diện các đáp án có màu chữ đỏ...',
  'Đang kết nối tới mô hình Groq AI để bóc tách câu hỏi...',
  'Đang chuẩn hóa công thức KaTeX và đối soát phương án...',
];

export function UploadDocumentModal({
  isOpen,
  onClose,
  subjects,
  onSuccess,
}: UploadDocumentModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  // Upload Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & Review State
  const [isUploading, setIsUploading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Edit State
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ParsedQuestionItem | null>(null);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Stage progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      setLoadingStageIdx(0);
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'pdf') {
      setUploadError('Vui lòng chỉ chọn file Word (.docx) hoặc PDF (.pdf).');
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Vui lòng chọn một file tài liệu.');
      return;
    }
    if (!selectedSubjectId) {
      setUploadError('Vui lòng chọn môn học tương ứng.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subjectId', selectedSubjectId);

      const res = await fetch('/api/questions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Không thể bóc tách câu hỏi từ tài liệu.');
      }

      const questions = (data.questions || []) as ParsedQuestionItem[];
      setParsedQuestions(questions);
      setSelectedIds(new Set(questions.map((q) => q.tempId)));
      setStep('preview');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xử lý tài liệu.');
    } finally {
      setIsUploading(false);
    }
  };

  // Selection toggle
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
    if (selectedIds.size === parsedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedQuestions.map((q) => q.tempId)));
    }
  };

  // Change correct option directly on preview card
  const handleQuickChangeCorrect = (tempId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setParsedQuestions((prev) =>
      prev.map((q) =>
        q.tempId === tempId ? { ...q, correct_option: optionKey, is_red_detected: false } : q
      )
    );
  };

  // Inline editing
  const handleStartEdit = (item: ParsedQuestionItem) => {
    setEditingTempId(item.tempId);
    setEditForm({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingTempId(null);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (!editForm || !editingTempId) return;
    setParsedQuestions((prev) =>
      prev.map((item) => (item.tempId === editingTempId ? { ...editForm } : item))
    );
    setEditingTempId(null);
    setEditForm(null);
  };

  const handleDeleteItem = (tempId: string) => {
    setParsedQuestions((prev) => prev.filter((item) => item.tempId !== tempId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
    if (editingTempId === tempId) {
      handleCancelEdit();
    }
  };

  // Batch save to database
  const handleSaveAll = async () => {
    const approved = parsedQuestions.filter((q) => selectedIds.has(q.tempId));
    if (approved.length === 0) return;

    setIsSaving(true);
    setUploadError(null);

    // Convert ParsedQuestionItem to GeneratedQuestionDraft format for batch action
    const draftsToSave: GeneratedQuestionDraft[] = approved.map((q) => ({
      tempId: q.tempId,
      question_type: q.question_type,
      question_text: q.question_text,
      explanation: q.explanation || '',
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      model_answer: q.model_answer,
      grading_rubric: q.grading_rubric,
    }));

    const res = await saveAIQuestionsBatchAction(selectedSubjectId, draftsToSave);
    setIsSaving(false);

    if (res.status === 'error') {
      setUploadError(res.message);
    } else {
      setSaveSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset
        setStep('upload');
        setSaveSuccessMsg(null);
        setParsedQuestions([]);
        setSelectedFile(null);
      }, 1200);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const redCount = parsedQuestions.filter((q) => q.is_red_detected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#17372e] to-[#2d6856] text-[#c9ed99] shadow-xs">
              <FileUp className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                {step === 'upload' ? 'Upload tài liệu đề thi (DOCX / PDF)' : 'Kiểm tra & Lưu câu hỏi'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === 'upload'
                  ? 'Bóc tách câu hỏi hàng loạt và tự động nhận diện đáp án bôi màu đỏ.'
                  : `Đã nhận diện ${parsedQuestions.length} câu hỏi (${redCount} câu có đáp án màu đỏ).`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Đóng"
            disabled={isUploading || isSaving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {uploadError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{uploadError}</div>
            </div>
          )}

          {saveSuccessMsg && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 animate-in fade-in"
            >
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              BƯỚC 1: UPLOAD TÀI LIỆU
             ────────────────────────────────────────────────────────── */}
          {step === 'upload' && (
            <form onSubmit={handleStartUpload} className="space-y-5">
              {/* Chọn môn học */}
              <div className="space-y-1.5">
                <Label htmlFor="upload-subject" className="text-xs font-semibold">
                  Môn học mục tiêu <span className="text-destructive">*</span>
                </Label>
                <select
                  id="upload-subject"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={isUploading}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} · {sub.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Các câu hỏi sau khi bóc tách sẽ được gán vào môn học này.
                </p>
              </div>

              {/* Vùng kéo thả file */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  File tài liệu đề thi (.docx hoặc .pdf) <span className="text-destructive">*</span>
                </Label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? 'border-[#246348] bg-[#eef6f1]'
                      : selectedFile
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={isUploading}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid size-12 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                        <FileText className="size-6" />
                      </span>
                      <p className="text-sm font-semibold text-slate-800 max-w-sm truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Bấm vào đây để đổi file khác
                      </p>
                      <Badge variant="outline" className="mt-1 border-emerald-300 bg-emerald-50 text-emerald-800 text-xs">
                        Đã sẵn sàng bóc tách
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
                        <UploadCloud className="size-6" />
                      </span>
                      <p className="text-sm font-medium text-slate-700">
                        Kéo thả file vào đây hoặc <span className="text-[#246348] underline">chọn từ máy tính</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ Microsoft Word (.docx) và PDF (.pdf) dung lượng tối đa 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hướng dẫn quy tắc nhận diện màu đỏ */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs leading-relaxed text-emerald-950">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <Sparkles className="size-4 text-emerald-700" />
                  Quy tắc bóc tách thông minh:
                </div>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    <strong>Nhận diện đáp án màu đỏ:</strong> Trong file Word (.docx), các phương án được giáo viên{' '}
                    <span className="text-red-600 font-bold">bôi màu đỏ</span> sẽ được hệ thống tự động gán làm đáp án đúng ✅.
                  </li>
                  <li>
                    <strong>Đánh số câu hỏi:</strong> Đề thi nên được đánh số thứ tự tuần tự (Ví dụ: &quot;Câu 1:&quot;, &quot;Câu 2:&quot;, hoặc &quot;1.&quot;).
                  </li>
                  <li>
                    <strong>Công thức toán:</strong> Hệ thống tự động chuyển đổi công thức sang chuẩn KaTeX sắc nét.
                  </li>
                </ul>
              </div>

              {/* Trạng thái Loading khi đang bóc tách */}
              {isUploading && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <LoaderCircle className="size-5 animate-spin text-[#246348]" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {LOADING_STAGES[loadingStageIdx]}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                        <div
                          className="h-full bg-[#246348] transition-all duration-500"
                          style={{
                            width: `${((loadingStageIdx + 1) / LOADING_STAGES.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isUploading}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="gap-2 bg-[#17372e] text-white hover:bg-[#20493e]"
                >
                  {isUploading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Đang xử lý tài liệu...
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" />
                      Bóc tách câu hỏi ngay
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ──────────────────────────────────────────────────────────
              BƯỚC 2: XEM TRƯỚC, CHỈNH SỬA & LƯU CSDL
             ────────────────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Toolbar điều khiển danh sách */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary"
                  >
                    <span
                      className={`grid size-4 place-items-center rounded border transition ${
                        selectedIds.size === parsedQuestions.length && parsedQuestions.length > 0
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {selectedIds.size === parsedQuestions.length && parsedQuestions.length > 0 && (
                        <Check className="size-3 stroke-[3]" />
                      )}
                    </span>
                    <span>Chọn tất cả ({selectedIds.size}/{parsedQuestions.length} câu)</span>
                  </button>

                  {redCount > 0 && (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px]">
                      {redCount} câu nhận diện từ chữ đỏ
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('upload')}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Chọn file khác
                </Button>
              </div>

              {/* Danh sách câu hỏi */}
              <div className="space-y-4">
                {parsedQuestions.map((q, idx) => {
                  const isSelected = selectedIds.has(q.tempId);
                  const isEditing = editingTempId === q.tempId;

                  return (
                    <div
                      key={q.tempId}
                      className={`relative rounded-xl border p-4.5 transition-all ${
                        isSelected
                          ? 'border-primary/40 bg-card shadow-xs'
                          : 'border-border/60 bg-muted/20 opacity-70'
                      }`}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(q.tempId)}
                            className="text-foreground hover:text-primary mt-0.5"
                          >
                            <span
                              className={`grid size-4 place-items-center rounded border transition ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40 bg-background'
                              }`}
                            >
                              {isSelected && <Check className="size-3 stroke-[3]" />}
                            </span>
                          </button>

                          <span className="font-bold text-sm text-foreground">
                            Câu {idx + 1}
                          </span>

                          <Badge variant="outline" className="text-[10px] capitalize">
                            {q.question_type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                          </Badge>

                          {q.is_red_detected ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-semibold">
                              ✅ Đáp án đỏ tự động nhận diện
                            </Badge>
                          ) : q.question_type === 'multiple_choice' ? (
                            <Badge variant="outline" className="text-slate-500 text-[10px]">
                              Tự động suy luận
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => (isEditing ? handleCancelEdit() : handleStartEdit(q))}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-xs"
                            title="Sửa nội dung"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(q.tempId)}
                            className="rounded-md p-1.5 text-destructive/80 hover:bg-destructive/10 hover:text-destructive text-xs"
                            title="Xóa câu này"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Body / Edit Form */}
                      {isEditing && editForm ? (
                        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs">
                          <div>
                            <Label className="text-[11px] font-semibold">Nội dung câu hỏi</Label>
                            <textarea
                              value={editForm.question_text}
                              onChange={(e) =>
                                setEditForm({ ...editForm, question_text: e.target.value })
                              }
                              rows={2}
                              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {editForm.question_type === 'multiple_choice' && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                                const propKey = `option_${key.toLowerCase()}` as keyof ParsedQuestionItem;
                                return (
                                  <div key={key} className="space-y-1">
                                    <Label className="text-[10px] font-bold">Phương án {key}</Label>
                                    <Input
                                      value={String(editForm[propKey] || '')}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, [propKey]: e.target.value })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {editForm.question_type === 'multiple_choice' && (
                            <div>
                              <Label className="text-[11px] font-semibold">Đáp án đúng</Label>
                              <div className="mt-1 flex gap-2">
                                {(['A', 'B', 'C', 'D'] as const).map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() =>
                                      setEditForm({ ...editForm, correct_option: key, is_red_detected: false })
                                    }
                                    className={`size-7 rounded-md text-xs font-bold transition ${
                                      editForm.correct_option === key
                                        ? 'bg-[#17372e] text-white'
                                        : 'border border-input bg-background hover:bg-muted'
                                    }`}
                                  >
                                    {key}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <Label className="text-[11px] font-semibold">Lời giải thích (tùy chọn)</Label>
                            <Input
                              value={editForm.explanation || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, explanation: e.target.value })
                              }
                              placeholder="Lời giải thích chi tiết..."
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              Hủy
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit}>
                              Cập nhật
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 space-y-2 text-xs">
                          {/* Câu hỏi KaTeX */}
                          <div className="text-foreground leading-relaxed">
                            <MathText content={q.question_text} />
                          </div>

                          {/* 4 phương án trắc nghiệm */}
                          {q.question_type === 'multiple_choice' && (
                            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                                const propKey = `option_${key.toLowerCase()}` as keyof ParsedQuestionItem;
                                const textVal = q[propKey];
                                if (!textVal) return null;
                                const isCorrect = q.correct_option === key;

                                return (
                                  <div
                                    key={key}
                                    onClick={() => handleQuickChangeCorrect(q.tempId, key)}
                                    title="Click để chọn làm đáp án đúng"
                                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition ${
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-400'
                                        : 'border-border/80 bg-background hover:bg-muted/40 text-foreground'
                                    }`}
                                  >
                                    <span
                                      className={`grid size-5 shrink-0 place-items-center rounded text-[11px] font-bold ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {key}
                                    </span>
                                    <span className="flex-1 leading-snug">
                                      <MathText content={String(textVal)} />
                                    </span>
                                    {isCorrect && (
                                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lời giải thích */}
                          {q.explanation && (
                            <div className="mt-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Lời giải: </span>
                              <MathText content={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-card/95 py-3 backdrop-blur-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('upload')}
                  disabled={isSaving}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  Chọn lại file
                </Button>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Lưu {selectedIds.size} câu vào môn: <strong>{currentSubject?.name}</strong>
                  </span>
                  <Button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving || selectedIds.size === 0}
                    className="gap-2 bg-[#17372e] text-white hover:bg-[#20493e]"
                  >
                    {isSaving ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang lưu vào ngân hàng...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Lưu {selectedIds.size} câu vào ngân hàng
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
