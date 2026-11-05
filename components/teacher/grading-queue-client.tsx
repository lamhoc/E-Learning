'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  PenTool,
  Search,
  ShieldAlert,
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
import {
  exportGradeReportToCsv,
  exportGradeReportToExcel,
  type GradeReportRow,
} from '@/lib/excel-export';
import type { TeacherGradingQueueData, TeacherGradingQueueItem } from '@/lib/teacher-grading';

export function GradingQueueClient({
  data,
}: {
  data: TeacherGradingQueueData;
}) {
  const { pendingAttempts, completedAttempts, totalPendingCount, totalCompletedCount, teacherName } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed'>('pending');

  const filterItems = (items: TeacherGradingQueueItem[]) => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.studentName.toLowerCase().includes(q) ||
        item.examTitle.toLowerCase().includes(q) ||
        item.subjectName.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.studentEmail.toLowerCase().includes(q) ||
        (item.studentCode && item.studentCode.toLowerCase().includes(q))
    );
  };

  const filteredPending = filterItems(pendingAttempts);
  const filteredCompleted = filterItems(completedAttempts);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  // Chuẩn bị dữ liệu xuất báo cáo bảng điểm cho trang chấm thi
  const prepareExportRows = (items: TeacherGradingQueueItem[]): GradeReportRow[] => {
    return items.map((item, index) => ({
      stt: index + 1,
      studentCode: item.studentCode || '',
      studentName: item.studentName,
      studentEmail: item.studentEmail || '',
      className: item.className || '—',
      mcScore: item.mcScore !== null ? item.mcScore : '—',
      essayScore: item.essayScore !== null ? item.essayScore : '—',
      totalScore: item.totalScore !== null ? item.totalScore : 'Chờ chấm',
      submittedAt: formatDate(item.submittedAt),
      violationCount: item.tabSwitchCount || 0,
      gradingStatus: item.status === 'completed' ? 'Đã chấm xong' : 'Chờ chấm tự luận',
    }));
  };

  const handleExportExcel = () => {
    // Xuất tất cả các bài thi hoặc theo tab hiện tại
    const targetItems = selectedTab === 'pending' ? filteredPending : filteredCompleted;
    const rows = prepareExportRows(targetItems);
    exportGradeReportToExcel({
      fileName: `BangDiem_ChamThi_${selectedTab === 'pending' ? 'ChoCham' : 'DaHoanTat'}`,
      sheetTitle: selectedTab === 'pending' ? 'Chờ Chấm' : 'Đã Hoàn Tất',
      metadata: {
        examTitle: 'BÁO CÁO CHẤM THI TỰ LUẬN',
        subjectName: selectedTab === 'pending' ? 'Danh sách chờ chấm điểm' : 'Danh sách đã chấm xong',
        teacherName,
        generatedAt: new Date().toLocaleString('vi-VN'),
      },
      rows,
    });
  };

  const handleExportCsv = () => {
    const targetItems = selectedTab === 'pending' ? filteredPending : filteredCompleted;
    const rows = prepareExportRows(targetItems);
    exportGradeReportToCsv({
      fileName: `BangDiem_ChamThi_${selectedTab === 'pending' ? 'ChoCham' : 'DaHoanTat'}`,
      rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 shadow-xs">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Chờ chấm tự luận
              </p>
              <p className="mt-2 text-3xl font-extrabold text-amber-900 dark:text-amber-300 tabular-nums">
                {totalPendingCount}
              </p>
              <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                {totalPendingCount === 0
                  ? 'Tuyệt vời! Tất cả bài thi đã được chấm'
                  : 'Cần giảng viên chấm và công bố điểm'}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shadow-xs">
              <PenTool className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-xs">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Đã hoàn tất chấm
              </p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-900 dark:text-emerald-300 tabular-nums">
                {totalCompletedCount}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Đã công bố điểm cho thí sinh
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shadow-xs">
              <CheckCircle2 className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng bài nộp có tự luận
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {totalPendingCount + totalCompletedCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Trên tất cả các đề do bạn phụ trách
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
              <FileCheck className="size-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs, Export & Search Bar ── */}
      <Tabs
        value={selectedTab}
        onValueChange={(val) => setSelectedTab(val as 'pending' | 'completed')}
        className="w-full space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-[#111C2D] p-1.5 border border-slate-300/80 dark:border-slate-800 w-fit h-auto">
            <TabsTrigger
              value="pending"
              className="group gap-2 text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70 data-[selected]:!bg-blue-600 data-[selected]:!text-white data-[selected]:shadow-md data-[selected]:shadow-blue-600/30 data-[selected]:ring-1 data-[selected]:ring-blue-400/40 data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/30 data-[state=active]:ring-1 data-[state=active]:ring-blue-400/40 aria-selected:!bg-blue-600 aria-selected:!text-white"
            >
              <PenTool className="size-3.5 text-slate-500 dark:text-slate-400 group-data-[selected]:text-white group-data-[state=active]:text-white group-aria-selected:text-white" />
              <span>Chờ chấm điểm</span>
              {totalPendingCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold shadow-xs">
                  {totalPendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="group gap-2 text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70 data-[selected]:!bg-blue-600 data-[selected]:!text-white data-[selected]:shadow-md data-[selected]:shadow-blue-600/30 data-[selected]:ring-1 data-[selected]:ring-blue-400/40 data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/30 data-[state=active]:ring-1 data-[state=active]:ring-blue-400/40 aria-selected:!bg-blue-600 aria-selected:!text-white"
            >
              <CheckCircle2 className="size-3.5 text-slate-500 dark:text-slate-400 group-data-[selected]:text-white group-data-[state=active]:text-white group-aria-selected:text-white" />
              <span>Đã chấm xong</span>
              <span className="grid size-5 place-items-center rounded-full bg-slate-300 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-[10px] font-bold group-data-[selected]:bg-white group-data-[selected]:text-blue-700 group-data-[state=active]:bg-white group-data-[state=active]:text-blue-700 group-aria-selected:bg-white group-aria-selected:text-blue-700 shadow-xs transition-colors">
                {totalCompletedCount}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 bg-[#0D652D] hover:bg-[#0B5324] text-white font-medium text-xs shadow-xs"
            >
              <FileSpreadsheet className="size-4" />
              <span>Xuất Bảng Điểm Excel (.xlsx)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>Xuất CSV</span>
            </Button>

            <div className="relative min-w-48 sm:w-60">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm tên, MSSV, lớp, đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* ── Tab: Chờ chấm tự luận ── */}
        <TabsContent value="pending" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-[#111C2D]/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Danh sách bài thi chờ chấm tự luận
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Bài thi sinh viên đã nộp có phần tự luận cần giáo viên chấm điểm và nhập nhận xét.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {filteredPending.length} bài cần xử lý
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPending.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có bài thi nào đang chờ chấm!'}
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    {searchTerm
                      ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                      : 'Khi sinh viên hoàn thành bài thi tự luận, danh sách sẽ tự động hiển thị tại đây.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
                      <TableRow className="border-slate-200 dark:border-slate-800">
                        <TableHead className="w-12 pl-5 text-center text-slate-700 dark:text-slate-300">#</TableHead>
                        <TableHead className="min-w-[180px] text-slate-700 dark:text-slate-300">Thí sinh & MSSV</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-300">Lớp</TableHead>
                        <TableHead className="min-w-[180px] text-slate-700 dark:text-slate-300">Đề thi & Môn học</TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300">Điểm TN</TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300">Số câu TL</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-300">Thời gian nộp</TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300">Vi phạm</TableHead>
                        <TableHead className="pr-5 text-right text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPending.map((item, idx) => (
                        <TableRow
                          key={item.attemptId}
                          className="hover:bg-amber-50/20 dark:hover:bg-amber-950/20 border-slate-100 dark:border-slate-800/80 transition"
                        >
                          <TableCell className="pl-5 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {item.studentName}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {item.studentCode && <span>MSSV: {item.studentCode}</span>}
                              <span>{item.studentEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {item.className}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                              {item.examTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {item.subjectName} ({item.subjectCode}) · Lần {item.attemptNo}
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.mcScore !== null ? item.mcScore.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
                              <FileQuestion className="size-3" />
                              {item.essayCount} câu
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(item.submittedAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.tabSwitchCount > 0 ? (
                              <Badge variant="outline" className="gap-1 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px]">
                                <ShieldAlert className="size-3" />
                                {item.tabSwitchCount} lần
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">0</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#154C99] hover:bg-[#0F3D8A] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition"
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
          <Card className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-[#111C2D]/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    Bài thi đã chấm xong & Công bố điểm
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Xem lại kết quả chấm thi, điểm số và nhận xét đã lưu.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  {filteredCompleted.length} bài đã hoàn tất
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCompleted.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                    <FileCheck className="size-6" />
                  </span>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có bài thi nào được chấm xong'}
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    Sau khi giáo viên lưu điểm và hoàn tất chấm thi, bài làm sẽ chuyển sang khu vực này.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
                      <TableRow className="border-slate-200 dark:border-slate-800">
                        <TableHead className="w-12 pl-5 text-center text-slate-700 dark:text-slate-300">#</TableHead>
                        <TableHead className="min-w-[180px] text-slate-700 dark:text-slate-300">Thí sinh & MSSV</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-300">Lớp</TableHead>
                        <TableHead className="min-w-[180px] text-slate-700 dark:text-slate-300">Đề thi</TableHead>
                        <TableHead className="text-right text-slate-700 dark:text-slate-300">Điểm TN</TableHead>
                        <TableHead className="text-right text-slate-700 dark:text-slate-300">Điểm TL</TableHead>
                        <TableHead className="text-right text-slate-700 dark:text-slate-300">Tổng điểm</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-300">Ngày công bố</TableHead>
                        <TableHead className="text-center text-slate-700 dark:text-slate-300">Vi phạm</TableHead>
                        <TableHead className="pr-5 text-right text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCompleted.map((item, idx) => (
                        <TableRow
                          key={item.attemptId}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 transition"
                        >
                          <TableCell className="pl-5 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {item.studentName}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {item.studentCode && <span>MSSV: {item.studentCode}</span>}
                              <span>{item.studentEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {item.className}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                              {item.examTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {item.subjectName} · Lần {item.attemptNo}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                            {item.mcScore !== null ? item.mcScore.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                            {item.essayScore !== null ? item.essayScore.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            {item.totalScore !== null ? item.totalScore.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(item.releasedAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.tabSwitchCount > 0 ? (
                              <Badge variant="outline" className="gap-1 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px]">
                                <ShieldAlert className="size-3" />
                                {item.tabSwitchCount} lần
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">0</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#154C99] dark:hover:text-[#60A5FA]"
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
