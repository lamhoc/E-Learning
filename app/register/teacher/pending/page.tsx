import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, Clock3, GraduationCap, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/subjects/actions';

export default async function TeacherApplicationStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: roleRecord }, { data: application }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('teacher_applications')
      .select('status, requested_at, reviewed_at, review_note')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (roleRecord?.role === 'teacher') redirect('/teacher/dashboard');
  if (!application) redirect('/subjects');

  const isRejected = application.status === 'rejected';
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6f3] px-4 py-12 text-foreground">
      <Card className="w-full max-w-lg">
        <CardContent className="p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315b48] hover:text-primary">
              <GraduationCap aria-hidden="true" className="size-5" /> Mầm Học
            </Link>
            <Badge variant={isRejected ? 'destructive' : 'secondary'}>
              {isRejected ? 'Chưa được duyệt' : 'Đang chờ duyệt'}
            </Badge>
          </div>

          <div className="mt-9 grid size-12 place-items-center rounded-xl bg-[#e8f1e9] text-[#37684f]">
            {isRejected ? <XCircle aria-hidden="true" className="size-6" /> : application.status === 'approved' ? <BadgeCheck aria-hidden="true" className="size-6" /> : <Clock3 aria-hidden="true" className="size-6" />}
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {isRejected ? 'Yêu cầu chưa được phê duyệt' : 'Yêu cầu giảng viên đang được xem xét'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isRejected
              ? application.review_note || 'Bạn vẫn có thể sử dụng tài khoản với quyền sinh viên. Liên hệ quản trị viên nếu cần hỗ trợ.'
              : 'Admin sẽ kiểm tra thông tin và cập nhật quyền truy cập. Trang này sẽ chuyển tới dashboard sau khi yêu cầu được duyệt.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {!isRejected && (
              <Link href="/register/teacher/pending" className={buttonVariants({ className: 'gap-2' })}>
                <Clock3 aria-hidden="true" className="size-4" /> Tải lại trạng thái
              </Link>
            )}
            <form action={signOut}>
              <Button type="submit" variant="outline">Đăng xuất</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
