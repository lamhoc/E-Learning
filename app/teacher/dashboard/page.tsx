import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';
import { signOut } from '@/app/subjects/actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTeacherDashboardData, type TeacherExam } from '@/lib/teacher-dashboard';
import { SubmissionChart } from '@/components/teacher/submission-chart';
import { ClassForm } from './class-form';

function getExamStatus(status: TeacherExam['status']) {
  switch (status) {
    case 'published':
      return { label: 'Đã phát hành', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
    case 'closed':
      return { label: 'Đã đóng', className: 'border-slate-200 bg-slate-100 text-slate-700' };
    case 'archived':
      return { label: 'Lưu trữ', className: 'border-amber-200 bg-amber-50 text-amber-800' };
    default:
      return { label: 'Bản nháp', className: 'border-orange-200 bg-orange-50 text-orange-800' };
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getSubjectName(subject: { name: string } | { name: string }[] | null) {
  return Array.isArray(subject) ? subject[0]?.name : subject?.name;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: 'green' | 'orange' | 'blue' | 'yellow';
}) {
  const toneClasses = {
    green: 'bg-[#e1f1e8] text-[#236448]',
    orange: 'bg-[#fff0e5] text-[#a24f20]',
    blue: 'bg-[#e6eef7] text-[#3d638b]',
    yellow: 'bg-[#f9f0d9] text-[#927022]',
  };

  return (
    <Card className="group transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex min-h-[132px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      <Link href="/subjects" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
        Mở danh sách môn học <ArrowRight data-icon="inline-end" />
      </Link>
    </div>
  );
}

export default async function TeacherDashboardPage() {
  const data = await getTeacherDashboardData();
  const initials = data.teacherName
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
    <main className="min-h-screen bg-[#f3f6f3] text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col border-r border-[#d9e3dc] bg-[#17372e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/teacher/dashboard" className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-xl bg-[#c9ed99] text-[#17372e]">
            <GraduationCap aria-hidden="true" className="size-6" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide">Mầm Học</span>
            <span className="mt-0.5 block text-xs text-white/55">Không gian giảng dạy</span>
          </span>
        </Link>

        <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Khu vực giảng viên
        </div>
        <nav aria-label="Điều hướng chính" className="mt-3 space-y-1">
          <Link
            href="/teacher/dashboard"
            aria-current="page"
            className="flex items-center gap-3 rounded-lg bg-white/12 px-3 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/16"
          >
            <LayoutDashboard aria-hidden="true" className="size-4 text-[#c9ed99]" />
            Tổng quan
          </Link>
          <Link
            href="/subjects"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            Môn học
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Gia sư AI
          </Link>
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]">
              {initials || 'GV'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{data.teacherName}</span>
              <span className="block text-xs text-white/55">Giảng viên</span>
            </span>
          </div>
          <Separator className="my-4 bg-white/12" />
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="h-9 w-full justify-start gap-2 px-2 text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden="true" className="size-4" />
              Đăng xuất
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#e2e8e2] bg-[#f8faf8]/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-[#17372e] text-[#c9ed99]">
                <GraduationCap aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-semibold">Mầm Học</span>
            </div>
            <p className="hidden text-xs font-medium capitalize text-muted-foreground sm:block">{today}</p>
            <nav aria-label="Điều hướng nhanh" className="flex items-center gap-2 lg:hidden">
              <Link href="/subjects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Môn học</Link>
              <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Gia sư AI</Link>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {!data.errorMessage ? (
                <Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex">
                  <CheckCircle2 data-icon="inline-start" /> Đã đồng bộ
                </Badge>
              ) : (
                <Badge variant="destructive" className="hidden sm:inline-flex">Cần kiểm tra dữ liệu</Badge>
              )}
              <span className="grid size-9 place-items-center rounded-full bg-[#f0a879] text-xs font-bold text-[#4b2a1b]" aria-label={`Tài khoản ${data.teacherName}`}>
                {initials || 'GV'}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#648174]">Không gian giảng dạy</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
                Chào {data.teacherName.split(/\s+/).at(-1)}, hôm nay thế nào?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Theo dõi lớp học, đề thi và hoạt động nộp bài tại một nơi.</p>
            </div>
            <Link href="/subjects" className={buttonVariants({ className: 'gap-2 shadow-sm' })}>
              <BookOpen data-icon="inline-start" /> Quản lý môn học <ArrowUpRight data-icon="inline-end" />
            </Link>
          </section>

          {data.errorMessage && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Một số dữ liệu chưa tải được</p>
                <p className="mt-1 text-amber-900/80">{data.errorMessage} Kiểm tra các policy RLS trên Supabase rồi tải lại trang.</p>
              </div>
            </div>
          )}

          <section aria-label="Chỉ số giảng dạy" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Lớp đang phụ trách" value={data.classCount.toLocaleString('vi-VN')} detail="Lớp chưa lưu trữ" icon={BookOpen} tone="green" />
            <MetricCard label="Lượt ghi danh" value={data.enrollmentCount.toLocaleString('vi-VN')} detail="Trên các lớp của bạn" icon={Users} tone="orange" />
            <MetricCard label="Câu hỏi trong kho" value={data.questionCount.toLocaleString('vi-VN')} detail="Câu hỏi do bạn tạo" icon={LibraryBig} tone="blue" />
            <MetricCard label="Đề đã phát hành" value={data.publishedExamCount.toLocaleString('vi-VN')} detail="Trong các đề bạn tạo" icon={ClipboardList} tone="yellow" />
          </section>

          {data.classCount === 0 && (
            <Card className="border-[#dce7dc] bg-[#edf5ee] shadow-none">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">Bắt đầu với lớp học đầu tiên</p>
                  <p className="mt-1 text-sm text-muted-foreground">Chọn môn đã được quản trị viên phân công để tạo lớp.</p>
                </div>
                <Link href="/subjects" className={buttonVariants({ variant: 'outline', className: 'gap-2 border-[#b8cdbd] bg-white' })}>
                  Đi tới môn học <ArrowRight data-icon="inline-end" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tạo lớp học</CardTitle>
              <CardDescription>Lớp mới sẽ thuộc môn được phân công và do bạn phụ trách.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassForm subjects={data.assignedSubjects} />
            </CardContent>
          </Card>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">Hoạt động nộp bài</CardTitle>
                  <CardDescription className="mt-1">Bài thi đã nộp trong 7 ngày gần nhất</CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ee] px-2.5 py-1 text-xs font-medium text-[#32684f]">
                  <span className="size-1.5 rounded-full bg-[#4c9b70]" /> {data.submissionCount.toLocaleString('vi-VN')} tổng bài
                </span>
              </CardHeader>
              <CardContent>
                {data.submissionCount === 0 ? (
                  <div className="flex h-[250px] flex-col items-center justify-center text-center">
                    <span className="grid size-11 place-items-center rounded-full bg-[#f0f4f0] text-[#658073]">
                      <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium">Chưa có bài nộp</p>
                    <p className="mt-1 text-sm text-muted-foreground">Biểu đồ sẽ cập nhật khi sinh viên hoàn thành bài thi.</p>
                  </div>
                ) : (
                  <SubmissionChart data={data.submissionsByDay} />
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">Lớp học gần đây</CardTitle>
                  <CardDescription className="mt-1">Các lớp bạn đang phụ trách</CardDescription>
                </div>
                <Badge variant="secondary">{data.classes.length} lớp</Badge>
              </CardHeader>
              <CardContent>
                {data.classes.length === 0 ? (
                  <EmptyPanel
                    title="Chưa có lớp do bạn phụ trách"
                    description="Tạo lớp từ một môn được quản trị viên phân công để bắt đầu quản lý học tập."
                  />
                ) : (
                  <div className="space-y-1">
                    {data.classes.slice(0, 4).map((classItem) => (
                      <Link
                        href="/subjects"
                        key={classItem.id}
                        className="group flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-muted/70"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e5f0e9] text-[#35674f] transition group-hover:bg-[#d8eadf]">
                          <BookOpen aria-hidden="true" className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{classItem.name}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {getSubjectName(classItem.subject) ?? 'Môn học'} · {classItem.academic_year}
                          </span>
                        </span>
                        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </Link>
                    ))}
                    <Separator className="my-2" />
                    <Link href="/subjects" className="inline-flex items-center gap-1 px-2 py-2 text-sm font-medium text-primary hover:underline">
                      Xem môn học <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle className="text-base">Đề thi gần đây</CardTitle>
                <CardDescription className="mt-1">Các đề bạn tạo, sắp xếp theo thời gian gần nhất</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <ArrowDownRight aria-hidden="true" className="size-3.5" /> {data.pendingGradingCount.toLocaleString('vi-VN')} chờ chấm
              </Badge>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {data.exams.length === 0 ? (
                <div className="px-5 pb-5">
                  <EmptyPanel
                    title="Chưa có đề thi"
                    description="Đề thi sẽ xuất hiện sau khi bạn tạo và lưu bản nháp đầu tiên."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="min-w-[220px] pl-5">Tên đề</TableHead>
                        <TableHead>Môn học</TableHead>
                        <TableHead className="text-center">Câu hỏi</TableHead>
                        <TableHead className="text-center">Lớp</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="pr-5 text-right">Ngày tạo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.exams.map((exam) => {
                        const status = getExamStatus(exam.status);
                        return (
                          <TableRow key={exam.id} className="transition-colors hover:bg-muted/30">
                            <TableCell className="max-w-[300px] pl-5">
                              <span className="block truncate font-medium">{exam.title}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">{exam.duration_minutes} phút</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{getSubjectName(exam.subject) ?? '—'}</TableCell>
                            <TableCell className="text-center tabular-nums">{exam.exam_questions?.length ?? 0}</TableCell>
                            <TableCell className="text-center tabular-nums">{exam.exam_classes?.length ?? 0}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="pr-5 text-right text-muted-foreground">{formatDate(exam.created_at)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e8e1] py-4 text-xs text-muted-foreground">
            <span>Mầm Học · Hệ thống quản lý đào tạo</span>
            <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
              <Sparkles aria-hidden="true" className="size-3.5" /> Mở gia sư AI
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
