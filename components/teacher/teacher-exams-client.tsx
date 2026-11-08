'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  FileCheck,
  FileQuestion,
  HelpCircle,
  PenTool,
  PlusCircle,
  Search,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
};

type Props = {
  exams: ExamItem[];
};

export function TeacherExamsClient({ exams }: Props) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchStatus = filterStatus === 'all' || exam.status === filterStatus;
      const matchSearch =
        !searchQuery.trim() ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [exams, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter((e) => e.status === 'published').length;
    const draft = exams.filter((e) => e.status === 'draft').length;
    const closed = exams.filter((e) => e.status === 'closed' || e.status === 'archived').length;
    return { total, published, draft, closed };
  }, [exams]);

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
        {/* Pills Tabs với màu xanh Active chuẩn */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-[#111C2D] p-1.5 border border-slate-300/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
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
            onClick={() => setFilterStatus('published')}
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
            onClick={() => setFilterStatus('draft')}
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
            onClick={() => setFilterStatus('closed')}
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
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px]"
                  >
                    {exam.subjectName}
                  </Badge>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
