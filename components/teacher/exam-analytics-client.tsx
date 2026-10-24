'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
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
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StudentExamResultItem, TeacherExamAnalyticsData } from '@/lib/teacher-exam-analytics';

// Lazy loading biểu đồ Recharts nhằm loại bỏ tắc nghẽn main-thread bundle
const ExamScoreChart = dynamic(
  () => import('./exam-score-chart').then((mod) => mod.ExamScoreChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-xl bg-slate-50/50 p-6">
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    ),
  }
);

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

export function ExamAnalyticsClient({
  data,
}: {
  data: TeacherExamAnalyticsData;
}) {
  const { exam, metrics, distribution, studentResults } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Lọc danh sách sinh viên
  const filteredResults = useMemo(() => {
    return studentResults.filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        item.studentName.toLowerCase().includes(query) ||
        item.studentEmail.toLowerCase().includes(query) ||
        (item.studentCode && item.studentCode.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (resultFilter === 'passed') return item.isPassed;
      if (resultFilter === 'failed') return !item.isPassed;
      return true;
    });
  }, [studentResults, searchTerm, resultFilter]);

  // Hàm tiện ích xuất file CSV (tương thích 100% Microsoft Excel tiếng Việt UTF-8)
  const handleExportCSV = () => {
    if (studentResults.length === 0) {
      alert('Chưa có dữ liệu bài thi đã chấm để xuất.');
      return;
    }

    setIsExporting(true);
    try {
      const exportRows = studentResults.map((s, index) => ({
        'STT': index + 1,
        'Mã Sinh Viên': s.studentCode || 'N/A',
        'Họ và Tên': s.studentName,
        'Email': s.studentEmail,
        'Lượt Thi': `Lượt ${s.attemptNo}`,
        'Điểm Trắc Nghiệm': s.mcScore.toFixed(2),
        'Điểm Tự Luận': s.essayScore.toFixed(2),
        'Tổng Điểm': s.totalScore.toFixed(2),
        'Kết Quả': s.isPassed ? 'Đạt' : 'Không đạt',
        'Thời Gian Nộp': s.submittedAt ? formatDate(s.submittedAt) : '—',
        'Ngày Công Bố Điểm': formatDate(s.releasedAt),
      }));

      // Chuyển sang chuỗi CSV bằng papaparse
      const csvString = Papa.unparse(exportRows, {
        quotes: true,
        header: true,
      });

      // Thêm Byte Order Mark (BOM) UTF-8 để Microsoft Excel hiển thị tiếng Việt có dấu chuẩn xác
      const blob = new Blob(['\uFEFF' + csvString], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeExamTitle = exam.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `BangDiem_${safeExamTitle}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Đã xảy ra lỗi khi xuất file dữ liệu.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Quick Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Bài thi đã chấm
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.totalGraded}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">lượt làm bài</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#17372e]">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Điểm trung bình
              </p>
              <p className="mt-1 text-2xl font-bold text-[#17372e]">
                {metrics.averageScore.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">thang điểm {exam.maxScore}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tỉ lệ đạt (≥ 5.0)
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{metrics.passRate}%</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {metrics.passedCount}/{metrics.totalGraded} thí sinh
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-100/70 text-emerald-800">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Điểm cao nhất
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {metrics.highestScore.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Thấp nhất: {metrics.lowestScore.toFixed(2)}
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Award className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Export Tabs */}
      <Tabs defaultValue="chart" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-200/80 p-1 rounded-xl w-fit">
            <TabsTrigger value="chart" className="gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
              <BarChart3 className="size-3.5" />
              Phổ điểm Thí sinh
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
              <FileSpreadsheet className="size-3.5" />
              Bảng điểm Chi tiết ({studentResults.length})
            </TabsTrigger>
          </TabsList>

          {/* Action Export Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || studentResults.length === 0}
            className="gap-2 bg-[#17372e] hover:bg-[#20493e] text-white text-xs font-medium px-4 h-9 shadow-xs"
          >
            <Download className="size-4" />
            Xuất file CSV (Excel)
          </Button>
        </div>

        {/* TAB 1: PHỔ ĐIỂM (RECHARTS BAR CHART) */}
        <TabsContent value="chart" className="space-y-6 outline-none">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="size-5 text-[#17372e]" />
                    Biểu đồ Phân phối Phổ điểm
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Số lượng sinh viên đạt điểm trong các khoảng: 0-2 (Kém), 3-4 (Yếu), 5-6 (Trung bình), 7-8 (Khá), 9-10 (Giỏi).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-50 font-mono text-xs">
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
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="size-5 text-[#17372e]" />
                    Danh sách Điểm Thí sinh
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Chi tiết điểm trắc nghiệm, tự luận và tổng kết quả của từng sinh viên dự thi.
                  </CardDescription>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setResultFilter('all')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Tất cả ({studentResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('passed')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'passed'
                          ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Đạt ({metrics.passedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('failed')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === 'failed'
                          ? 'bg-white text-rose-800 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Không đạt ({studentResults.length - metrics.passedCount})
                    </button>
                  </div>

                  <div className="relative min-w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Tìm tên, mã SV, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredResults.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Không tìm thấy sinh viên phù hợp</p>
                  <p className="mt-1 text-slate-400">
                    Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc kết quả.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="w-12 pl-5 font-semibold text-slate-700">STT</TableHead>
                        <TableHead className="font-semibold text-slate-700">Thí sinh</TableHead>
                        <TableHead className="font-semibold text-slate-700">Email</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Lượt thi</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Điểm TN</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Điểm TL</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Tổng điểm</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700">Kết quả</TableHead>
                        <TableHead className="pr-5 text-right font-semibold text-slate-700">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {filteredResults.map((item, index) => (
                        <TableRow key={item.attemptId} className="hover:bg-slate-50/50 transition">
                          <TableCell className="pl-5 text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {item.studentName}
                            </p>
                            {item.studentCode ? (
                              <p className="mt-0.5 text-[11px] font-mono font-medium text-slate-500">
                                Mã SV: {item.studentCode}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-400 italic">
                                Chưa có mã SV
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <Mail className="size-3 text-slate-400" />
                              {item.studentEmail}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                              #{item.attemptNo}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700">
                            {item.mcScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700">
                            {item.essayScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-[#17372e]">
                            {item.totalScore.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.isPassed ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                                Đạt
                              </Badge>
                            ) : (
                              <Badge className="border-rose-200 bg-rose-50 text-rose-800 text-[11px] font-semibold">
                                Không đạt
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-emerald-800"
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

