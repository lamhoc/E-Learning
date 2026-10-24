'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileQuestion,
  GraduationCap,
  PenTool,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TeacherGradingQueueData, TeacherGradingQueueItem } from '@/lib/teacher-grading';

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function GradingQueueClient({ data }: { data: TeacherGradingQueueData }) {
  const { pendingAttempts, completedAttempts, totalPendingCount, totalCompletedCount } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed'>('pending');

  const filterItems = (list: TeacherGradingQueueItem[]) => {
    if (!searchTerm.trim()) return list;
    const query = searchTerm.toLowerCase();
    return list.filter(
      (item) =>
        item.studentName.toLowerCase().includes(query) ||
        (item.studentCode && item.studentCode.toLowerCase().includes(query)) ||
        item.examTitle.toLowerCase().includes(query) ||
        item.subjectName.toLowerCase().includes(query),
    );
  };

  const filteredPending = useMemo(() => filterItems(pendingAttempts), [pendingAttempts, searchTerm]);
  const filteredCompleted = useMemo(() => filterItems(completedAttempts), [completedAttempts, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats Bento Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Chờ chấm tự luận
              </p>
              <p className="mt-2 text-3xl font-extrabold text-amber-900 tabular-nums">
                {totalPendingCount}
              </p>
              <p className="mt-0.5 text-xs text-amber-700/80">
                {totalPendingCount === 0
                  ? 'Tuyệt vời! Tất cả bài thi đã được chấm'
                  : 'Cần giảng viên chấm và công bố điểm'}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
              <PenTool className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/40">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Đã hoàn tất chấm
              </p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-900 tabular-nums">
                {totalCompletedCount}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80">
                Đã công bố điểm cho thí sinh
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
              <CheckCircle2 className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tổng bài nộp có tự luận
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">
                {totalPendingCount + totalCompletedCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Trên tất cả các đề do bạn phụ trách
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 shadow-xs">
              <FileCheck className="size-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <Tabs
        value={selectedTab}
        onValueChange={(val) => setSelectedTab(val as 'pending' | 'completed')}
        className="w-full space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-10 bg-slate-100 p-1">
            <TabsTrigger
              value="pending"
              className="gap-2 px-3 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-xs"
            >
              <PenTool className="size-3.5" />
              <span>Chờ chấm điểm</span>
              {totalPendingCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {totalPendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="gap-2 px-3 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-xs"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Đã chấm xong ({totalCompletedCount})</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên SV, MSSV, đề thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-white"
            />
          </div>
        </div>

        {/* ── Tab: Chờ chấm tự luận ── */}
        <TabsContent value="pending" className="mt-0">
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white/70 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Danh sách bài thi chờ chấm tự luận
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bài thi sinh viên đã nộp có phần tự luận cần giáo viên chấm điểm và nhập nhận xét.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  {filteredPending.length} bài cần xử lý
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPending.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có bài thi nào đang chờ chấm!'}
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    {searchTerm
                      ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                      : 'Khi sinh viên hoàn thành bài thi tự luận, danh sách sẽ tự động hiển thị tại đây.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="w-12 pl-5 text-center">#</TableHead>
                        <TableHead className="min-w-[180px]">Thí sinh</TableHead>
                        <TableHead className="min-w-[200px]">Đề thi & Môn học</TableHead>
                        <TableHead className="text-center">Số câu TL</TableHead>
                        <TableHead>Thời gian nộp</TableHead>
                        <TableHead>Giám sát thi</TableHead>
                        <TableHead className="pr-5 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((item, idx) => (
                        <TableRow key={item.attemptId} className="hover:bg-amber-50/20 transition">
                          <TableCell className="pl-5 text-center font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {item.studentName}
                            </p>
                            {item.studentCode ? (
                              <p className="mt-0.5 font-mono text-[11px] font-medium text-slate-500">
                                MSSV: {item.studentCode}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-400 italic">
                                Chưa có MSSV
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 line-clamp-1">
                              {item.examTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.subjectName} ({item.subjectCode}) · Lần {item.attemptNo}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2 py-0.5 text-xs font-semibold text-amber-900">
                              <FileQuestion className="size-3" />
                              {item.essayCount} câu
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDate(item.submittedAt)}
                          </TableCell>
                          <TableCell>
                            {item.tabSwitchCount > 0 ? (
                              <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-800 text-[11px]">
                                <AlertTriangle className="size-3" />
                                Rời tab {item.tabSwitchCount} lần
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Bình thường</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#17372e] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#20493e]"
                            >
                              <PenTool className="size-3.5" />
                              <span>Chấm bài</span>
                              <ArrowRight className="size-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Đã chấm xong ── */}
        <TabsContent value="completed" className="mt-0">
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white/70 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Bài thi đã chấm xong & Công bố điểm
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Xem lại kết quả chấm thi, điểm số và nhận xét đã lưu.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                  {filteredCompleted.length} bài đã hoàn tất
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCompleted.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <FileCheck className="size-6" />
                  </span>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có bài thi nào được chấm xong'}
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    Sau khi giáo viên lưu điểm và hoàn tất chấm thi, bài làm sẽ chuyển sang khu vực này.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="w-12 pl-5 text-center">#</TableHead>
                        <TableHead className="min-w-[180px]">Thí sinh</TableHead>
                        <TableHead className="min-w-[200px]">Đề thi</TableHead>
                        <TableHead className="text-right">Tổng điểm</TableHead>
                        <TableHead>Ngày công bố</TableHead>
                        <TableHead>Giám sát thi</TableHead>
                        <TableHead className="pr-5 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompleted.map((item, idx) => (
                        <TableRow key={item.attemptId} className="hover:bg-slate-50/70 transition">
                          <TableCell className="pl-5 text-center font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {item.studentName}
                            </p>
                            {item.studentCode && (
                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                MSSV: {item.studentCode}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 line-clamp-1">
                              {item.examTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.subjectName} · Lần {item.attemptNo}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-emerald-800">
                            {item.totalScore !== null ? item.totalScore.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDate(item.releasedAt)}
                          </TableCell>
                          <TableCell>
                            {item.tabSwitchCount > 0 ? (
                              <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-800 text-[11px]">
                                <AlertTriangle className="size-3" />
                                Rời tab {item.tabSwitchCount} lần
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Bình thường</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-emerald-800"
                            >
                              <span>Xem lại bài</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

