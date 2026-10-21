'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  FileQuestion,
  Filter,
  LibraryBig,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MathText } from '@/components/ui/math-text';
import { QuestionModal } from './question-modal';
import { AIGeneratorModal } from './ai-generator-modal';
import { deleteQuestion } from '@/app/teacher/questions/actions';
import type { BankQuestion, SubjectSummary } from '@/lib/question-bank';

type QuestionManagerProps = {
  initialQuestions: BankQuestion[];
  subjects: SubjectSummary[];
};

export function QuestionManager({
  initialQuestions,
  subjects,
}: QuestionManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'multiple_choice' | 'essay'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<BankQuestion | null>(null);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter Logic
  const filteredQuestions = initialQuestions.filter((q) => {
    // Subject filter
    if (selectedSubject !== 'all' && q.subject_id !== selectedSubject) {
      return false;
    }
    // Type filter
    if (selectedType !== 'all' && q.question_type !== selectedType) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim()) {
      const qText = q.question_text.toLowerCase();
      const subjectName = (q.subject?.name ?? '').toLowerCase();
      const subjectCode = (q.subject?.code ?? '').toLowerCase();
      const term = searchQuery.trim().toLowerCase();
      return (
        qText.includes(term) ||
        subjectName.includes(term) ||
        subjectCode.includes(term)
      );
    }
    return true;
  });

  const totalCount = initialQuestions.length;
  const mcCount = initialQuestions.filter((q) => q.question_type === 'multiple_choice').length;
  const essayCount = initialQuestions.filter((q) => q.question_type === 'essay').length;

  const handleOpenCreate = () => {
    setQuestionToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: BankQuestion) => {
    setQuestionToEdit(q);
    setIsModalOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng không?')) {
      return;
    }

    setDeletingId(questionId);
    setActionError(null);

    const res = await deleteQuestion(questionId);
    setDeletingId(null);

    if (res.status === 'error') {
      setActionError(res.message);
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#dce7e0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng câu hỏi
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-[#e5f0e9] text-[#246348]">
              <LibraryBig className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {totalCount.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Toàn bộ ngân hàng đề</p>
        </div>

        <div className="rounded-xl border border-[#dce7e0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trắc nghiệm
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {mcCount.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">4 phương án A-B-C-D</p>
        </div>

        <div className="rounded-xl border border-[#dce7e0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tự luận
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <FileQuestion className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {essayCount.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Có thang điểm & gợi ý</p>
        </div>

        <div className="rounded-xl border border-[#dce7e0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Môn học phụ trách
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <BookOpen className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {subjects.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Đã được phân công</p>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      {/* Action & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung câu hỏi, mã môn, tên môn..."
                className="pl-9"
              />
            </div>

            {/* Filter Dropdowns & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="size-3.5" /> Lọc:
              </div>

              {/* Subject Filter */}
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                aria-label="Lọc theo môn học"
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tất cả môn học ({subjects.length})</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} · {sub.name}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <div className="flex rounded-md border border-input bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'all'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tất cả ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('multiple_choice')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'multiple_choice'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Trắc nghiệm ({mcCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('essay')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'essay'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tự luận ({essayCount})
                </button>
              </div>

              {/* AI Question Generator Button */}
              <Button
                onClick={() => setIsAIModalOpen(true)}
                variant="outline"
                className="gap-1.5 border-[#246348] text-[#17372e] hover:bg-[#eef6f1]"
              >
                <Sparkles className="size-4 text-[#246348]" />
                AI Sinh câu hỏi
              </Button>

              {/* Create Question Button */}
              <Button
                onClick={handleOpenCreate}
                className="gap-1.5 bg-[#17372e] text-white hover:bg-[#20493e]"
              >
                <Plus className="size-4" />
                Thêm câu hỏi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">
            Hiển thị <span className="font-semibold text-foreground">{filteredQuestions.length}</span> / {totalCount} câu hỏi
          </p>
          {(searchQuery || selectedSubject !== 'all' || selectedType !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedType('all');
              }}
              className="text-xs text-primary hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <FileQuestion className="size-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {totalCount === 0
                  ? 'Chưa có câu hỏi nào trong kho'
                  : 'Không có câu hỏi nào phù hợp'}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                {totalCount === 0
                  ? 'Bắt đầu xây dựng ngân hàng đề thi bằng cách tạo câu hỏi thủ công hoặc sử dụng AI sinh tự động.'
                  : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc môn học/loại câu hỏi.'}
              </p>
              {totalCount === 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => setIsAIModalOpen(true)}
                    variant="outline"
                    className="gap-2 border-[#246348] text-[#17372e] hover:bg-[#eef6f1]"
                  >
                    <Sparkles className="size-4 text-[#246348]" /> AI sinh câu hỏi tự động
                  </Button>
                  <Button
                    onClick={handleOpenCreate}
                    className="gap-2 bg-[#17372e] text-white hover:bg-[#20493e]"
                  >
                    <Plus className="size-4" /> Tạo câu hỏi thủ công
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isDeleting = deletingId === q.id;
            const isMC = q.question_type === 'multiple_choice';
            const correctKey = q.answer_key?.correct_option_key;

            return (
              <Card
                key={q.id}
                className="overflow-hidden transition hover:border-[#17372e]/30 hover:shadow-xs"
              >
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <Badge variant="outline" className="gap-1 bg-muted/40 font-medium">
                      <BookOpen className="size-3" />
                      {q.subject?.code} · {q.subject?.name}
                    </Badge>
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

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(q)}
                      className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isDeleting}
                      onClick={() => handleDelete(q.id)}
                      className="h-8 gap-1 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {isDeleting ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Xóa
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0">
                  {/* Question Text */}
                  <MathText
                    content={q.question_text}
                    className="text-sm font-medium leading-relaxed text-foreground"
                  />

                  {/* Multiple Choice Options List */}
                  {isMC && q.options && q.options.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt) => {
                        const isCorrect = opt.option_key === correctKey;
                        return (
                          <div
                            key={opt.option_key}
                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition ${
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
                              {opt.option_key}
                            </span>
                            <MathText
                              content={opt.option_text}
                              className="min-w-0 flex-1 leading-relaxed"
                            />
                            {isCorrect && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-[#246348]/40 bg-white text-[10px] text-[#246348]"
                              >
                                Đáp án đúng
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay Model Answer & Rubric */}
                  {!isMC && q.answer_key && (
                    <div className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/40 p-3 text-xs">
                      {q.answer_key.model_answer && (
                        <div>
                          <span className="font-semibold text-purple-900">
                            Đáp án tham khảo:
                          </span>{' '}
                          <MathText
                            content={q.answer_key.model_answer}
                            className="text-purple-950"
                          />
                        </div>
                      )}
                      {q.answer_key.grading_rubric && (
                        <div>
                          <span className="font-semibold text-purple-900">
                            Thang điểm / Hướng dẫn chấm:
                          </span>{' '}
                          <MathText
                            content={q.answer_key.grading_rubric}
                            className="text-purple-950"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Note */}
                  {q.explanation && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                      <div>
                        <span className="font-semibold text-foreground">
                          Giải thích chi tiết:
                        </span>{' '}
                        <MathText content={q.explanation} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal for Creating or Editing Question Manually */}
      {isModalOpen && (
        <QuestionModal
          key={questionToEdit?.id ?? 'new'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setQuestionToEdit(null);
            startTransition(() => {
              router.refresh();
            });
          }}
          subjects={subjects}
          questionToEdit={questionToEdit}
        />
      )}

      {/* Modal for AI Question Generation */}
      {isAIModalOpen && (
        <AIGeneratorModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          subjects={subjects}
          onSuccess={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}
    </div>
  );
}
