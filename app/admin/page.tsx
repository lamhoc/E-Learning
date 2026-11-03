import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Bảng điều khiển Quản trị viên | Đại học Lạc Hồng',
  description: 'Trung tâm quản trị và phân quyền hệ thống giáo dục trực tuyến Đại học Lạc Hồng.',
};

export default async function AdminHubPage() {
  const supabase = await createClient();

  // Truy vấn thống kê thời gian thực phục vụ Admin Hub
  const [
    { count: pendingApplicationsCount },
    { count: totalTeachersCount },
    { count: totalStudentsCount },
    { count: totalSubjectsCount },
  ] = await Promise.all([
    supabase
      .from('teacher_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'teacher'),
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'student'),
    supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true }),
  ]);

  const pendingCount = pendingApplicationsCount ?? 0;
  const teacherCount = totalTeachersCount ?? 0;
  const studentCount = totalStudentsCount ?? 0;
  const subjectCount = totalSubjectsCount ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* ─── Hero Header Trung Tâm ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-900/20 bg-gradient-to-br from-[#0A275C] via-[#154C99] to-[#0F3D8A] p-7 text-white shadow-xl sm:p-10">
        {/* Glow hiệu ứng nền */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-[#FACC15]/15 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-blue-400/20 blur-[70px]"
        />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="border-amber-400/30 bg-amber-400/15 text-[#FACC15] text-xs font-semibold px-2.5 py-0.5 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 mr-1 text-[#FACC15]" />
              Trung tâm Quản trị Cấp cao
            </Badge>
            <span className="text-xs text-white/50">•</span>
            <span className="text-xs text-white/80">LHU E-Learning (Powered by ASU)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Bảng điều khiển Quản trị viên
          </h1>

          <p className="text-sm leading-relaxed text-white/85 max-w-2xl sm:text-base">
            Trung tâm điều phối nhân sự, kiểm soát tài khoản và bảo đảm an ninh toàn diện cho hệ thống thi trực tuyến Trường Đại học Lạc Hồng. Chọn phân khu quản trị bên dưới để bắt đầu làm việc.
          </p>

          {/* Quick Metrics Strip */}
          <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-white/80">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-xs border border-white/10">
              <GraduationCap className="size-4 text-[#FACC15]" />
              <span><strong>{teacherCount}</strong> Giảng viên</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-xs border border-white/10">
              <Users className="size-4 text-sky-300" />
              <span><strong>{studentCount}</strong> Sinh viên</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-xs border border-white/10">
              <BookOpen className="size-4 text-amber-300" />
              <span><strong>{subjectCount}</strong> Môn học</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Grid 2 Thẻ Quản Trị Lớn Chuẩn EdTech ──────────────────────────── */}
      <section aria-label="Khu vực quản lý trung tâm" className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* THẺ 1: QUẢN LÝ GIẢNG VIÊN */}
        <Link
          href="/admin/teacher-access"
          className="group block h-full focus:outline-none"
        >
          <Card className="h-full flex flex-col justify-between overflow-hidden border-border bg-card dark:bg-[#111C2D] transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl">
            {/* Thanh màu nhận diện thương hiệu trên đầu thẻ */}
            <div className="h-2 w-full bg-gradient-to-r from-primary to-[#FACC15] transition-transform duration-300 group-hover:scale-x-105" />

            <CardHeader className="p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white shadow-xs">
                  <GraduationCap className="size-7" />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs font-semibold px-2.5 py-1">
                    Nhân sự Giảng dạy
                  </Badge>
                  {pendingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs animate-pulse">
                      <Clock3 className="size-3" />
                      {pendingCount} hồ sơ chờ duyệt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      Không có hồ sơ tồn đọng
                    </span>
                  )}
                </div>
              </div>

              <div>
                <CardTitle className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                  Quản lý Giảng viên
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Duyệt hồ sơ đăng ký giảng dạy từ giảng viên LHU, phân công quyền phụ trách môn học và phát hành mã mời tham gia hệ thống.
                </CardDescription>
              </div>

              {/* Danh sách tính năng nổi bật */}
              <ul className="space-y-2.5 pt-2 text-xs font-medium text-muted-foreground border-t border-border">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Duyệt / Từ chối đơn xin cấp quyền giảng dạy</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Gán và quản lý môn học phụ trách theo khoa</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Tạo mã mời tham gia nhanh qua email</span>
                </li>
              </ul>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 pt-0 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary group-hover:underline">
                Truy cập Cổng Giảng viên & Phân môn
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-card text-primary border border-border shadow-xs transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                <ArrowRight className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* THẺ 2: QUẢN LÝ SINH VIÊN */}
        <Link
          href="/admin/student-management"
          className="group block h-full focus:outline-none"
        >
          <Card className="h-full flex flex-col justify-between overflow-hidden border-border bg-card dark:bg-[#111C2D] transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl">
            {/* Thanh màu nhận diện thương hiệu trên đầu thẻ */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-[#154C99] transition-transform duration-300 group-hover:scale-x-105" />

            <CardHeader className="p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-blue-500/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white shadow-xs">
                  <Users className="size-7" />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="border-blue-400/20 bg-blue-500/5 text-primary text-xs font-semibold px-2.5 py-1">
                    Cơ sở dữ liệu Học viên
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    <UserCheck className="size-3 text-primary" />
                    {studentCount} tài khoản hoạt động
                  </span>
                </div>
              </div>

              <div>
                <CardTitle className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                  Quản lý Sinh viên
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tra cứu hồ sơ tài khoản sinh viên toàn trường, kiểm soát mã sinh viên và thực thi lệnh khóa / mở khóa tài khoản khi cần thiết.
                </CardDescription>
              </div>

              {/* Danh sách tính năng nổi bật */}
              <ul className="space-y-2.5 pt-2 text-xs font-medium text-muted-foreground border-t border-border">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Tìm kiếm nhanh theo Họ tên, Email hoặc MSSV</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Khóa tài khoản sinh viên vi phạm quy chế phòng thi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Mở khóa phục hồi quyền truy cập học tập tức thì</span>
                </li>
              </ul>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 pt-0 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary group-hover:underline">
                Truy cập Danh sách Sinh viên
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-card text-primary border border-border shadow-xs transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                <ArrowRight className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
