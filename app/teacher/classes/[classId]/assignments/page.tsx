import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getClassAssignments } from '@/lib/assignments';
import { CreateAssignmentDialog } from '@/components/teacher/create-assignment-dialog';

type ClassAssignmentsPageProps = {
  params: Promise<{ classId: string }>;
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

export default async function ClassAssignmentsPage({ params }: ClassAssignmentsPageProps) {
  const { classId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound();

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

  // Lấy thông tin lớp học
  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select('id, name, class_code, academic_year, subject_id, teacher_id')
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classItem) notFound();

  const [{ data: subject }, assignments] = await Promise.all([
    supabase.from('subjects').select('name, code').eq('id', classItem.subject_id).maybeSingle(),
    getClassAssignments(classId),
  ]);

  const totalSubmissions = assignments.reduce((acc, a) => acc + a.submission_count, 0);
  const totalGraded = assignments.reduce((acc, a) => acc + a.graded_count, 0);

  return (
    <main className="min-h-screen bg-[#f3f6f3] px-4 py-7 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Topbar */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/teacher/classes/${classId}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft data-icon="inline-start" /> Trở lại danh sách lớp
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#355347]">
            <GraduationCap aria-hidden="true" className="size-5" /> E-Learning · Giảng viên
          </span>
        </header>

        {/* Hero Card */}
        <Card className="border-[#d9e3dc]">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174]">
                Quản lý bài tập về nhà
              </p>
              <CardTitle className="mt-1 text-2xl font-bold text-[#17372e]">
                {classItem.name}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {subject?.code} · {subject?.name} · Niên khóa: {classItem.academic_year} · Mã lớp: {classItem.class_code}
              </CardDescription>
            </div>
            <div>
              <CreateAssignmentDialog classId={classId} classNameTitle={classItem.name} />
            </div>
          </CardHeader>

          {/* Quick Metrics */}
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#e2eae4]">
              <div className="p-3.5 rounded-xl bg-white border border-[#d9e3dc]">
                <p className="text-xs text-muted-foreground font-medium">Tổng số bài tập</p>
                <p className="text-2xl font-bold text-[#17372e] mt-0.5">{assignments.length}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#d9e3dc]">
                <p className="text-xs text-muted-foreground font-medium">Tổng lượt nộp bài</p>
                <p className="text-2xl font-bold text-[#17372e] mt-0.5">{totalSubmissions}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#d9e3dc]">
                <p className="text-xs text-muted-foreground font-medium">Đã chấm điểm</p>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                  {totalGraded} <span className="text-xs font-normal text-muted-foreground">/ {totalSubmissions} bài</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#17372e] flex items-center gap-2">
              <FileCheck2 className="size-5 text-emerald-700" />
              <span>Danh sách bài tập đã giao ({assignments.length})</span>
            </h2>
          </div>

          {assignments.length === 0 ? (
            <Card className="border-dashed border-2 border-[#d9e3dc] p-12 text-center bg-white/70">
              <div className="mx-auto size-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <FileText className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Chưa có bài tập nào được giao</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Bấm vào nút &quot;Giao bài tập mới&quot; ở trên để thiết lập hạn nộp, đính kèm đề bài và mở luồng nộp bài cho sinh viên lớp này.
              </p>
              <CreateAssignmentDialog classId={classId} classNameTitle={classItem.name} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignments.map((assignment) => {
                const isOverdue = new Date() > new Date(assignment.due_date);
                return (
                  <Card
                    key={assignment.id}
                    className="border-[#d9e3dc] hover:border-emerald-300 transition-all hover:shadow-sm bg-white"
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {isOverdue ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 text-[11px]">
                                Đã hết hạn
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px]">
                                Đang mở nộp
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <CalendarClock className="size-3.5 text-slate-400" />
                              Hạn chót: <strong className="text-slate-700">{formatDateTime(assignment.due_date)}</strong>
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">
                              Thang điểm: <strong>{assignment.max_score}</strong>
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
                            {assignment.title}
                          </h3>

                          {assignment.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-line">
                              {assignment.description}
                            </p>
                          )}

                          {/* File đính kèm đề bài */}
                          {assignment.attachment_url && (
                            <div className="pt-1">
                              <a
                                href={assignment.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                              >
                                <Download className="size-3.5" />
                                <span>Tải đề bài: {assignment.attachment_name || 'Tài liệu đính kèm'}</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Thống kê bài nộp & Nút hành động */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          <div className="text-left md:text-right">
                            <p className="text-xs text-slate-500 flex items-center gap-1 md:justify-end">
                              <Users className="size-3.5" />
                              <span>Đã nộp: <strong>{assignment.submission_count}</strong> / {assignment.total_students} sinh viên</span>
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 md:justify-end mt-0.5">
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                              <span>Đã chấm: <strong className="text-emerald-700">{assignment.graded_count}</strong> / {assignment.submission_count} bài</span>
                            </p>
                          </div>

                          <Link
                            href={`/teacher/classes/${classId}/assignments/${assignment.id}`}
                            className={buttonVariants({
                              size: 'sm',
                              className: 'bg-[#17372e] hover:bg-[#122c25] text-white font-medium text-xs shadow-2xs',
                            })}
                          >
                            <span>Xem bài nộp & Chấm điểm</span>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

