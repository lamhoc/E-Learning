import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  GraduationCap,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/server';
import { getAssignmentDetails } from '@/lib/assignments';
import { GradeSubmissionDialog } from '@/components/teacher/grade-submission-dialog';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';

type AssignmentSubmissionsPageProps = {
  params: Promise<{
    classId: string;
    assignmentId: string;
  }>;
};

function formatDateTime(isoString: string) {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function AssignmentSubmissionsPage({
  params,
}: AssignmentSubmissionsPageProps) {
  const { classId, assignmentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(classId) || !/^[0-9a-f-]{36}$/i.test(assignmentId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  if (role !== 'admin' && role !== 'teacher') redirect('/subjects');

  // Lấy tên giảng viên cho Sidebar
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const teacherName = teacherProfile?.full_name ?? 'Giảng viên';

  const assignment = await getAssignmentDetails(assignmentId);
  if (!assignment || assignment.class_id !== classId) {
    notFound();
  }

  const isOverdue = new Date() > new Date(assignment.due_date);
  const gradedCount = assignment.submissions.filter((s) => s.score !== null).length;
  const lateCount = assignment.submissions.filter((s) => s.is_late).length;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="classes" teacherName={teacherName} />

      <div className="min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            {/* Logo mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-semibold dark:text-white">Mầm Học</span>
            </div>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/teacher/classes" className="hover:text-foreground transition-colors font-medium">
                Lớp học
              </Link>
              <span>/</span>
              <Link href={`/teacher/classes/${classId}`} className="hover:text-foreground transition-colors font-medium">
                {assignment.class.name}
              </Link>
              <span>/</span>
              <Link href={`/teacher/classes/${classId}/assignments`} className="hover:text-foreground transition-colors font-medium">
                Bài tập
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold dark:text-white truncate max-w-[200px]">
                {assignment.title}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8 space-y-6">
          {/* Back link */}
          <Link
            href={`/teacher/classes/${classId}/assignments`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Trở lại danh sách bài tập
          </Link>

          {/* Assignment Info Header */}
          <Card className="dark:bg-[#111C2D] dark:border-slate-800">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs">
                    {assignment.class.name}
                  </Badge>
                  {assignment.class.subject && (
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                      {assignment.class.subject.code} - {assignment.class.subject.name}
                    </Badge>
                  )}
                  {isOverdue ? (
                    <Badge variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs">
                      Đã hết hạn nộp
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs">
                      Đang mở nộp
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-slate-400 dark:text-slate-500" />
                  <span>Hạn chót: <strong className="text-slate-700 dark:text-slate-200">{formatDateTime(assignment.due_date)}</strong></span>
                </div>
              </div>

              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  {assignment.title}
                </CardTitle>
                {assignment.description && (
                  <CardDescription className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                    {assignment.description}
                  </CardDescription>
                )}
              </div>

              {assignment.attachment_url && (
                <div className="pt-1">
                  <a
                    href={assignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                  >
                    <Download className="size-3.5" />
                    <span>Tải file đề bài: {assignment.attachment_name || 'Tài liệu đính kèm'}</span>
                  </a>
                </div>
              )}
            </CardHeader>

            {/* Quick Metrics */}
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <div className="p-3 rounded-xl bg-white dark:bg-[#162235] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Sĩ số lớp</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{assignment.total_students}</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#162235] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Đã nộp bài</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {assignment.submissions.length}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / {assignment.total_students}</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#162235] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Đã chấm điểm</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {gradedCount}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / {assignment.submissions.length}</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#162235] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Nộp muộn</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{lateCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card className="dark:bg-[#111C2D] dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Danh sách bài nộp của sinh viên ({assignment.submissions.length})
                  </CardTitle>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Thang điểm: <strong className="text-slate-700 dark:text-slate-200">{assignment.max_score} điểm</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {assignment.submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="size-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chưa có sinh viên nào nộp bài</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Khi sinh viên upload file làm bài, danh sách và file nộp sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent dark:border-slate-800">
                      <TableHead className="w-[200px] text-xs font-semibold dark:text-slate-300">Sinh viên</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-slate-300">File bài làm</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-slate-300">Thời gian nộp</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-slate-300">Điểm &amp; Nhận xét</TableHead>
                      <TableHead className="w-[110px] text-right text-xs font-semibold dark:text-slate-300">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignment.submissions.map((submission) => {
                      const isGraded = submission.score !== null;
                      const isZip = submission.file_name.toLowerCase().endsWith('.zip') || submission.file_name.toLowerCase().endsWith('.rar');

                      return (
                        <TableRow key={submission.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 dark:border-slate-800">
                          {/* Cột 1: Thông tin sinh viên */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {submission.student?.full_name || 'Sinh viên'}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {submission.student?.student_code ? `${submission.student.student_code} · ` : ''}
                                {submission.student?.email}
                              </p>
                            </div>
                          </TableCell>

                          {/* Cột 2: File bài làm */}
                          <TableCell>
                            <div className="space-y-1">
                              <a
                                href={submission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={submission.file_name}
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 font-semibold hover:underline bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200/80 dark:border-emerald-800 transition"
                              >
                                {isZip ? (
                                  <FileArchive className="size-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <FileText className="size-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[200px]">{submission.file_name}</span>
                                <Download className="size-3 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />
                              </a>
                              {submission.file_size_bytes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  Dung lượng: {formatFileSize(submission.file_size_bytes)}
                                </p>
                              )}
                              {submission.note && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-100 dark:border-slate-700 max-w-[260px] line-clamp-2 italic">
                                  &quot;{submission.note}&quot;
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Cột 3: Thời gian nộp */}
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                                {formatDateTime(submission.submitted_at)}
                              </p>
                              {submission.is_late ? (
                                <Badge variant="outline" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] gap-1 px-1.5 py-0">
                                  <AlertTriangle className="size-2.5" />
                                  Nộp muộn
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px] px-1.5 py-0">
                                  Đúng hạn
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Cột 4: Điểm & Nhận xét */}
                          <TableCell>
                            {isGraded ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="size-3 text-emerald-700 dark:text-emerald-400" />
                                  {submission.score} / {assignment.max_score} điểm
                                </span>
                                {submission.feedback && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 max-w-[240px] italic">
                                    {submission.feedback}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                                Chưa chấm
                              </Badge>
                            )}
                          </TableCell>

                          {/* Cột 5: Nút Chấm điểm */}
                          <TableCell className="text-right">
                            <GradeSubmissionDialog
                              submission={submission}
                              assignmentId={assignmentId}
                              classId={classId}
                              maxScore={assignment.max_score}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
