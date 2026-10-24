import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  HelpCircle,
  LibraryBig,
  PlusCircle,
  Users,
  FileText,
  Sparkles,
} from 'lucide-react';
import { getTeacherSubjectsData } from '@/lib/teacher-subjects';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Môn học phụ trách | Mầm Học',
  description: 'Danh sách môn học được phân công và quản lý học liệu cho giảng viên',
};

export default async function TeacherSubjectsPage() {
  const data = await getTeacherSubjectsData();

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TeacherSidebar activeRoute="subjects" teacherName={data.teacherName} />

      <div className="min-w-0">
        {/* Sticky Topbar đồng bộ khu vực Giảng viên */}
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <span className="text-sm font-semibold">Mầm Học</span>
              </div>
              <Link
                href="/teacher/dashboard"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5' })}
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Tổng quan</span>
              </Link>
            </div>

            <p className="hidden text-xs font-medium capitalize text-muted-foreground sm:block">
              {today}
            </p>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={data.teacherId} />
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                {data.totalAssignedSubjects} môn phụ trách
              </Badge>
            </div>
          </div>
        </header>

        {/* Khung nội dung chính */}
        <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10">
          {/* Section Header */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#e5f0e9] text-[#246348]">
                  <BookOpen className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Môn học của bạn
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Các môn học bạn được phân công quản lý học liệu, ngân hàng câu hỏi và tổ chức kỳ thi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/teacher/questions"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2 shadow-xs' })}
              >
                <HelpCircle className="size-4" />
                <span>Ngân hàng câu hỏi</span>
              </Link>
              <Link
                href="/teacher/dashboard#create-class"
                className={buttonVariants({
                  size: 'sm',
                  className: 'gap-2 bg-[#17372e] text-white shadow-xs hover:bg-[#20493e]',
                })}
              >
                <PlusCircle className="size-4" />
                <span>Tạo lớp học mới</span>
              </Link>
            </div>
          </section>

          {/* Alert nếu có lỗi lookup */}
          {data.errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs"
            >
              Không thể tải toàn bộ thông tin môn học: {data.errorMessage}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Môn phụ trách
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">{data.totalAssignedSubjects}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Users className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lớp đang mở
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">{data.totalClassesCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <LibraryBig className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Câu hỏi trong kho
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">{data.totalQuestionsCount}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Danh sách thẻ môn học */}
          {data.subjects.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen className="size-7" />
              </div>
              <CardTitle className="mt-4 text-lg font-semibold text-slate-800">
                Chưa có môn học được phân công
              </CardTitle>
              <CardDescription className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Quản trị viên cần phân công môn học trước khi môn hiển thị tại đây. Thầy/cô có thể liên hệ
                quản trị viên hệ thống để kiểm tra danh mục phân môn.
              </CardDescription>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/teacher/dashboard"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                >
                  <ArrowLeft className="size-4" /> Quay lại Dashboard
                </Link>
                <Link
                  href="/chat"
                  className={buttonVariants({ size: 'sm', className: 'gap-1.5 bg-[#17372e] text-white hover:bg-[#20493e]' })}
                >
                  <Sparkles className="size-4" /> Hỏi gia sư AI
                </Link>
              </div>
            </Card>
          ) : (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="flex flex-col justify-between rounded-2xl border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-[#17372e] px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-white">
                        {subject.code}
                      </Badge>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-800">
                        Đang giảng dạy
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-lg font-bold text-slate-900">
                      {subject.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs leading-relaxed text-slate-500">
                      {subject.description || 'Chưa có mô tả chi tiết cho môn học này.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Lớp học</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">{subject.classesCount}</p>
                      </div>
                      <div className="border-x border-slate-200">
                        <p className="text-[11px] font-medium text-slate-500">Câu hỏi</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">{subject.questionsCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Đề thi</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">{subject.examsCount}</p>
                      </div>
                    </div>

                    {subject.classes.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Các lớp đang mở
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.classes.slice(0, 4).map((c) => (
                            <Link
                              key={c.id}
                              href={`/teacher/classes/${c.id}`}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              {c.name}
                            </Link>
                          ))}
                          {subject.classes.length > 4 && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                              +{subject.classes.length - 4} lớp khác
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                    <Link
                      href={`/teacher/questions?subject=${subject.id}`}
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                        className: 'w-full justify-between border-slate-200 text-xs font-medium hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800',
                      })}
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-emerald-700" />
                        Kho câu hỏi môn học
                      </span>
                      <ArrowRight className="size-3.5" />
                    </Link>

                    <Link
                      href={`/teacher/dashboard#create-class`}
                      className={buttonVariants({
                        variant: 'ghost',
                        size: 'sm',
                        className: 'w-full justify-between text-xs text-slate-600 hover:text-slate-900',
                      })}
                    >
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="size-3.5 text-slate-500" />
                        Mở thêm lớp mới
                      </span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

