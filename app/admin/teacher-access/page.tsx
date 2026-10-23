import { redirect } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MailPlus,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import {
  AcademicAccess,
  type AcademicAssignment,
  type AcademicClass,
  type AcademicSubject,
  type AcademicTeacher,
} from './academic-access';
import { ApplicationActions } from './application-actions';
import { InvitationForm } from './invitation-form';

type SearchParams = Promise<{ error?: string; success?: string }>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function TeacherAccessAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // Kiểm tra quyền nghiêm ngặt role = 'admin'
  const isMetadataAdmin = user.app_metadata?.role === 'admin';
  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isDbAdmin = !roleError && roleRecord?.role === 'admin';
  if (!isMetadataAdmin && !isDbAdmin) redirect('/subjects');

  const [
    applicationsResult,
    invitationsResult,
    teachersResult,
    subjectsResult,
    assignmentsResult,
    classesResult,
    params,
  ] = await Promise.all([
    supabase
      .from('teacher_applications')
      .select('user_id, email, status, requested_at, reviewed_at, review_note')
      .order('requested_at', { ascending: false }),
    supabase
      .from('invitation_tokens')
      .select('id, email, created_at, expires_at, used_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
    supabase.from('subjects').select('id, code, name, archived_at').order('name'),
    supabase
      .from('teacher_subject_assignments')
      .select('teacher_id, subject_id')
      .order('assigned_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, name, class_code, academic_year, subject_id, teacher_id')
      .is('archived_at', null)
      .order('name'),
    searchParams,
  ]);

  const teacherIds = (teachersResult.data ?? []).map((row) => row.user_id);
  const applicationRows = applicationsResult.data ?? [];
  const pendingApplications = applicationRows.filter((app) => app.status === 'pending');

  // Lấy danh sách profile cho cả giáo viên và người nộp hồ sơ
  const allUserIds = Array.from(new Set([...teacherIds, ...applicationRows.map((a) => a.user_id)]));
  const profilesResult = allUserIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
    : { data: [], error: null };

  const profileNames = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]),
  );

  const allSubjects = (subjectsResult.data ?? []) as (AcademicSubject & {
    archived_at: string | null;
  })[];
  const academicSubjects = allSubjects.filter((subject) => !subject.archived_at);

  const academicTeachers: AcademicTeacher[] = teacherIds.map((id) => ({
    id,
    name: profileNames.get(id) || 'Giảng viên',
  }));

  const academicAssignments: AcademicAssignment[] = (assignmentsResult.data ?? []).flatMap(
    (assignment) => {
      const teacher = academicTeachers.find((item) => item.id === assignment.teacher_id);
      const subject = allSubjects.find((item) => item.id === assignment.subject_id);
      return teacher && subject
        ? [
            {
              teacherId: teacher.id,
              teacherName: teacher.name,
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code,
            },
          ]
        : [];
    },
  );

  const academicClasses: AcademicClass[] = (classesResult.data ?? []).flatMap((classItem) => {
    const subject = allSubjects.find((item) => item.id === classItem.subject_id);
    const currentTeacher = academicTeachers.find((item) => item.id === classItem.teacher_id);
    if (!subject || !currentTeacher) return [];
    const eligibleTeachers = [
      ...new Set(
        (assignmentsResult.data ?? [])
          .filter((assignment) => assignment.subject_id === classItem.subject_id)
          .map((assignment) => assignment.teacher_id),
      ),
    ].flatMap((teacherId) => {
      const teacher = academicTeachers.find((item) => item.id === teacherId);
      return teacher ? [teacher] : [];
    });
    return [
      {
        id: classItem.id,
        name: classItem.name,
        classCode: classItem.class_code,
        academicYear: classItem.academic_year,
        subjectName: subject.name,
        subjectCode: subject.code,
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name,
        eligibleTeachers,
      },
    ];
  });

  const queryError =
    applicationsResult.error ||
    invitationsResult.error ||
    teachersResult.error ||
    subjectsResult.error ||
    assignmentsResult.error ||
    classesResult.error ||
    profilesResult.error;

  const invitationRows = invitationsResult.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
      {/* Page Title & Metrics */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#648174]">
              Cổng Quản Trị Viên
            </span>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]">
              Admin Active
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Quản trị Quyền Giáo viên & Phân môn
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Duyệt hồ sơ xin cấp quyền giảng viên, tạo mã mời và phân công chuyên môn đào tạo.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 bg-white border-amber-200 text-amber-900 px-3 py-1 text-xs">
            <Clock3 aria-hidden="true" className="size-3.5 text-amber-600" />
            <strong>{pendingApplications.length}</strong> đơn chờ duyệt
          </Badge>
          <Badge variant="outline" className="gap-1.5 bg-white border-slate-200 px-3 py-1 text-xs">
            <GraduationCap aria-hidden="true" className="size-3.5 text-[#17372e]" />
            <strong>{academicTeachers.length}</strong> giáo viên
          </Badge>
          <Badge variant="outline" className="gap-1.5 bg-white border-slate-200 px-3 py-1 text-xs">
            <BookOpen aria-hidden="true" className="size-3.5 text-blue-600" />
            <strong>{academicSubjects.length}</strong> môn học
          </Badge>
        </div>
      </section>

      {/* Status Messages */}
      {queryError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive flex items-center gap-2"
        >
          <ShieldAlert className="size-4 shrink-0" />
          <span>Không thể tải toàn bộ dữ liệu. Vui lòng kiểm tra RLS hoặc migration database.</span>
        </div>
      )}

      {params.success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 flex items-center gap-2"
        >
          <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
          <span>
            {{
              approved: 'Đã phê duyệt tài khoản giáo viên thành công.',
              rejected: 'Đã từ chối đơn đăng ký giáo viên.',
              'subject-created': 'Đã tạo môn học mới thành công.',
              'assignment-saved': 'Đã lưu phân công môn học.',
              'assignment-removed': 'Đã gỡ phân công môn học.',
              'class-assigned': 'Đã cập nhật giảng viên phụ trách lớp.',
            }[params.success] ?? 'Thao tác đã hoàn tất thành công.'}
          </span>
        </div>
      )}

      {params.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900 flex items-center gap-2"
        >
          <ShieldAlert className="size-4 text-rose-700 shrink-0" />
          <span>
            {{
              unauthorized: 'Phiên đăng nhập không có quyền admin.',
              invalid: 'Yêu cầu không hợp lệ.',
              'subject-invalid': 'Thông tin môn học chưa hợp lệ.',
              'subject-duplicate': 'Mã môn học này đã tồn tại trong hệ thống.',
              'subject-create': 'Không thể tạo môn học.',
              'assignment-invalid': 'Thông tin phân công không hợp lệ.',
              'assignment-save': 'Không thể lưu phân công môn học.',
              'assignment-remove': 'Không thể gỡ phân công môn học.',
              'class-assignment-invalid': 'Thông tin lớp hoặc giảng viên không hợp lệ.',
              'class-assignment-subject': 'Giảng viên cần được phân công môn trước khi nhận lớp.',
              'class-assignment-failed': 'Không thể đổi giảng viên phụ trách lớp.',
            }[params.error] ?? 'Đã xảy ra lỗi khi xử lý yêu cầu.'}
          </span>
        </div>
      )}

      {/* SHADCN TABS INTERFACE (2 TABS) */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl w-fit">
          <TabsTrigger value="applications" className="gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
            <Users className="size-3.5" />
            Duyệt hồ sơ
            {pendingApplications.length > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingApplications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
            <BookOpen className="size-3.5" />
            Phân công môn học
            <span className="grid size-5 place-items-center rounded-full bg-slate-300 text-slate-800 text-[10px] font-bold">
              {academicTeachers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DUYỆT HỒ SƠ */}
        <TabsContent value="applications" className="space-y-6 outline-none">
          {/* Data Table: Teacher Applications */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white pb-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Danh sách Hồ sơ xin cấp quyền Giáo viên
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Quản lý các tài khoản đã đăng ký xin quyền giáo viên hoặc đăng ký không có mã mời.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-slate-100">
                {applicationRows.length} hồ sơ
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {applicationRows.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <Clock3 aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-800">Chưa có đơn đăng ký</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Khi người dùng đăng ký tài khoản giáo viên, hồ sơ sẽ hiển thị tại đây để bạn phê duyệt.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="pl-5 font-semibold text-slate-700">Ứng viên</TableHead>
                        <TableHead className="font-semibold text-slate-700">Ngày gửi đơn</TableHead>
                        <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                        <TableHead className="pr-5 text-right font-semibold text-slate-700">
                          Hành động
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {applicationRows.map((app) => {
                        const fullName = profileNames.get(app.user_id) || 'Chưa cập nhật tên';
                        return (
                          <TableRow key={app.user_id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-5">
                              <p className="font-semibold text-slate-900">{fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{app.email}</p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-slate-600">
                              {formatDate(app.requested_at)}
                            </TableCell>
                            <TableCell>
                              {app.status === 'pending' && (
                                <Badge className="border-amber-200 bg-amber-50 text-amber-800 font-semibold text-[11px]">
                                  Chờ duyệt
                                </Badge>
                              )}
                              {app.status === 'approved' && (
                                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                                  Đã duyệt
                                </Badge>
                              )}
                              {app.status === 'rejected' && (
                                <Badge className="border-rose-200 bg-rose-50 text-rose-800 font-semibold text-[11px]">
                                  Đã từ chối
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                              {app.status === 'pending' ? (
                                <ApplicationActions userId={app.user_id} applicantEmail={app.email} />
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  {app.reviewed_at ? formatDate(app.reviewed_at) : '—'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitation Section: Tạo token mời & Danh sách mã mời */}
          <div className="grid gap-6 lg:grid-cols-2">
            <InvitationForm />

            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white pb-3.5">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Mã mời gần đây
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Chỉ hiển thị metadata; token bí mật chỉ sinh ra một lần.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-50">
                  {invitationRows.length} mã
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {invitationRows.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">Chưa tạo mã mời nào.</p>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                          <TableHead className="pl-5 font-semibold text-slate-700">Email nhận</TableHead>
                          <TableHead className="font-semibold text-slate-700">Ngày tạo</TableHead>
                          <TableHead className="pr-5 text-right font-semibold text-slate-700">
                            Trạng thái
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitationRows.map((invitation) => (
                          <TableRow key={invitation.id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-5 font-medium text-slate-800">
                              {invitation.email}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-slate-500">
                              {formatDate(invitation.created_at)}
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                              <Badge
                                variant={invitation.used_at ? 'secondary' : 'default'}
                                className={
                                  invitation.used_at
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }
                              >
                                {invitation.used_at ? 'Đã dùng' : 'Khả dụng'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Security Note */}
          <Card className="border-[#dce7dc] bg-[#edf5ee] shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-xs leading-5 text-[#385c49]">
              <MailPlus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#17372e]" />
              <p>
                <strong>Bảo mật:</strong> Khi bạn phê duyệt hồ sơ hoặc tạo mã mời, quyền hạn được cập nhật trực tiếp vào hệ thống Supabase Auth Service Role và đồng bộ tới bảng phân quyền.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PHÂN CÔNG MÔN HỌC */}
        <TabsContent value="subjects" className="space-y-6 outline-none">
          <AcademicAccess
            subjects={academicSubjects}
            teachers={academicTeachers}
            assignments={academicAssignments}
            classes={academicClasses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
