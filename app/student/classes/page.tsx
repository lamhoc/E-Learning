import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileCheck2,
  FileText,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentDashboardData, type StudentClass } from '@/lib/student-dashboard';
import { StudentSidebar } from '@/components/student/student-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';

export const metadata = {
  title: 'Lớp học của tôi | Mầm Học',
  description: 'Danh sách các lớp học đã ghi danh của sinh viên',
};

function getRelatedName(relation: { name: string } | { name: string }[] | null | undefined): string {
  if (!relation) return '';
  if (Array.isArray(relation)) return relation[0]?.name ?? '';
  return relation.name;
}

function ClassCard({ classItem }: { classItem: StudentClass }) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <BookOpen aria-hidden="true" className="size-5" />
        </span>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50/60 font-mono text-emerald-800 text-xs">
          {classItem.class_code}
        </Badge>
      </CardHeader>
      <CardContent>
        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{classItem.name}</h3>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          {getRelatedName(classItem.subject) || 'Môn học đại cương'}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Năm học: {classItem.academic_year}
        </p>
        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
          <Link
            href="/student/materials"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs flex-1 gap-1.5' })}
          >
            <FileText className="size-3.5" />
            <span>Tài liệu</span>
          </Link>
          <Link
            href="/student/assignments"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs flex-1 gap-1.5' })}
          >
            <FileCheck2 className="size-3.5" />
            <span>Bài tập</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function StudentClassesPage() {
  const data = await getStudentDashboardData();
  const initials = data.studentName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <StudentSidebar studentName={data.studentName} activeRoute="classes" />

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-bold text-slate-900">Mầm Học</span>
            </div>

            <p className="hidden text-xs font-medium capitalize text-slate-500 sm:block">{today}</p>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.studentId} initialNotifications={data.notifications} />
              <Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex">
                <CheckCircle2 data-icon="inline-start" /> {data.classes.length} Lớp đang học
              </Badge>
              <span
                className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]"
                aria-label={`Tài khoản ${data.studentName}`}
              >
                {initials || 'SV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Không gian học tập
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Lớp học của tôi
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Danh sách các lớp học bạn đã được giảng viên ghi danh trong năm học.
              </p>
            </div>
            <Link
              href="/student/dashboard"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              <ArrowLeft className="size-4" /> Về Tổng quan
            </Link>
          </section>

          {data.classes.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.classes.map((classItem) => (
                <ClassCard key={classItem.id} classItem={classItem} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-slate-50 text-slate-400">
                <BookOpen className="size-6" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-700">Chưa ghi danh vào lớp nào</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Bạn chưa được thêm vào lớp học nào. Hãy liên hệ với giảng viên phụ trách để nhận mã lớp.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

