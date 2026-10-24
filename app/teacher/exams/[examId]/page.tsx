import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileQuestion,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';
import { getTeacherExamAnalytics } from '@/lib/teacher-exam-analytics';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ExamAnalyticsClient } from '@/components/teacher/exam-analytics-client';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

type TeacherExamAnalyticsPageProps = {
  params: Promise<{
    examId: string;
  }>;
};

export async function generateMetadata({
  params,
}: TeacherExamAnalyticsPageProps): Promise<Metadata> {
  const { examId } = await params;
  return {
    title: `Thống kê & Xuất điểm thi | Mầm Học`,
    description: `Phân tích phổ điểm và xuất kết quả đề thi ${examId}`,
  };
}

function getExamStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
          Đang mở thi
        </Badge>
      );
    case 'closed':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-semibold">
          Đã đóng đề
        </Badge>
      );
    case 'archived':
      return (
        <Badge className="border-slate-200 bg-slate-100 text-slate-700 text-[11px] font-semibold">
          Lưu trữ
        </Badge>
      );
    default:
      return (
        <Badge className="border-blue-200 bg-blue-50 text-blue-800 text-[11px] font-semibold">
          Bản nháp
        </Badge>
      );
  }
}

export default async function TeacherExamAnalyticsPage({
  params,
}: TeacherExamAnalyticsPageProps) {
  const { examId } = await params;
  const data = await getTeacherExamAnalytics(examId);

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="dashboard" teacherName={data.teacherName} />

      <div className="min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/teacher/dashboard"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Quay lại Tổng quan</span>
              </Link>
            </div>
            <p className="hidden text-xs font-medium capitalize text-muted-foreground sm:block">
              {today}
            </p>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          {/* Exam Header Overview Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {data.exam.subjectCode} · {data.exam.subjectName}
                  </span>
                  {getExamStatusBadge(data.exam.status)}
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {data.exam.title}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Phân tích kết quả làm bài, phổ điểm chuông và xuất bảng điểm danh sách thí sinh.
                </p>
              </div>

              {/* Tags summary */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:justify-end">
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <Clock className="size-3.5 text-slate-400" />
                  {data.exam.durationMinutes} phút
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <FileQuestion className="size-3.5 text-slate-400" />
                  {data.exam.totalQuestions} câu hỏi ({data.exam.mcCount} TN / {data.exam.essayCount} TL)
                </span>
                {data.exam.classes.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <Users className="size-3.5 text-slate-400" />
                    {data.exam.classes.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Interactive Analytics Tabs & Export Client */}
          <ExamAnalyticsClient data={data} />
        </div>
      </div>
    </main>
  );
}

