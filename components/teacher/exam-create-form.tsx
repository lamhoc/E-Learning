'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  LibraryBig,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MathText } from '@/components/ui/math-text';
import { createExamAction } from '@/app/teacher/exams/create/actions';
import type { BankQuestion, SubjectSummary } from '@/lib/question-bank';
import type { TeacherClassSummary } from '@/lib/teacher-exam-create';

type ExamCreateFormProps = {
  assignedSubjects: SubjectSummary[];
  classes: TeacherClassSummary[];
  questions: BankQuestion[];
};

type SelectedQuestionItem = {
  questionId: string;
  points: number;
};

export function ExamCreateForm({
  assignedSubjects,
  classes,
  questions,
}: ExamCreateFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 1. Basic Form States
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    assignedSubjects[0]?.id ?? '',
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [availableUntil, setAvailableUntil] = useState<string>('');

  // 2. Question Bank Selection States
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestionItem[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'multiple_choice' | 'essay'>('all');

  // 3. Submitting Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available classes for currently selected subject
  const availableClasses = useMemo(() => {
    return classes.filter((c) => c.subject_id === selectedSubjectId);
  }, [classes, selectedSubjectId]);

  // Available questions for currently selected subject
  const availableQuestions = useMemo(() => {
    return questions.filter((q) => q.subject_id === selectedSubjectId);
  }, [questions, selectedSubjectId]);

  // Filtered bank questions for selector table
  const filteredBankQuestions = useMemo(() => {
    return availableQuestions.filter((q) => {
      if (questionTypeFilter !== 'all' && q.question_type !== questionTypeFilter) {
        return false;
      }
      if (questionSearch.trim()) {
        const query = questionSearch.trim().toLowerCase();
        return q.question_text.toLowerCase().includes(query);
      }
      return true;
    });
  }, [availableQuestions, questionTypeFilter, questionSearch]);

  // Set of selected question IDs for O(1) lookup
  const selectedQuestionIdSet = useMemo(() => {
    return new Set(selectedQuestions.map((q) => q.questionId));
  }, [selectedQuestions]);

  // Handle changing subject -> reset class & question selection
  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    setSelectedClassIds([]);
    setSelectedQuestions([]);
  };

  // Toggle class selection
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  // Toggle single question selection
  const handleToggleQuestion = (questionId: string) => {
    if (selectedQuestionIdSet.has(questionId)) {
      setSelectedQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
    } else {
      setSelectedQuestions((prev) => [...prev, { questionId, points: 1 }]);
    }
  };

  // Select all currently filtered bank questions
  const handleSelectAllFiltered = () => {
    const newItems = filteredBankQuestions
      .filter((q) => !selectedQuestionIdSet.has(q.id))
      .map((q) => ({ questionId: q.id, points: 1 }));
    setSelectedQuestions((prev) => [...prev, ...newItems]);
  };

  // Deselect all questions
  const handleDeselectAll = () => {
    setSelectedQuestions([]);
  };

  // Update points for a question
  const handlePointsChange = (questionId: string, points: number) => {
    setSelectedQuestions((prev) =>
      prev.map((q) => (q.questionId === questionId ? { ...q, points: Math.max(0.1, points) } : q)),
    );
  };

  // Quick helper: Distribute 10 points evenly
  const handleDistributeTenPoints = () => {
    if (selectedQuestions.length === 0) return;
    const rawPoint = 10 / selectedQuestions.length;
    // Round to 2 decimals
    const roundedPoint = Math.round(rawPoint * 100) / 100;
    setSelectedQuestions((prev) =>
      prev.map((q) => ({ ...q, points: roundedPoint })),
    );
  };

  // Calculate total score of selected questions
  const totalScore = useMemo(() => {
    const sum = selectedQuestions.reduce((acc, q) => acc + q.points, 0);
    return Math.round(sum * 100) / 100;
  }, [selectedQuestions]);

  // Map of question objects for fast lookup in selected list
  const questionMap = useMemo(() => {
    return new Map(availableQuestions.map((q) => [q.id, q]));
  }, [availableQuestions]);

  // Submit Handler
  const handleSubmit = async (publishImmediately: boolean) => {
    setSubmitError(null);

    // Validation
    if (!title.trim()) {
      setSubmitError('Vui lòng nhập tiêu đề đề thi.');
      return;
    }

    if (publishImmediately && selectedClassIds.length === 0) {
      setSubmitError('Để xuất bản đề thi ngay lập tức, bạn phải gán đề cho ít nhất 1 lớp học.');
      return;
    }

    if (selectedQuestions.length === 0) {
      setSubmitError('Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng để đưa vào đề thi.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      subjectId: selectedSubjectId,
      title: title.trim(),
      instructions: instructions.trim() || null,
      durationMinutes,
      maxAttempts,
      availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
      availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
      classIds: selectedClassIds,
      publishImmediately,
      selectedQuestions: selectedQuestions.map((q, idx) => ({
        questionId: q.questionId,
        points: q.points,
        position: idx + 1,
      })),
    };

    const res = await createExamAction(payload);
    setIsSubmitting(false);

    if (res.status === 'error') {
      setSubmitError(res.message);
    } else {
      setSuccessMessage(res.message);
      setTimeout(() => {
        startTransition(() => {
          router.push('/teacher/dashboard');
          router.refresh();
        });
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft className="size-3.5" /> Quay về Tổng quan
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#e5f0e9] text-[#246348]">
              <FileText className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Tạo đề thi mới
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Đóng gói câu hỏi từ ngân hàng thành đề thi hoàn chỉnh kèm phân công lớp và quy chế thi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="h-10 text-xs font-semibold text-slate-700"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <FileText className="size-3.5 mr-1.5 text-slate-500" />
            )}
            Lưu bản nháp
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="h-10 gap-1.5 bg-[#17372e] text-xs font-bold text-white hover:bg-[#20493e] shadow-xs"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin text-[#c9ed99]" />
            ) : (
              <Send className="size-4 text-[#c9ed99]" />
            )}
            <span>Xuất bản ngay</span>
          </Button>
        </div>
      </div>

      {/* Notification Alerts */}
      {submitError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive animate-in fade-in"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 animate-in zoom-in-95"
        >
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span>{successMessage} Đang chuyển hướng về Bảng điều khiển...</span>
        </div>
      )}

      {/* Main Grid: Left Settings (40%) + Right Questions Selection (60%) */}
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* LEFT COLUMN: GENERAL SETTINGS */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="size-4 text-[#246348]" />
                1. Thông tin chung & Môn học
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Subject Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-subject" className="text-xs font-bold text-slate-800">
                  Môn học áp dụng <span className="text-destructive">*</span>
                </Label>
                <select
                  id="exam-subject"
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {assignedSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} · {sub.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Ngân hàng câu hỏi và danh sách lớp sẽ tự động cập nhật theo môn học này.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-title" className="text-xs font-bold text-slate-800">
                  Tiêu đề đề thi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra Giữa kỳ - Khóa K22..."
                  className="h-10 text-xs"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-instructions" className="text-xs font-bold text-slate-800">
                  Dặn dò / Hướng dẫn thí sinh (tùy chọn)
                </Label>
                <textarea
                  id="exam-instructions"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ví dụ: Thí sinh không được sử dụng tài liệu. Đọc kỹ câu hỏi trước khi trả lời..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Assigned Classes */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Gán cho các lớp học:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Đã chọn: {selectedClassIds.length} lớp
                  </span>
                </Label>

                {availableClasses.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-2">
                    Chưa có lớp học nào thuộc môn này do bạn giảng dạy.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 p-2.5 bg-slate-50/50">
                    {availableClasses.map((c) => {
                      const isChecked = selectedClassIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center justify-between rounded-md p-2 text-xs transition select-none ${
                            isChecked
                              ? 'bg-emerald-50 text-emerald-950 font-semibold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleClass(c.id)}
                              className="size-3.5 rounded text-emerald-700 focus:ring-emerald-500"
                            />
                            <span>{c.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-white">
                            {c.class_code} · {c.academic_year}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exam Timing & Limits Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="size-4 text-[#246348]" />
                2. Thời gian & Lượt thi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exam-duration" className="text-xs font-bold text-slate-800">
                    Thời lượng (phút)
                  </Label>
                  <Input
                    id="exam-duration"
                    type="number"
                    min={5}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 45)}
                    className="h-10 text-xs"
                  />
                  <div className="flex gap-1 pt-1">
                    {[15, 45, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                          durationMinutes === m
                            ? 'bg-[#17372e] text-white border-[#17372e]'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {m}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exam-attempts" className="text-xs font-bold text-slate-800">
                    Số lượt thi tối đa
                  </Label>
                  <Input
                    id="exam-attempts"
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
                    className="h-10 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 pt-1">
                    Thường là 1 lượt cho bài thi chính thức.
                  </p>
                </div>
              </div>

              {/* Window of availability */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-500" />
                  Khung giờ mở đề (tùy chọn)
                </Label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Mở từ lúc:</span>
                    <Input
                      type="datetime-local"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Đóng lúc:</span>
                    <Input
                      type="datetime-local"
                      value={availableUntil}
                      onChange={(e) => setAvailableUntil(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: QUESTION SELECTION & SCORING */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LibraryBig className="size-4 text-[#246348]" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    3. Chọn câu hỏi từ Ngân hàng đề thi
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-[#17372e] text-white">
                    Đã chọn: {selectedQuestions.length} câu
                  </Badge>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                    Tổng điểm: {totalScore}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Question Bank Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Tìm câu hỏi trong kho..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Type Filter */}
                  <select
                    value={questionTypeFilter}
                    onChange={(e) => setQuestionTypeFilter(e.target.value as 'all' | 'multiple_choice' | 'essay')}
                    className="h-8 rounded-md border border-input bg-white px-2.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">Tất cả loại câu</option>
                    <option value="multiple_choice">Trắc nghiệm</option>
                    <option value="essay">Tự luận</option>
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllFiltered}
                    className="h-8 text-[11px]"
                  >
                    Chọn tất cả
                  </Button>

                  {selectedQuestions.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="h-8 text-[11px] text-slate-500 hover:text-destructive"
                    >
                      Bỏ chọn
                    </Button>
                  )}
                </div>
              </div>

              {/* Bank Question Selector List */}
              <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
                {filteredBankQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                    Không tìm thấy câu hỏi nào phù hợp với bộ lọc trong ngân hàng của môn này.
                  </div>
                ) : (
                  filteredBankQuestions.map((q) => {
                    const isSelected = selectedQuestionIdSet.has(q.id);
                    const isMC = q.question_type === 'multiple_choice';

                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition select-none ${
                          isSelected
                            ? 'border-[#246348] bg-emerald-50/40 ring-1 ring-[#246348]/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by div click
                          className="mt-0.5 size-4 rounded text-emerald-700 focus:ring-emerald-500"
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                isMC
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : 'border-purple-200 bg-purple-50 text-purple-700'
                              }`}
                            >
                              {isMC ? 'Trắc nghiệm' : 'Tự luận'}
                            </Badge>
                            {isMC && q.options && (
                              <span className="text-[10px] text-slate-400">
                                {q.options.length} phương án
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-medium text-slate-800 line-clamp-2">
                            <MathText content={q.question_text} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SELECTED QUESTIONS REVIEW & SCORING TABLE */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Danh sách câu hỏi trong đề thi ({selectedQuestions.length} câu)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Điều chỉnh điểm số cho từng câu hỏi trước khi xuất bản đề thi.
                    </p>
                  </div>

                  {selectedQuestions.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDistributeTenPoints}
                      className="h-7 text-[11px] gap-1 text-[#17372e] border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                      title="Tự động chia đều 10 điểm cho toàn bộ số câu hỏi đã chọn"
                    >
                      <Sparkles className="size-3 text-[#246348]" />
                      Chia đều thang điểm 10
                    </Button>
                  )}
                </div>

                {selectedQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    Chưa có câu hỏi nào được chọn vào đề. Hãy tích chọn từ danh sách phía trên.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {selectedQuestions.map((sq, idx) => {
                      const qData = questionMap.get(sq.questionId);
                      if (!qData) return null;
                      const isMC = qData.question_type === 'multiple_choice';

                      return (
                        <div
                          key={sq.questionId}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#17372e] text-[11px] font-bold text-white">
                              #{idx + 1}
                            </span>

                            <Badge
                              className={`shrink-0 text-[10px] px-1.5 py-0 ${
                                isMC
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : 'border-purple-200 bg-purple-50 text-purple-700'
                              }`}
                            >
                              {isMC ? 'TN' : 'TL'}
                            </Badge>

                            <div className="truncate text-xs font-medium text-slate-800">
                              <MathText content={qData.question_text} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-500">Điểm:</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0.1"
                                max="100"
                                value={sq.points}
                                onChange={(e) =>
                                  handlePointsChange(sq.questionId, parseFloat(e.target.value) || 1)
                                }
                                className="h-7 w-16 rounded border border-slate-200 bg-slate-50 px-1.5 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleQuestion(sq.questionId)}
                              aria-label="Loại khỏi đề"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-destructive transition"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

