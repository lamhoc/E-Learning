import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { RosterManager, type ClassRosterStudent } from '../roster-manager';

type ClassRosterPageProps = { params: Promise<{ classId: string }> };

export default async function ClassRosterPage({ params }: ClassRosterPageProps) {
  const { classId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = roleRecord?.role;
  if (roleError || (role !== 'admin' && role !== 'teacher')) redirect('/subjects');

  const { data: classItem, error: classError } = await supabase
    .from('classes')
    .select('id, name, class_code, academic_year, subject_id, teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError || !classItem) notFound();

  const [{ data: subject }, { data: teacher }, { data: roster, error: rosterError }] = await Promise.all([
    supabase.from('subjects').select('name, code').eq('id', classItem.subject_id).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', classItem.teacher_id).maybeSingle(),
    supabase.rpc('list_class_roster', { p_class_id: classId }),
  ]);

  const rosterRows = (roster ?? []) as {
    student_id: string;
    full_name: string;
    student_email: string;
    enrolled_at: string;
  }[];
  const students: ClassRosterStudent[] = rosterRows.map((student) => ({
    id: student.student_id,
    fullName: student.full_name,
    email: student.student_email,
    enrolledAt: student.enrolled_at,
  }));

  return (
    <main className="min-h-screen bg-[#f3f6f3] px-4 py-7 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href={role === 'admin' ? '/admin/teacher-access' : '/teacher/dashboard'} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft data-icon="inline-start" /> {role === 'admin' ? 'Quản trị' : 'Dashboard'}
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#355347]">
            <GraduationCap aria-hidden="true" className="size-5" /> E-Learning
          </span>
        </header>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174]">Quản lý lớp học</p>
              <CardTitle className="mt-1 text-xl">{classItem.name}</CardTitle>
              <CardDescription className="mt-2">
                {subject?.code} · {subject?.name} · {classItem.academic_year}
                {teacher?.full_name ? ` · ${teacher.full_name}` : ''}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <Users aria-hidden="true" className="size-3.5" /> {students.length} sinh viên
            </Badge>
          </CardHeader>
          <CardContent>
            {rosterError ? (
              <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Chưa tải được danh sách. Hãy chạy migration `20261018_class_student_enrollment.sql` trên Supabase.
              </div>
            ) : (
              <RosterManager classId={classId} students={students} />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}