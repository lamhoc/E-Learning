'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  GraduationCap,
  Mail,
  Search,
  Table as TableIcon,
  TrendingUp,
  Users,
} from 'lucide-react';
import Papa from 'papaparse';
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
import { ExamScoreChart } from '@/components/teacher/exam-score-chart';
import type { TeacherExamAnalyticsData } from '@/lib/teacher-exam-analytics';

export function ExamAnalyticsClient({
  data,
}: {
  data: TeacherExamAnalyticsData;
}) {
  const { exam, metrics, distribution, studentResults } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');

  // Lọc danh sách sinh viên theo từ khóa và trạng thái đạt/chưa đạt
  const filteredResults = studentResults.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.studentName.toLowerCase().includes(term) ||
      item.studentEmail.toLowerCase().includes(term) ||
      (item.studentCode && item.studentCode.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (resultFilter === 'passed') return item.isPassed;
    if (resultFilter === 'failed') return !item.isPassed;
    return true;
  });

  // Xuất file CSV báo cáo bảng điểm chi tiết (UTF-8 BOM hỗ trợ tiếng Việt có dấu trong Excel)
  const handleExportCsv = () => {
    try {
      const csvRows = studentResults.map((item, index) => ({
        'STT': index + 1,
        'Họ và tên': item.studentName,
        'Mã sinh viên': item.studentCode || '',
        'Email': item.studentEmail,
        'Lượt thi': item.attemptNo,
        'Điểm trắc nghiệm': item.mcScore.toFixed(2),
        'Điểm tự luận': item.essayScore.toFixed(2),
        'Tổng điểm': item.totalScore.toFixed(2),
        'Kết quả': item.isPassed ? 'Đạt' : 'Không đạt',
        'Thời gian nộp bài': item.submittedAt
          ? new Intl.DateTimeFormat('vi-VN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(item.submittedAt))
          : '—',
      }));

      const csvString = Papa.unparse(csvRows);
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const safeTitle = (exam.title || 'de-thi')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 40);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BangDiem_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất file CSV bảng điểm:', err);
      alert('Không thể xuất file CSV. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Quick Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Bài thi đã chấm
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalGraded}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">lượt làm bài</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary dark:bg-blue-900/40 dark:text-blue-300">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Điểm trung bình
              </p>
              <p className="mt-1 text-2xl font-bold text-[#154C99] dark:text-[#60A5FA]">
                {metrics.averageScore.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">thang điểm {exam.maxScore}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tỉ lệ đạt (≥ 5.0)
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{metrics.passRate}%</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                {metrics.passedCount}/{metrics.totalGraded} thí sinh
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Điểm cao nhất
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                {metrics.highestScore.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Thấp nhất: {metrics.lowestScore.toFixed(2)}
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs View: Phổ điểm & Danh sách Bảng điểm */}
      <Tabs defaultValue="chart" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <TabsTrigger value="chart" className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              <span>Phổ điểm</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 text-xs">
              <TableIcon className="size-3.5" />
              <span>Bảng điểm chi tiết ({studentResults.length})</span>
            </TabsTrigger>
          </TabsList>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs self-start sm:self-auto"
          >
            <Download className="size-4" />
            <span>Xuất file CSV</span>
          </Button>
        </div>

        {/* TAB 1: PHỔ ĐIỂM (RECHARTS BAR CHART) */}
        <TabsContent value="chart" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="size-5 text-[#154C99] dark:text-[#3B82F6]" />
                    Biểu đồ Phân phối Phổ điểm
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Số lượng sinh viên đạt điểm trong các khoảng: 0-2 (Kém), 3-4 (Yếu), 5-6 (Trung bình), 7-8 (Khá), 9-10 (Giỏi).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                  {metrics.totalGraded} bài thi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ExamScoreChart
                distribution={distribution}
                totalGraded={metrics.totalGraded}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BẢNG ĐIỂM CHI TIẾT & BỘ LỌC */}
        <TabsContent value="table" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="size-5 text-[#154C99] dark:text-[#3B82F6]" />
                    Danh sách Điểm Thí sinh
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Chi tiết điểm trắc nghiệm, tự luận và tổng kết quả của từng sinh viên dự thi.
                  </CardDescription>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1">
                    <button
                      type="button"
                      onClick={() => setResultFilter('all')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Tất cả ({studentResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('passed')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'passed'
                          ? 'bg-white dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Đạt ({metrics.passedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('failed')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'failed'
                          ? 'bg-white dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Không đạt ({studentResults.length - metrics.passedCount})
                    </button>
                  </div>

                  <div className="relative min-w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Tìm tên, mã SV, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredResults.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy sinh viên phù hợp</p>
                  <p className="mt-1 text-slate-400 dark:text-slate-500">
                    Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc kết quả.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                        <TableHead className="w-12 pl-5 font-semibold text-slate-700 dark:text-slate-300">STT</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Thí sinh</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Email</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Lượt thi</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Điểm TN</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Điểm TL</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Tổng điểm</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Kết quả</TableHead>
                        <TableHead className="pr-5 text-right font-semibold text-slate-700 dark:text-slate-300">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredResults.map((item, index) => (
                        <TableRow
                          key={item.attemptId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 transition"
                        >
                          <TableCell className="pl-5 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {item.studentName}
                            </p>
                            {item.studentCode ? (
                              <p className="mt-0.5 text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                                Mã SV: {item.studentCode}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 italic">
                                Chưa có mã SV
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <Mail className="size-3 text-slate-400 dark:text-slate-500" />
                              {item.studentEmail}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              #{item.attemptNo}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                            {item.mcScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                            {item.essayScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-[#154C99] dark:text-[#60A5FA]">
                            {item.totalScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.isPassed ? (
                              <Badge className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                                Đạt
                              </Badge>
                            ) : (
                              <Badge className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] font-semibold">
                                Không đạt
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#154C99] dark:hover:text-[#60A5FA]"
                            >
                              <span>Xem bài</span>
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
