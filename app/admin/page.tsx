import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck,
  GraduationCap,
  Layers,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Bảng điều khiển Quản trị viên | Mầm Học',
  description: 'Trung tâm quản trị và phân quyền hệ thống giáo dục trực tuyến Mầm Học.',
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
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-[#17372e] via-[#1c4438] to-[#122e26] p-7 text-white shadow-lg sm:p-10">
        {/* Glow hiệu ứng nền */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-[#c9ed99]/10 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-teal-400/10 blur-[70px]"
        />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="border-emerald-400/30 bg-emerald-400/15 text-[#c9ed99] text-xs font-semibold px-2.5 py-0.5 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 mr-1 text-[#c9ed99]" />
              Trung tâm Quản trị Cấp cao
            </Badge>
            <span className="text-xs text-white/50">•</span>
            <span className="text-xs text-white/70">Mầm Học E-Learning Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Bảng điều khiển Quản trị viên
          </h1>

          <p className="text-sm leading-relaxed text-white/80 max-w-2xl sm:text-base">
            Trung tâm điều phối nhân sự, kiểm soát tài khoản và bảo đảm an ninh toàn diện cho hệ thống thi trực tuyến. Chọn phân khu quản trị bên dưới để bắt đầu làm việc.
          </p>

          {/* Quick Metrics Strip */}
          <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-white/75">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-xs">
              <GraduationCap className="size-4 text-[#c9ed99]" />
              <span><strong>{teacherCount}</strong> Giảng viên</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-xs">
              <Users className="size-4 text-sky-300" />
              <span><strong>{studentCount}</strong> Sinh viên</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-xs">
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
          <Card className="h-full flex flex-col justify-between overflow-hidden border-slate-200/90 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-950/5">
            {/* Thanh màu nhận diện thương hiệu trên đầu thẻ */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-transform duration-300 group-hover:scale-x-105" />

            <CardHeader className="p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600 shadow-xs">
                  <GraduationCap className="size-7" />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1">
                    Nhân sự Giảng dạy
                  </Badge>
                  {pendingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs animate-pulse">
                      <Clock3 className="size-3" />
                      {pendingCount} hồ sơ chờ duyệt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Không có hồ sơ tồn đọng
                    </span>
                  )}
                </div>
              </div>

              <div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Quản lý Giảng viên
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed text-slate-600">
                  Duyệt hồ sơ đăng ký giảng dạy từ giảng viên, phân công quyền phụ trách môn học và phát hành mã mời tham gia hệ thống.
                </CardDescription>
              </div>

              {/* Danh sách tính năng nổi bật */}
              <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Duyệt / Từ chối đơn xin cấp quyền giảng dạy</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Gán và quản lý môn học phụ trách theo khoa</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Tạo mã mời tham gia nhanh qua email</span>
                </li>
              </ul>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 pt-0 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 group-hover:text-emerald-950">
                Truy cập Cổng Giảng viên & Phân môn
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-700 border border-slate-200 shadow-2xs transition-all duration-300 group-hover:translate-x-1 group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700">
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
          <Card className="h-full flex flex-col justify-between overflow-hidden border-slate-200/90 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-950/5">
            {/* Thanh màu nhận diện thương hiệu trên đầu thẻ */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-transform duration-300 group-hover:scale-x-105" />

            <CardHeader className="p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-800 ring-1 ring-blue-200 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-600 shadow-xs">
                  <Users className="size-7" />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold px-2.5 py-1">
                    Cơ sở dữ liệu Học viên
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                    <UserCheck className="size-3 text-blue-700" />
                    {studentCount} tài khoản hoạt động
                  </span>
                </div>
              </div>

              <div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                  Quản lý Sinh viên
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed text-slate-600">
                  Tra cứu hồ sơ tài khoản sinh viên toàn trường, kiểm soát mã sinh viên và thực thi lệnh khóa / mở khóa tài khoản khi cần thiết.
                </CardDescription>
              </div>

              {/* Danh sách tính năng nổi bật */}
              <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                  <span>Tìm kiếm nhanh theo Họ tên, Email hoặc MSSV</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                  <span>Khóa tài khoản sinh viên vi phạm quy chế phòng thi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                  <span>Mở khóa phục hồi quyền truy cập học tập tức thì</span>
                </li>
              </ul>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 pt-0 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 group-hover:text-blue-950">
                Truy cập Danh sách Sinh viên
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-white text-blue-700 border border-slate-200 shadow-2xs transition-all duration-300 group-hover:translate-x-1 group-hover:bg-blue-700 group-hover:text-white group-hover:border-blue-700">
                <ArrowRight className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}

