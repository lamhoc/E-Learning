import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, FileCheck2, FileText, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { RosterManager, type ClassRosterStudent } from '../roster-manager';

type ClassRosterPageProps = { params: Promise<{ classId: string }> };

export default async function ClassRosterPage({ params }: ClassRosterPageProps) {
  const { classId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = roleRecord?.role;
  if (roleError || (role !== 'admin' && role !== 'teacher')) redirect('/subjects');

  // Lấy tên giảng viên để hiển thị sidebar
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const teacherName = teacherProfile?.full_name ?? 'Giảng viên';

  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select('id, name, class_code, academic_year, subject_id, teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError || !classItem) notFound();

  const [{ data: subject }, { data: teacher }, { data: roster, error: rosterError }] = await Promise.all([
    supabase.from('subjects').select('name, code').eq('id', classItem.subject_id).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', classItem.teacher_id).maybeSingle(),
    supabase.rpc('list_class_roster', { p_class_id: classId }),
  ]);

  if (rosterError) {
    console.error('Could not load class roster:', rosterError.code, rosterError.message);
  }

  const rosterRows = (roster ?? []) as {
    student_id: string;
    full_name: string;
    student_email: string;
    student_code: string;
    enrolled_at: string;
  }[];
  const students: ClassRosterStudent[] = rosterRows.map((student) => ({
    id: student.student_id,
    fullName: student.full_name,
    email: student.student_email,
    studentCode: student.student_code,
    enrolledAt: student.enrolled_at,
  }));

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
              <span className="text-foreground font-semibold dark:text-white">{classItem.name}</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8 space-y-5">
          {/* Back link */}
          <Link
            href="/teacher/classes"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Quay lại danh sách lớp
          </Link>

          <Card className="dark:bg-[#111C2D] dark:border-slate-800">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174] dark:text-emerald-400">
                  Quản lý lớp học
                </p>
                <CardTitle className="mt-1 text-xl dark:text-white">{classItem.name}</CardTitle>
                <CardDescription className="mt-2 dark:text-slate-400">
                  {subject?.code} · {subject?.name} · {classItem.academic_year}
                  {teacher?.full_name ? ` · ${teacher.full_name}` : ''}
                </CardDescription>
              </div>
              {/* Cụm nút hành động — đồng màu dark-mode chuẩn */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/teacher/classes/${classId}/assignments`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
                >
                  <FileCheck2 className="size-3.5" />
                  <span>Bài tập về nhà</span>
                </Link>
                <Link
                  href={`/teacher/classes/${classId}/materials`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 dark:bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition shadow-sm"
                >
                  <FileText className="size-3.5" />
                  <span>Tài liệu học tập</span>
                </Link>
                <a
                  href="#danh-sach-sinh-vien"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
                >
                  <Users aria-hidden="true" className="size-3.5" />
                  <span>{students.length} sinh viên</span>
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {rosterError ? (
                <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  Không tải được danh sách (mã lỗi {rosterError.code || 'không xác định'}). Kiểm tra mã lỗi trong log server để biết migration, schema cache hay quyền truy cập.
                </div>
              ) : (
                <RosterManager classId={classId} students={students} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
