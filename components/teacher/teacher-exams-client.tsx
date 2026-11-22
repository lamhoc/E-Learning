'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileQuestion,
  HelpCircle,
  LoaderCircle,
  PenTool,
  PlusCircle,
  Search,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { deleteDraftExamAction, publishExistingDraftExamAction } from '@/app/teacher/exams/create/actions';

export type ExamItem = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  duration_minutes: number;
  created_at: string;
  available_from: string | null;
  available_until: string | null;
  subjectName: string;
  questionCount: number;
  assignedClasses: string[];
  totalAttempts: number;
  pendingAttempts: number;
  requireCamera?: boolean;
  autoGradeEssay?: boolean;
  showAnswersAfterSubmit?: boolean;
};

type Props = {
  exams: ExamItem[];
};

export function TeacherExamsClient({ exams }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đọc tab từ searchParams nếu có
  const initialTab = (searchParams.get('tab') as 'all' | 'published' | 'draft' | 'closed') || 'all';

  const [examList, setExamList] = useState<ExamItem[]>(exams);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'closed'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Trạng thái xử lý xuất bản nhanh & xóa nháp
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync lại khi prop exams thay đổi
  useEffect(() => {
    setExamList(exams);
  }, [exams]);

  // Cập nhật tab khi searchParams thay đổi
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['all', 'published', 'draft', 'closed'].includes(tab)) {
      setFilterStatus(tab as 'all' | 'published' | 'draft' | 'closed');
    }
  }, [searchParams]);

  // Tự động tắt feedback sau 4.5s
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const stats = useMemo(() => {
    const total = examList.length;
    const published = examList.filter((e) => e.status === 'published').length;
    const draft = examList.filter((e) => e.status === 'draft').length;
    const closed = examList.filter((e) => e.status === 'closed' || e.status === 'archived').length;
    return { total, published, draft, closed };
  }, [examList]);

  const filteredExams = useMemo(() => {
    return examList.filter((exam) => {
      const matchStatus = filterStatus === 'all' || exam.status === filterStatus;
      const matchSearch =
        !searchQuery.trim() ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [examList, filterStatus, searchQuery]);

  // Xử lý xuất bản nhanh trực tiếp trên thẻ đề thi nháp
  const handleQuickPublish = async (exam: ExamItem) => {
    setPublishingId(exam.id);
    setFeedback(null);

    const res = await publishExistingDraftExamAction(exam.id);
    setPublishingId(null);

    if (res.status === 'error') {
      setFeedback({ type: 'error', message: res.message });
    } else {
      // 1. Cập nhật state local ngay tức thì: chuyển trạng thái sang published
      setExamList((prev) =>
        prev.map((item) => (item.id === exam.id ? { ...item, status: 'published' } : item)),
      );

      // 2. Chuyển tab sang 'published' để người dùng thấy đề thi vừa xuất bản
      setFilterStatus('published');
      router.replace('/teacher/exams?tab=published', { scroll: false });

      // 3. Thông báo thành công
      setFeedback({
        type: 'success',
        message: `Đã xuất bản đề thi "${exam.title}" thành công! Đề thi đã được chuyển sang mục Đã phát hành.`,
      });
    }
  };

  // Xử lý xóa bản nháp
  const handleDeleteDraft = async (exam: ExamItem) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa bản nháp đề thi "${exam.title}" không? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    setDeletingId(exam.id);
    setFeedback(null);

    const res = await deleteDraftExamAction(exam.id);
    setDeletingId(null);

    if (res.status === 'error') {
      setFeedback({ type: 'error', message: res.message });
    } else {
      // Loại bỏ đề thi khỏi danh sách local
      setExamList((prev) => prev.filter((item) => item.id !== exam.id));
      setFeedback({
        type: 'success',
        message: res.message,
      });
    }
  };

  function getStatusBadge(status: ExamItem['status']) {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-semibold">
            Đã phát hành
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold">
            Bản nháp
          </Badge>
        );
      case 'closed':
      case 'archived':
        return (
          <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40 text-xs font-semibold">
            Đã đóng
          </Badge>
        );
    }
  }

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-xl p-4 text-xs font-semibold shadow-sm animate-in fade-in zoom-in-95 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 transition"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileCheck className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                TỔNG ĐỀ THI
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Đã khởi tạo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                ĐÃ PHÁT HÀNH
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.published}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Đang mở cho thí sinh</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <FileQuestion className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                BẢN NHÁP
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.draft}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Chờ hoàn thiện cấu hình</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Clock className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                ĐÃ ĐÓNG / LƯU TRỮ
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.closed}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Hết hạn làm bài</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Pills Tabs */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-[#111C2D] p-1.5 border border-slate-300/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setFilterStatus('all');
              router.replace('/teacher/exams?tab=all', { scroll: false });
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              filterStatus === 'all'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filterStatus === 'all'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('published');
              router.replace('/teacher/exams?tab=published', { scroll: false });
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              filterStatus === 'published'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Đã phát hành</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filterStatus === 'published'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.published}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('draft');
              router.replace('/teacher/exams?tab=draft', { scroll: false });
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              filterStatus === 'draft'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Bản nháp</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filterStatus === 'draft'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.draft}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('closed');
              router.replace('/teacher/exams?tab=closed', { scroll: false });
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              filterStatus === 'closed'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Đã đóng</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filterStatus === 'closed'
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.closed}
            </span>
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên đề, môn..."
            className="pl-9 h-10 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C2D]"
          />
        </div>
      </div>

      {/* Danh sách đề thi */}
      {filteredExams.length === 0 ? (
        <Card className="border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <FileCheck className="size-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
              Không tìm thấy đề thi phù hợp
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
            </p>
            <Link
              href="/teacher/exams/create"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <PlusCircle className="size-4" />
              Tạo đề thi mới ngay
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card
              key={exam.id}
              className="group flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] transition-all hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px]"
                    >
                      {exam.subjectName}
                    </Badge>
                    {exam.requireCamera ? (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-semibold gap-1">
                        <Camera className="size-3" />
                        <span>Bắt buộc Camera</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">
                        Không yêu cầu Camera
                      </Badge>
                    )}
                    {exam.autoGradeEssay ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold gap-1">
                        <Zap className="size-3" />
                        <span>⚡ Tự chấm tự luận</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px]">
                        <span>✍️ GV chấm tự luận</span>
                      </Badge>
                    )}
                    {exam.showAnswersAfterSubmit !== false ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold gap-1">
                        <Eye className="size-3" />
                        <span>Cho xem đáp án</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] gap-1">
                        <EyeOff className="size-3 text-slate-400" />
                        <span>Ẩn đáp án</span>
                      </Badge>
                    )}
                  </div>
                  {getStatusBadge(exam.status)}
                </div>

                <CardTitle className="mt-3 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {exam.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                  Tạo ngày: {formatDate(exam.created_at)}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="space-y-2 border-y border-slate-100 dark:border-slate-800/80 py-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-slate-400" />
                      <span>Thời lượng:</span>
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {exam.duration_minutes} phút
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="size-3.5 text-slate-400" />
                      <span>Số câu hỏi:</span>
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {exam.questionCount} câu
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-slate-400" />
                      <span>Số lượt thi nộp:</span>
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {exam.totalAttempts} bài {exam.pendingAttempts > 0 && `(${exam.pendingAttempts} chờ chấm)`}
                    </strong>
                  </div>
                </div>

                {/* Khu vực nút thao tác: Tùy biến linh hoạt cho Bản nháp vs Đã phát hành */}
                {exam.status === 'draft' ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/exams/create?editId=${exam.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-3 py-2 text-xs font-semibold transition"
                        title="Mở lại form chỉnh sửa cấu hình đề thi"
                      >
                        <span>✏️ Chỉnh sửa bản nháp</span>
                      </Link>

                      <Button
                        type="button"
                        disabled={publishingId === exam.id || deletingId === exam.id}
                        onClick={() => handleQuickPublish(exam)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-xs font-semibold shadow-xs transition"
                        title="Xuất bản ngay để học sinh có thể vào thi"
                      >
                        {publishingId === exam.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <span>🚀 Xuất bản ngay</span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={publishingId === exam.id || deletingId === exam.id}
                        onClick={() => handleDeleteDraft(exam)}
                        className="h-9 w-9 shrink-0 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Xóa bản nháp này"
                      >
                        {deletingId === exam.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1 transition"
                      >
                        <BarChart3 className="size-3" />
                        <span>Xem chi tiết & phổ điểm</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                    >
                      <BarChart3 className="size-3.5" />
                      <span>Phổ điểm & Chi tiết</span>
                    </Link>

                    {exam.pendingAttempts > 0 && (
                      <Link
                        href="/teacher/grading"
                        className="inline-flex items-center justify-center rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition"
                        title="Chấm bài thi tự luận"
                      >
                        <PenTool className="size-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
