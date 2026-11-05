'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Mail,
  Search,
  ShieldAlert,
  Sparkles,
  Table as TableIcon,
  TrendingUp,
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
import { ExamScoreChart } from '@/components/teacher/exam-score-chart';
import {
  exportGradeReportToCsv,
  exportGradeReportToExcel,
  type GradeReportRow,
} from '@/lib/excel-export';
import type { QuestionItemAnalysis, TeacherExamAnalyticsData } from '@/lib/teacher-exam-analytics';

export function ExamAnalyticsClient({
  data,
}: {
  data: TeacherExamAnalyticsData;
}) {
  const { exam, metrics, distribution, studentResults, itemAnalysis = [] } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'multiple_choice' | 'essay' | 'review'>('all');

  // Lọc danh sách sinh viên theo từ khóa và trạng thái đạt/chưa đạt
  const filteredResults = studentResults.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.studentName.toLowerCase().includes(term) ||
      item.studentEmail.toLowerCase().includes(term) ||
      item.className.toLowerCase().includes(term) ||
      (item.studentCode && item.studentCode.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (resultFilter === 'passed') return item.isPassed;
    if (resultFilter === 'failed') return !item.isPassed;
    return true;
  });

  // Lọc bảng phân tích câu hỏi
  const filteredItemAnalysis = itemAnalysis.filter((q) => {
    if (itemTypeFilter === 'multiple_choice') return q.questionType === 'multiple_choice';
    if (itemTypeFilter === 'essay') return q.questionType === 'essay';
    if (itemTypeFilter === 'review') return q.badgeVariant === 'rose' || q.badgeVariant === 'amber';
    return true;
  });

  // Chuẩn bị dữ liệu xuất báo cáo
  const prepareExportRows = (): GradeReportRow[] => {
    return studentResults.map((item, index) => ({
      stt: index + 1,
      studentCode: item.studentCode || '',
      studentName: item.studentName,
      studentEmail: item.studentEmail,
      className: item.className || '—',
      mcScore: item.mcScore,
      essayScore: item.essayScore,
      totalScore: item.totalScore,
      submittedAt: item.submittedAt
        ? new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(item.submittedAt))
        : '—',
      violationCount: item.violationCount,
      gradingStatus: item.gradingStatus,
    }));
  };

  const handleExportExcel = () => {
    const rows = prepareExportRows();
    exportGradeReportToExcel({
      fileName: `BangDiem_${exam.subjectCode}_${exam.title}`,
      sheetTitle: 'Bảng Điểm',
      metadata: {
        examTitle: exam.title,
        subjectName: `${exam.subjectCode} - ${exam.subjectName}`,
        teacherName: data.teacherName,
        generatedAt: new Date().toLocaleString('vi-VN'),
      },
      rows,
    });
  };

  const handleExportCsv = () => {
    const rows = prepareExportRows();
    exportGradeReportToCsv({
      fileName: `BangDiem_${exam.subjectCode}_${exam.title}`,
      rows,
    });
  };

  const getItemBadge = (item: QuestionItemAnalysis) => {
    switch (item.badgeVariant) {
      case 'emerald':
        return (
          <Badge className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
            {item.overallEvaluation}
          </Badge>
        );
      case 'blue':
        return (
          <Badge className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-[11px] font-semibold">
            {item.overallEvaluation}
          </Badge>
        );
      case 'amber':
        return (
          <Badge className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
            {item.overallEvaluation}
          </Badge>
        );
      case 'rose':
        return (
          <Badge className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-[11px] font-semibold">
            {item.overallEvaluation}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]">
            {item.overallEvaluation}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 4 Quick Metric Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Bài thi đã nộp
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics.totalGraded}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">lượt làm bài</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Điểm trung bình (Mean)
              </p>
              <p className="mt-1 text-2xl font-bold text-[#154C99] dark:text-[#60A5FA] tabular-nums">
                {metrics.averageScore.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Trung vị: <strong className="text-slate-700 dark:text-slate-300">{metrics.medianScore.toFixed(2)}</strong>
              </p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
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
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{metrics.passRate}%</p>
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
                Điểm cao nhất (Max)
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
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

      {/* ── Tabs Navigation & Action Toolbar ── */}
      <Tabs defaultValue="chart" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-slate-200/80 dark:bg-[#111C2D] p-1.5 rounded-full border border-slate-300/80 dark:border-slate-800">
            <TabsTrigger
              value="chart"
              className="gap-1.5 text-xs rounded-full data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/30 transition-all"
            >
              <BarChart3 className="size-3.5" />
              <span>Phổ điểm Histogram</span>
            </TabsTrigger>
            <TabsTrigger
              value="item-analysis"
              className="gap-1.5 text-xs rounded-full data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/30 transition-all"
            >
              <Sparkles className="size-3.5" />
              <span>Phân tích Câu hỏi (Item Analysis)</span>
              {itemAnalysis.length > 0 && (
                <span className="ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono bg-white/20">
                  {itemAnalysis.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="gap-1.5 text-xs rounded-full data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/30 transition-all"
            >
              <TableIcon className="size-3.5" />
              <span>Bảng điểm Thí sinh ({studentResults.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
          </div>
        </div>

        {/* ── TAB 1: PHỔ ĐIỂM (RECHARTS HISTOGRAM) ── */}
        <TabsContent value="chart" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="size-5 text-[#154C99] dark:text-[#3B82F6]" />
                    Biểu đồ Phân phối Phổ điểm (Score Distribution Histogram)
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Phân bố điểm thi theo 5 phân vị chuẩn kèm đường điểm trung bình (Mean) và trung vị (Median).
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
                averageScore={metrics.averageScore}
                medianScore={metrics.medianScore}
                highestScore={metrics.highestScore}
                passRate={metrics.passRate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: PHÂN TÍCH CHẤT LƯỢNG CÂU HỎI (ITEM ANALYSIS) ── */}
        <TabsContent value="item-analysis" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="size-5 text-indigo-600 dark:text-indigo-400" />
                    Phân tích Chất lượng Đề thi (Learning Analytics & Item Analysis)
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Đo lường Chỉ số Độ khó (P) và Độ phân biệt (D) dựa trên nhóm 27% điểm cao và 27% điểm thấp theo chuẩn Khảo thí học.
                  </CardDescription>
                </div>

                {/* Question Filter Pills */}
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('all')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      itemTypeFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tất cả ({itemAnalysis.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('multiple_choice')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      itemTypeFilter === 'multiple_choice'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Trắc nghiệm ({exam.mcCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('essay')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      itemTypeFilter === 'essay'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tự luận ({exam.essayCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('review')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      itemTypeFilter === 'review'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 shadow-2xs font-semibold'
                        : 'text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-white'
                    }`}
                  >
                    Cần xem lại
                  </button>
                </div>
              </div>
            </CardHeader>

            {/* Educational Measurement Legend Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/80 dark:bg-[#0B1526] border-b border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">P</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Độ khó (Difficulty Index - P):</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    <span className="font-mono text-emerald-600 font-semibold">0.30 ≤ P ≤ 0.80</span>: Câu chuẩn phù hợp ·{' '}
                    <span className="font-mono text-blue-600 font-semibold">P &gt; 0.80</span>: Câu quá dễ ·{' '}
                    <span className="font-mono text-amber-600 font-semibold">P &lt; 0.30</span>: Câu khó.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">D</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Độ phân biệt (Discrimination Index - D):</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    <span className="font-mono text-emerald-600 font-semibold">D ≥ 0.30</span>: Phân hóa tốt (nhóm điểm cao làm tốt hơn rõ rệt) ·{' '}
                    <span className="font-mono text-rose-600 font-semibold">D &lt; 0.20</span>: Phân hóa kém / Cần rà soát lại câu hỏi.
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {filteredItemAnalysis.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Không có câu hỏi nào thuộc bộ lọc này</p>
                  <p className="mt-1 text-slate-400 dark:text-slate-500">
                    Bấm &quot;Tất cả&quot; để xem phân tích toàn bộ câu hỏi trong đề thi.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                        <TableHead className="w-12 pl-5 font-semibold text-slate-700 dark:text-slate-300">Câu</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 min-w-56">Nội dung câu hỏi</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Loại</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Điểm</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Lượt làm</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">% Làm đúng</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Độ khó (P)</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Độ phân biệt (D)</TableHead>
                        <TableHead className="pr-5 font-semibold text-slate-700 dark:text-slate-300 text-right">Đánh giá chất lượng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItemAnalysis.map((item) => (
                        <TableRow
                          key={item.questionId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 transition"
                        >
                          <TableCell className="pl-5 font-mono font-bold text-slate-900 dark:text-white">
                            #{item.position}
                          </TableCell>
                          <TableCell>
                            <p className="line-clamp-2 text-slate-800 dark:text-slate-200 leading-snug">
                              {item.questionText}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.questionType === 'multiple_choice' ? (
                              <span className="rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                                Trắc nghiệm
                              </span>
                            ) : (
                              <span className="rounded-md bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                                Tự luận
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.maxPoints} đ
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-600 dark:text-slate-400">
                            {item.totalResponses}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.correctPercentage}%
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.difficultyIndex.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                              {item.difficultyLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono font-bold ${
                              item.discriminationIndex >= 0.3
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : item.discriminationIndex < 0.2
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {item.discriminationIndex > 0 ? `+${item.discriminationIndex.toFixed(2)}` : item.discriminationIndex.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                              {item.discriminationLabel}
                            </span>
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            {getItemBadge(item)}
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

        {/* ── TAB 3: BẢNG ĐIỂM CHI TIẾT & BỘ LỌC ── */}
        <TabsContent value="table" className="space-y-6 outline-none">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="size-5 text-[#154C99] dark:text-[#3B82F6]" />
                    Bảng điểm Chi tiết Lớp học
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Theo dõi điểm số trắc nghiệm, tự luận, lớp học, vi phạm quy chế và trạng thái chấm của từng sinh viên.
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
                      placeholder="Tìm tên, MSSV, lớp, email..."
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
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Thí sinh & MSSV</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Lớp</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Lượt thi</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Điểm TN</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Điểm TL</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Tổng điểm</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Vi phạm</TableHead>
                        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Trạng thái chấm</TableHead>
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
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {item.studentCode && <span>MSSV: {item.studentCode}</span>}
                              <span>{item.studentEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {item.className}
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
                            {item.violationCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                                <ShieldAlert className="size-3" />
                                {item.violationCount}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.gradingStatus === 'Đã công bố điểm' ? (
                              <Badge className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                                Đã công bố
                              </Badge>
                            ) : item.gradingStatus === 'Chờ chấm tự luận' ? (
                              <Badge className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                                Chờ chấm TL
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] text-slate-600 dark:text-slate-400">
                                {item.gradingStatus}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Link
                              href={`/teacher/grading/${item.attemptId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#154C99] dark:hover:text-[#60A5FA]"
                            >
                              <span>Chấm / Xem bài</span>
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
