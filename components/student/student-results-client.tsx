'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  GraduationCap,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type ExamResultRecord = {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  attemptNo: number;
  submittedAt: string | null;
  status: 'in_progress' | 'pending_grading' | 'completed' | 'voided';
  totalScore: number | null;
  objectiveScore: number | null;
  subjectiveScore: number | null;
  feedback: string | null;
  isPassed: boolean;
};

export type AssignmentResultRecord = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  className: string;
  subjectName: string;
  submittedAt: string;
  grade: number | null;
  maxScore: number;
  feedback: string | null;
  status: string;
};

type Props = {
  examResults: ExamResultRecord[];
  assignmentResults: AssignmentResultRecord[];
};

export function StudentResultsClient({ examResults, assignmentResults }: Props) {
  const [activeTab, setActiveTab] = useState<'exams' | 'assignments'>('exams');
  const [examFilter, setExamFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');

  const filteredExams = useMemo(() => {
    return examResults.filter((item) => {
      if (examFilter === 'all') return true;
      if (examFilter === 'passed') return item.status === 'completed' && item.isPassed;
      if (examFilter === 'failed') return item.status === 'completed' && !item.isPassed;
      if (examFilter === 'pending') return item.status === 'pending_grading';
      return true;
    });
  }, [examResults, examFilter]);

  // Thống kê chung
  const stats = useMemo(() => {
    const completedExams = examResults.filter(
      (e) => e.status === 'completed' && e.totalScore !== null
    );
    const totalScoreSum = completedExams.reduce((sum, e) => sum + (e.totalScore || 0), 0);
    const averageScore = completedExams.length > 0 ? (totalScoreSum / completedExams.length).toFixed(1) : '0.0';
    const passedCount = completedExams.filter((e) => e.isPassed).length;
    const passRate =
      completedExams.length > 0
        ? Math.round((passedCount / completedExams.length) * 100)
        : 0;

    return {
      averageScore,
      completedCount: completedExams.length,
      passedCount,
      passRate,
      assignmentCount: assignmentResults.length,
    };
  }, [examResults, assignmentResults]);

  function formatDate(iso: string | null) {
    if (!iso) return 'Chưa ghi nhận';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Tổng quan */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                ĐIỂM TRUNG BÌNH THI
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.averageScore} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Từ {stats.completedCount} bài thi có điểm
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                TỶ LỆ ĐẠT (≥ 5.0)
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.passRate}%
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {stats.passedCount} / {stats.completedCount} lượt thi đạt
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <FileCheck2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                BÀI TẬP ĐÃ NỘP
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.assignmentCount}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Bài tập các lớp phụ trách</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-12 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                TỔNG LƯỢT THI
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {examResults.length}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Đã tham gia phòng thi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Switcher: Kết quả Đề thi vs Bài tập */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-[#111C2D] p-1.5 border border-slate-300/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${
              activeTab === 'exams'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="size-3.5" />
            <span>Kết quả Đề thi ({examResults.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${
              activeTab === 'assignments'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCheck2 className="size-3.5" />
            <span>Bài tập về nhà ({assignmentResults.length})</span>
          </button>
        </div>

        {activeTab === 'exams' && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-1 text-xs">
            <button
              type="button"
              onClick={() => setExamFilter('all')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                examFilter === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tất cả ({examResults.length})
            </button>
            <button
              type="button"
              onClick={() => setExamFilter('passed')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                examFilter === 'passed'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Đạt (≥5.0)
            </button>
            <button
              type="button"
              onClick={() => setExamFilter('failed')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                examFilter === 'failed'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Chưa đạt (&lt;5.0)
            </button>
            <button
              type="button"
              onClick={() => setExamFilter('pending')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                examFilter === 'pending'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Chờ chấm
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Kết quả Đề thi */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {filteredExams.length === 0 ? (
            <Card className="border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <Trophy className="size-6" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  Chưa có kết quả thi nào
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Sau khi nộp bài thi và hệ thống công bố điểm, kết quả của bạn sẽ hiển thị tại đây.
                </p>
                <Link
                  href="/student/exams"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Vào phòng thi trực tuyến
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((item) => {
                const hasScore = item.status === 'completed' && item.totalScore !== null;

                return (
                  <Card
                    key={item.id}
                    className="flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] transition hover:shadow-md"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 text-[11px]"
                        >
                          {item.subjectName}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                        >
                          Lần thi {item.attemptNo}
                        </Badge>
                      </div>

                      <CardTitle className="mt-3 text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                        {item.examTitle}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                        Nộp lúc: {formatDate(item.submittedAt)}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0">
                      <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-4">
                        {item.status === 'pending_grading' ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              Đang chờ giảng viên chấm
                            </span>
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                              Chờ chấm
                            </Badge>
                          </div>
                        ) : hasScore ? (
                          <div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Tổng điểm:
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span
                                  className={`text-2xl font-bold ${
                                    item.isPassed
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {Number(item.totalScore).toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500">/ 10</span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 pt-2 text-[11px] text-slate-600 dark:text-slate-300">
                              <span>Trắc nghiệm: {item.objectiveScore ?? 0}</span>
                              <span>Tự luận: {item.subjectiveScore ?? 0}</span>
                              <Badge
                                className={`text-[10px] ${
                                  item.isPassed
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {item.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Chưa có điểm</p>
                        )}
                      </div>

                      {item.feedback && (
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          <strong>Nhận xét:</strong> {item.feedback}
                        </p>
                      )}

                      <div className="mt-4">
                        <Link
                          href={`/student/exams/${item.examId}`}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                          <BookOpen className="size-3.5" />
                          <span>Xem chi tiết đề thi</span>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kết quả Bài tập về nhà */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignmentResults.length === 0 ? (
            <Card className="border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <FileCheck2 className="size-6" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  Chưa có bài tập nào được nộp
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Hãy vào mục Bài tập để hoàn thành các nhiệm vụ được giao.
                </p>
                <Link
                  href="/student/assignments"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Xem danh sách bài tập
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assignmentResults.map((sub) => (
                <Card
                  key={sub.id}
                  className="flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] transition hover:shadow-md"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 text-[11px]"
                      >
                        {sub.subjectName} · {sub.className}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                      >
                        Đã nộp
                      </Badge>
                    </div>

                    <CardTitle className="mt-3 text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                      {sub.assignmentTitle}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                      Nộp lúc: {formatDate(sub.submittedAt)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-4">
                      {sub.grade !== null ? (
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Điểm số:
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {sub.grade}
                            </span>
                            <span className="text-xs text-slate-500">/ {sub.maxScore}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Chờ giảng viên chấm điểm
                          </span>
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                            Đang đợi điểm
                          </Badge>
                        </div>
                      )}
                    </div>

                    {sub.feedback && (
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        <strong>Lời phê:</strong> {sub.feedback}
                      </p>
                    )}

                    <div className="mt-4">
                      <Link
                        href="/student/assignments"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        <FileCheck2 className="size-3.5" />
                        <span>Xem chi tiết bài nộp</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
