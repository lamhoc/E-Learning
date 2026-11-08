import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  PlusCircle,
  Users,
} from 'lucide-react';
import { requireRole } from '@/lib/auth-cache';
import { getTeacherDashboardData } from '@/lib/teacher-dashboard';
import { sanitizeVietnameseText } from '@/lib/utils';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassForm } from '@/app/teacher/dashboard/class-form';

export const metadata = {
  title: 'Quản lý Lớp học | Cổng Giảng viên LHU',
  description: 'Danh sách và quản lý các lớp học do giảng viên phụ trách tại Đại học Lạc Hồng.',
};

export default async function TeacherClassesPage() {
  const { user, supabase } = await requireRole('teacher');
  const data = await getTeacherDashboardData();

  // Đếm số lượng sinh viên cho từng lớp
  const classIds = data.classes.map((c) => c.id);
  const studentCountMap = new Map<string, number>();

  if (classIds.length > 0) {
    const { data: memberships } = await supabase
      .from('class_memberships')
      .select('class_id')
      .in('class_id', classIds);

    if (memberships) {
      for (const m of memberships) {
        studentCountMap.set(m.class_id, (studentCountMap.get(m.class_id) || 0) + 1);
      }
    }
  }

  function getSubjectName(subject: { name: string } | { name: string }[] | null) {
    return Array.isArray(subject) ? subject[0]?.name : subject?.name;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D18]">
      <TeacherSidebar activeRoute="classes" teacherName={data.teacherName} />

      <main className="flex-1 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Quản lý Lớp học
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Danh sách lớp học phụ trách, phân quyền tài liệu, bài tập và sinh viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#create-class-section"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <PlusCircle className="size-4" />
              Tạo lớp mới
            </a>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                  LỚP ĐANG PHỤ TRÁCH
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.classes.length.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Lớp học trực thuộc bạn</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-12 place-items-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <Users className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                  TỔNG SINH VIÊN
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.enrollmentCount.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Lượt ghi danh các lớp</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-12 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Layers className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                  MÔN HỌC ĐƯỢC CẤP
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.assignedSubjects.length.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Môn học do Admin phê duyệt</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách lớp học */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Danh sách Lớp học ({data.classes.length})
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Nhấp vào từng lớp để xem danh sách học viên, chia sẻ tài liệu hoặc tạo bài tập
              </p>
            </div>
          </div>

          {data.classes.length === 0 ? (
            <Card className="mt-4 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <GraduationCap className="size-6" />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                  Chưa có lớp học nào
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-300">
                  Bạn chưa tạo lớp học nào. Hãy dùng biểu mẫu bên dưới để tạo lớp học đầu tiên.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.classes.map((cls) => {
                const count = studentCountMap.get(cls.id) || 0;
                const subjectTitle = getSubjectName(cls.subject) || 'Môn học chung';

                return (
                  <Card
                    key={cls.id}
                    className="group flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] transition-all hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px]"
                        >
                          {subjectTitle}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                        >
                          {cls.academic_year || '2026-2027'}
                        </Badge>
                      </div>

                      <CardTitle className="mt-3 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cls.name}
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Mã lớp: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{cls.class_code}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0">
                      <div className="flex items-center gap-2 border-y border-slate-100 dark:border-slate-800/80 py-3 text-xs text-slate-600 dark:text-slate-300">
                        <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          <strong className="text-slate-900 dark:text-white">{count}</strong> sinh viên ghi danh
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/teacher/classes/${cls.id}`}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                        >
                          <Users className="size-3.5" />
                          <span>DS Sinh viên</span>
                        </Link>
                        <Link
                          href={`/teacher/classes/${cls.id}/materials`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Tài liệu lớp"
                        >
                          <FileText className="size-3.5" />
                        </Link>
                        <Link
                          href={`/teacher/classes/${cls.id}/assignments`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Bài tập lớp"
                        >
                          <ClipboardList className="size-3.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Khung Tạo Lớp Học Mới */}
        <div id="create-class-section" className="mt-10 scroll-mt-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlusCircle className="size-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Tạo lớp học mới
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Lớp học mới sẽ tự động liên kết với môn học được chọn và hiển thị trong danh sách phụ trách của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassForm subjects={data.assignedSubjects} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
