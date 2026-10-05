import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock3, MailPlus, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/subjects/actions';
import { AcademicAccess, type AcademicAssignment, type AcademicClass, type AcademicSubject, type AcademicTeacher } from './academic-access';
import { ApplicationActions } from './application-actions';
import { InvitationForm } from './invitation-form';

type SearchParams = Promise<{ error?: string; success?: string }>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function TeacherAccessAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError || roleRecord?.role !== 'admin') redirect('/subjects');

  const [applicationsResult, invitationsResult, teachersResult, subjectsResult, assignmentsResult, classesResult, params] = await Promise.all([
    supabase
      .from('teacher_applications')
      .select('user_id, email, status, requested_at')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true }),
    supabase
      .from('invitation_tokens')
      .select('id, email, created_at, expires_at, used_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
    supabase.from('subjects').select('id, code, name, archived_at').order('name'),
    supabase.from('teacher_subject_assignments').select('teacher_id, subject_id').order('assigned_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, name, class_code, academic_year, subject_id, teacher_id')
      .is('archived_at', null)
      .order('name'),
    searchParams,
  ]);

  const teacherIds = (teachersResult.data ?? []).map((row) => row.user_id);
  const profilesResult = teacherIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', teacherIds)
    : { data: [], error: null };
  const profileNames = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const allSubjects = (subjectsResult.data ?? []) as (AcademicSubject & { archived_at: string | null })[];
  const academicSubjects = allSubjects.filter((subject) => !subject.archived_at);
  const academicTeachers: AcademicTeacher[] = teacherIds.map((id) => ({
    id,
    name: profileNames.get(id) ?? 'Giảng viên',
  }));
  const academicAssignments: AcademicAssignment[] = (assignmentsResult.data ?? []).flatMap((assignment) => {
    const teacher = academicTeachers.find((item) => item.id === assignment.teacher_id);
    const subject = allSubjects.find((item) => item.id === assignment.subject_id);
    return teacher && subject ? [{
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
    }] : [];
  });
  const academicClasses: AcademicClass[] = (classesResult.data ?? []).flatMap((classItem) => {
    const subject = allSubjects.find((item) => item.id === classItem.subject_id);
    const currentTeacher = academicTeachers.find((item) => item.id === classItem.teacher_id);
    if (!subject || !currentTeacher) return [];
    const eligibleTeachers = [...new Set(
      (assignmentsResult.data ?? [])
        .filter((assignment) => assignment.subject_id === classItem.subject_id)
        .map((assignment) => assignment.teacher_id),
    )].flatMap((teacherId) => {
      const teacher = academicTeachers.find((item) => item.id === teacherId);
      return teacher ? [teacher] : [];
    });
    return [{
      id: classItem.id,
      name: classItem.name,
      classCode: classItem.class_code,
      academicYear: classItem.academic_year,
      subjectName: subject.name,
      subjectCode: subject.code,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.name,
      eligibleTeachers,
    }];
  });
  const queryError = applicationsResult.error
    || invitationsResult.error
    || teachersResult.error
    || subjectsResult.error
    || assignmentsResult.error
    || classesResult.error
    || profilesResult.error;
  const applicationRows = applicationsResult.data ?? [];
  const invitationRows = invitationsResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground">
      <header className="border-b border-[#dfe7e0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#17372e] text-[#c9ed99]">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174]">Quản trị</p>
              <h1 className="text-lg font-semibold">Quyền giảng viên</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/subjects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <ArrowLeft data-icon="inline-start" /> Môn học
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">Đăng xuất</Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Mời giảng viên bằng token một lần hoặc duyệt đơn tự đăng ký.</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Truy cập giảng viên</h2>
          </div>
          <Badge variant="outline" className="gap-1.5 bg-white">
            <Users aria-hidden="true" className="size-3.5" /> {applicationRows.length} đơn chờ duyệt
          </Badge>
        </section>

        {queryError && (
          <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Không tải được dữ liệu. Kiểm tra đã chạy migration teacher invitation/approval và RLS chưa.
          </div>
        )}
        {params.success && (
          <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {{
              approved: 'Đã phê duyệt giảng viên.',
              rejected: 'Đã từ chối đơn đăng ký.',
              'subject-created': 'Đã tạo môn học.',
              'assignment-saved': 'Đã lưu phân công môn học.',
              'assignment-removed': 'Đã gỡ phân công môn học.',
              'class-assigned': 'Đã cập nhật giảng viên phụ trách lớp.',
            }[params.success] ?? 'Thao tác đã hoàn tất.'}
          </div>
        )}
        {params.error && (
          <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {{
              unauthorized: 'Phiên đăng nhập không còn quyền admin.',
              invalid: 'Yêu cầu duyệt không hợp lệ.',
              'subject-invalid': 'Thông tin môn học chưa hợp lệ.',
              'subject-duplicate': 'Mã môn này đã tồn tại.',
              'subject-create': 'Không thể tạo môn học.',
              'assignment-invalid': 'Thông tin phân công không hợp lệ.',
              'assignment-save': 'Không thể lưu phân công. Hãy kiểm tra role giảng viên và migration.',
              'assignment-remove': 'Không thể gỡ phân công môn học.',
              'class-assignment-invalid': 'Thông tin lớp hoặc giảng viên không hợp lệ.',
              'class-assignment-subject': 'Giảng viên cần được phân công đúng môn trước khi nhận lớp.',
              'class-assignment-failed': 'Không thể đổi giảng viên phụ trách lớp.',
            }[params.error] ?? 'Không thể xử lý yêu cầu. Hồ sơ có thể đã được duyệt ở nơi khác.'}
          </div>
        )}

        <InvitationForm />

        {queryError ? (
          <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Chưa tải được dữ liệu phân công. Hãy chạy migration `20261005_teacher_subject_assignments.sql` trên Supabase.
          </div>
        ) : (
          <AcademicAccess
            subjects={academicSubjects}
            teachers={academicTeachers}
            assignments={academicAssignments}
            classes={academicClasses}
          />
        )}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Yêu cầu đăng ký chờ duyệt</CardTitle>
              <CardDescription className="mt-1">Không có mã mời thì tài khoản vẫn giữ role student đến khi được duyệt.</CardDescription>
            </div>
            <Badge variant="secondary">{applicationRows.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {applicationRows.length === 0 ? (
              <div className="mx-5 mb-5 flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/25 px-5 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                  <Clock3 aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-3 text-sm font-medium">Chưa có yêu cầu mới</p>
                <p className="mt-1 text-sm text-muted-foreground">Các đơn đăng ký không có mã mời sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-5">Email</TableHead>
                      <TableHead>Ngày gửi</TableHead>
                      <TableHead className="pr-5 text-right">Quyết định</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationRows.map((application) => (
                      <TableRow key={application.user_id}>
                        <TableCell className="pl-5 font-medium">{application.email}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(application.requested_at)}</TableCell>
                        <TableCell className="pr-5 text-right"><ApplicationActions userId={application.user_id} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Mã mời gần đây</CardTitle>
              <CardDescription className="mt-1">Chỉ metadata được liệt kê; token bí mật chỉ xuất hiện một lần khi tạo.</CardDescription>
            </div>
            <Badge variant="outline">{invitationRows.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {invitationRows.length === 0 ? (
              <div className="mx-5 mb-5 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/25 px-5 text-sm text-muted-foreground">
                Chưa tạo mã mời.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-5">Email nhận</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Hết hạn</TableHead>
                      <TableHead className="pr-5 text-right">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationRows.map((invitation) => {
                      const state = invitation.used_at ? 'Đã dùng' : 'Chưa dùng';
                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="pl-5 font-medium">{invitation.email}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invitation.created_at)}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invitation.expires_at)}</TableCell>
                          <TableCell className="pr-5 text-right">
                            <Badge variant={invitation.used_at ? 'secondary' : 'default'}>{state}</Badge>
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

        <Card className="border-[#dce7dc] bg-[#edf5ee] shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-sm leading-6 text-[#385c49]">
            <MailPlus aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>Mã mời được gửi thủ công qua kênh tin cậy. Link gắn với email cụ thể, dùng một lần, hết hạn sau 24 giờ; hệ thống chỉ lưu SHA-256 hash.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
