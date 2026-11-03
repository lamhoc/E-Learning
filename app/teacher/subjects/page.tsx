import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  HelpCircle,
  LibraryBig,
  PlusCircle,
  Users,
  Sparkles,
} from 'lucide-react';
import { getTeacherSubjectsData } from '@/lib/teacher-subjects';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Môn học phụ trách | Đại học Lạc Hồng',
  description: 'Danh sách môn học được phân công và quản lý học liệu cho giảng viên Đại học Lạc Hồng',
};

export default async function TeacherSubjectsPage() {
  const data = await getTeacherSubjectsData();

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)] transition-colors">
      <TeacherSidebar activeRoute="subjects" teacherName={data.teacherName} />

      <div className="min-w-0">
        {/* Sticky Topbar đồng bộ khu vực Giảng viên */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 dark:bg-[#0B1628]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <BrandLogo size="sm" />
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
              <ThemeToggle />
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-xs font-medium">
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
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Môn học của bạn
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Các môn học bạn được phân công quản lý học liệu, ngân hàng câu hỏi và tổ chức kỳ thi tại LHU.
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
                  className: 'gap-2 bg-primary text-white shadow-xs hover:bg-primary/90',
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
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 shadow-xs"
            >
              Không thể tải toàn bộ thông tin môn học: {data.errorMessage}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border-border bg-card dark:bg-[#111C2D] shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Môn phụ trách
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-foreground">{data.totalAssignedSubjects}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card dark:bg-[#111C2D] shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lớp đang mở
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-foreground">{data.totalClassesCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card dark:bg-[#111C2D] shadow-xs">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <LibraryBig className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Câu hỏi trong kho
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-foreground">{data.totalQuestionsCount}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Danh sách thẻ môn học */}
          {data.subjects.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border bg-card dark:bg-[#111C2D] p-10 text-center shadow-xs">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <BookOpen className="size-7" />
              </div>
              <CardTitle className="mt-4 text-lg font-semibold text-foreground">
                Chưa có môn học được phân công
              </CardTitle>
              <CardDescription className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Quản trị viên cần phân công môn học trước khi môn hiển thị tại đây. Thầy/cô có thể liên hệ
                quản trị viên hệ thống Đại học Lạc Hồng để kiểm tra danh mục phân môn.
              </CardDescription>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/teacher/dashboard"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                >
                  <ArrowLeft className="size-4" /> Quay lại Dashboard
                </Link>
                <Link
                  href="/teacher/ai-tutor"
                  className={buttonVariants({ size: 'sm', className: 'gap-1.5 bg-primary text-white hover:bg-primary/90' })}
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
                  className="flex flex-col justify-between rounded-2xl border-border bg-card dark:bg-[#111C2D] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-primary px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-white">
                        {subject.code}
                      </Badge>
                      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-[11px] font-medium text-primary">
                        Đang giảng dạy
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-lg font-bold text-foreground">
                      {subject.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs leading-relaxed text-muted-foreground">
                      {subject.description || 'Chưa có mô tả chi tiết cho môn học này.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center border border-border/60">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Lớp học</p>
                        <p className="mt-0.5 text-base font-bold text-foreground">{subject.classesCount}</p>
                      </div>
                      <div className="border-x border-border/60">
                        <p className="text-[11px] font-medium text-muted-foreground">Câu hỏi</p>
                        <p className="mt-0.5 text-base font-bold text-foreground">{subject.questionsCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Đề thi</p>
                        <p className="mt-0.5 text-base font-bold text-foreground">{subject.examsCount}</p>
                      </div>
                    </div>

                    {subject.classes.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Các lớp đang mở
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.classes.slice(0, 4).map((c) => (
                            <Link
                              key={c.id}
                              href={`/teacher/classes/${c.id}`}
                              className="inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                            >
                              {c.name}
                            </Link>
                          ))}
                          {subject.classes.length > 4 && (
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              +{subject.classes.length - 4} lớp khác
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 border-t border-border pt-4">
                    <Link
                      href={`/teacher/questions?subject=${subject.id}`}
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                        className: 'w-full justify-between border-border text-xs font-medium hover:border-primary hover:bg-primary/5 hover:text-primary',
                      })}
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-primary" />
                        Kho câu hỏi môn học
                      </span>
                      <ArrowRight className="size-3.5" />
                    </Link>

                    <Link
                      href={`/teacher/dashboard#create-class`}
                      className={buttonVariants({
                        variant: 'ghost',
                        size: 'sm',
                        className: 'w-full justify-between text-xs text-muted-foreground hover:text-foreground',
                      })}
                    >
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="size-3.5 text-muted-foreground" />
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
