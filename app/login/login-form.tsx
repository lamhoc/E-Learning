'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function continueAuthLink() {
      const url = new URL(window.location.href);
      const claimEmail = url.searchParams.get('claimEmail');
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');
      const hasCallbackCode = url.searchParams.has('code');
      const hasAccessToken = url.hash.includes('access_token=');

      if (claimEmail) setEmail(claimEmail);
      if (!tokenHash && !hasCallbackCode && !hasAccessToken) return;

      const supabase = createClient();
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
        if (error) throw error;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session && active) {
        router.replace('/auth/set-password');
        return;
      }

      if (active) {
        setErrorMessage('Liên kết đã hết hạn hoặc đã được sử dụng. Hãy gửi lại link đặt mật khẩu.');
      }
    }

    continueAuthLink().catch((error: unknown) => {
      if (active) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể xác thực liên kết.');
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrorMessage('');
    setNoticeMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (error) {
      setErrorMessage(
        error.code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed')
          ? 'Email chưa được xác nhận. Hãy mở thư Supabase gửi và bấm link xác nhận, sau đó đăng nhập lại.'
          : 'Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại thông tin đăng nhập.',
      );
      setPending(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const currentUrl = new URL(window.location.href);
    const invitationToken = currentUrl.searchParams.get('claimInvite');
    if (invitationToken) {
      const claimUrl = new URL('/register/teacher/claim', window.location.origin);
      claimUrl.searchParams.set('invite', invitationToken);
      claimUrl.searchParams.set('email', currentUrl.searchParams.get('claimEmail') || '');
      router.replace(`${claimUrl.pathname}${claimUrl.search}`);
      return;
    }

    const { data: roleRecord } = user
      ? await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      : { data: null };

    router.replace(roleRecord?.role === 'teacher' ? '/teacher/dashboard' : '/subjects');
    router.refresh();
  }

  async function sendPasswordLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage('Nhập email trước khi yêu cầu link đặt mật khẩu.');
      return;
    }

    setPending(true);
    setErrorMessage('');
    setNoticeMessage('');

    const redirectTo = new URL('/auth/callback', window.location.origin);
    redirectTo.searchParams.set('next', '/auth/set-password');
    const { error } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo.toString(),
    });

    if (error) {
      if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
        setErrorMessage('Supabase đang giới hạn số email gửi đi. Hãy dùng link đã nhận trong hộp thư hoặc chờ trước khi yêu cầu link mới.');
      } else if (error.message.toLowerCase().includes('redirect')) {
        setErrorMessage('URL callback chưa được cho phép. Thêm http://localhost:3000/auth/callback vào Supabase Auth URL Configuration.');
      } else {
        setErrorMessage(`Supabase không gửi được link: ${error.message}`);
      }
    } else {
      setNoticeMessage('Nếu email thuộc tài khoản hợp lệ, link đặt lại mật khẩu sẽ được gửi tới hộp thư của bạn.');
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#34473d]">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-[#cbd7ce] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#648675] focus:ring-2 focus:ring-[#648675]/15"
          placeholder="ten@truong.edu.vn"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#34473d]">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-[#cbd7ce] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#648675] focus:ring-2 focus:ring-[#648675]/15"
          placeholder="Nhập mật khẩu"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      )}
      {noticeMessage && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {noticeMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#285845] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f4837] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Đang xác thực...' : 'Đăng nhập'}
      </button>
      <button
        type="button"
        onClick={sendPasswordLink}
        disabled={pending}
        className="w-full rounded-md border border-[#cbd7ce] px-4 py-2.5 text-sm font-medium text-[#355347] transition hover:bg-[#edf3ed] disabled:cursor-wait disabled:opacity-60"
      >
        Gửi link đặt mật khẩu
      </button>
    </form>
  );
}
