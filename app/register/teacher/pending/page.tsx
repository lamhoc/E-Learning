import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, Clock3, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
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
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground transition-colors">
      <Card className="w-full max-w-lg shadow-md border-border bg-card">
        <CardContent className="p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <BrandLogo href="/" size="sm" />
            <div className="flex items-center gap-2">
              <Badge variant={isRejected ? 'destructive' : 'secondary'} className="font-medium">
                {isRejected ? 'Chưa được duyệt' : 'Đang chờ duyệt'}
              </Badge>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-8 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            {isRejected ? (
              <XCircle aria-hidden="true" className="size-6 text-destructive" />
            ) : application.status === 'approved' ? (
              <BadgeCheck aria-hidden="true" className="size-6 text-emerald-500" />
            ) : (
              <Clock3 aria-hidden="true" className="size-6 text-amber-500" />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            {isRejected ? 'Yêu cầu chưa được phê duyệt' : 'Yêu cầu giảng viên đang được xem xét'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isRejected
              ? application.review_note || 'Bạn vẫn có thể sử dụng tài khoản với quyền sinh viên. Liên hệ quản trị viên LHU nếu cần hỗ trợ.'
              : 'Admin Trường Đại học Lạc Hồng sẽ kiểm tra hồ sơ và cấp quyền giảng dạy. Trang này sẽ tự động chuyển về Dashboard sau khi được duyệt.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {!isRejected && (
              <Link href="/register/teacher/pending" className={buttonVariants({ className: 'gap-2 bg-primary text-white hover:bg-primary/90' })}>
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
