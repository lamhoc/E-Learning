import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getClassMaterials } from '@/lib/class-materials';
import { ClassMaterialUploadForm } from '@/components/teacher/class-material-upload-form';
import { ClassMaterialList } from '@/components/teacher/class-material-list';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

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
    <main className="min-h-screen bg-[#f3f6f3] text-foreground">
      {/* Top Header */}
      <header className="border-b border-[#dfe5dd] bg-white px-5 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/teacher/classes/${classId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition"
            >
              <ArrowLeft className="size-4" /> Quay lại Lớp học
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
              {classItem.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-[#17372e] text-[#c9ed99]">
              <GraduationCap className="size-4" />
            </span>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">Mầm Học Giảng Viên</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Class Banner */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                  {subject?.code} · {subject?.name}
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  {classItem.class_code}
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  Năm học {classItem.academic_year}
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {classItem.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Giảng viên phụ trách: <strong>{teacher?.full_name || 'Chưa cập nhật'}</strong>
              </p>
            </div>

            {/* Sub-nav tabs: Roster vs Materials */}
            <div className="flex items-center gap-2">
              <Link
                href={`/teacher/classes/${classId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Users className="size-4" />
                <span>Danh sách sinh viên</span>
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                <FileText className="size-4" />
                <span>Tài liệu học tập ({materials.length})</span>
              </button>
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
    </main>
  );
}

