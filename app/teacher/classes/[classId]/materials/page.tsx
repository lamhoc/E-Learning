import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getClassMaterials } from '@/lib/class-materials';
import { ClassMaterialUploadForm } from '@/components/teacher/class-material-upload-form';
import { ClassMaterialList } from '@/components/teacher/class-material-list';
import { Badge } from '@/components/ui/badge';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';

type ClassMaterialsPageProps = {
  params: Promise<{
    classId: string;
  }>;
};

export async function generateMetadata({
  params,
}: ClassMaterialsPageProps): Promise<Metadata> {
  const { classId } = await params;
  return {
    title: `Tài liệu lớp học | Mầm Học`,
    description: `Quản lý tài liệu và bài giảng của lớp ${classId}`,
  };
}

export default async function TeacherClassMaterialsPage({ params }: ClassMaterialsPageProps) {
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

  // Lấy tên giảng viên để hiển thị sidebar
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const teacherName = teacherProfile?.full_name ?? 'Giảng viên';

  // Lấy thông tin chi tiết lớp học
  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select(`
      id, name, class_code, academic_year, subject_id, teacher_id,
      subject:subjects(name, code),
      teacher:profiles(full_name)
    `)
    .eq('id', classId)
    .maybeSingle();

  if (classError || !classItem) notFound();

  if (role === 'teacher' && classItem.teacher_id !== user.id) {
    redirect('/teacher/dashboard');
  }

  const rawSubject = classItem.subject as unknown as { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
  const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;

  const rawTeacher = classItem.teacher as unknown as { full_name?: string } | Array<{ full_name?: string }> | null;
  const teacher = Array.isArray(rawTeacher) ? rawTeacher[0] : rawTeacher;

  // Lấy danh sách tài liệu
  const materials = await getClassMaterials(classId);

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
                {classItem.name}
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold dark:text-white">Tài liệu học tập</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 space-y-6">
          {/* Back link */}
          <Link
            href={`/teacher/classes/${classId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Trở lại trang lớp học
          </Link>

          {/* Class Banner */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                    {subject?.code} · {subject?.name}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {classItem.class_code}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Năm học {classItem.academic_year}
                  </Badge>
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {classItem.name}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Giảng viên phụ trách: <strong className="dark:text-slate-200">{teacher?.full_name || 'Chưa cập nhật'}</strong>
                </p>
              </div>

              {/* Sub-nav tabs: Roster vs Materials */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/classes/${classId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#162235] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  <Users className="size-4" />
                  <span>Danh sách sinh viên</span>
                </Link>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                  <FileText className="size-4" />
                  <span>Tài liệu học tập ({materials.length})</span>
                </span>
              </div>
            </div>
          </section>

          {/* Upload Form and Materials List Grid */}
          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* Form Upload */}
            <div>
              <ClassMaterialUploadForm classId={classId} />
            </div>

            {/* List of Materials */}
            <div className="min-w-0">
              <ClassMaterialList classId={classId} materials={materials} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
