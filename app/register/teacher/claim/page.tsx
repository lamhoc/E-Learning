import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/subjects/actions';
import { ClaimInvitationForm } from './claim-form';

type ClaimPageProps = {
  searchParams: Promise<{ invite?: string; email?: string }>;
};

export default async function ClaimTeacherInvitationPage({ searchParams }: ClaimPageProps) {
  const params = await searchParams;
  const token = params.invite?.trim() ?? '';
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) redirect('/login');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginParams = new URLSearchParams({ claimInvite: token, claimEmail: params.email ?? '' });
    redirect(`/login?${loginParams.toString()}`);
  }

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleRecord?.role === 'teacher') redirect('/teacher/dashboard');

  const expectedEmail = params.email?.trim().toLowerCase() ?? '';
  const accountEmail = user.email?.trim().toLowerCase() ?? '';
  const emailMatches = Boolean(accountEmail && expectedEmail && accountEmail === expectedEmail);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground transition-colors">
      <Card className="w-full max-w-md shadow-md border-border bg-card">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <BrandLogo href="/" size="sm" />
            <ThemeToggle />
          </div>
          <div className="mt-6 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">Xác nhận lời mời giảng viên</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Đang đăng nhập bằng <span className="font-semibold text-foreground">{user.email}</span>. Mã mời chỉ dùng được cho email được admin chỉ định.
          </p>
          {!emailMatches && (
            <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm leading-5 text-amber-600 dark:text-amber-400">
              Email đăng nhập không khớp email nhận lời mời. Hãy đăng xuất và đăng nhập bằng đúng tài khoản.
            </p>
          )}
          <ClaimInvitationForm token={token} emailMatches={emailMatches} />
          <form action={signOut} className="mt-3">
            <Button type="submit" variant="ghost" className="w-full">Đăng xuất / đổi tài khoản</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
