'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerStudent, registerTeacher, type RegistrationState } from './actions';

type RegistrationFormProps = {
  role: 'student' | 'teacher';
  invitationToken?: string;
  invitationEmail?: string;
};

const initialState: RegistrationState = { status: 'idle', message: '' };

export function RegistrationForm({ role, invitationToken = '', invitationEmail = '' }: RegistrationFormProps) {
  const router = useRouter();
  const action = role === 'student' ? registerStudent : registerTeacher;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isTeacher = role === 'teacher';
  const hasInvitation = isTeacher && Boolean(invitationToken);

  useEffect(() => {
    if (state.status === 'success' && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-5">
      {hasInvitation && <input type="hidden" name="invitationToken" value={invitationToken} />}
      {isTeacher && !hasInvitation && <input type="hidden" name="invitationToken" value="" />}

      <div className="space-y-2">
        <Label htmlFor="fullName">Họ và tên</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
          placeholder="Nguyễn Minh An"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly={Boolean(invitationEmail)}
          defaultValue={invitationEmail}
          placeholder="ten@truong.edu.vn"
          className={invitationEmail ? 'bg-muted' : undefined}
        />
        {invitationEmail && (
          <p className="text-xs text-muted-foreground">Email này được khóa theo mã mời của quản trị viên.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          placeholder="Ít nhất 12 ký tự"
        />
        <p className="text-xs text-muted-foreground">Tối thiểu 12 ký tự. Mật khẩu được gửi trực tiếp tới Supabase Auth.</p>
      </div>

      {state.status === 'error' && (
        <div role="alert" className="space-y-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <p>{state.message}</p>
          {state.claimHref && (
            <Link href={state.claimHref} className="inline-flex font-semibold underline underline-offset-4">
              Đã có tài khoản? Đăng nhập để nhận mã mời
            </Link>
          )}
        </div>
      )}
      {state.status === 'success' && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full gap-2">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
        {pending ? 'Đang tạo tài khoản...' : isTeacher ? 'Gửi đăng ký giảng viên' : 'Tạo tài khoản sinh viên'}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link
          href={hasInvitation
            ? `/login?claimInvite=${encodeURIComponent(invitationToken)}&claimEmail=${encodeURIComponent(invitationEmail)}`
            : '/login'}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {hasInvitation ? 'Đã có tài khoản? Đăng nhập để nhận mã mời' : 'Đã có tài khoản? Đăng nhập'}
        </Link>
        {isTeacher && hasInvitation && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Đã nhận link mời</span>
        )}
      </div>
    </form>
  );
}
