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

    // Refresh để Server Component lấy session mới
    router.refresh();
  }

  async function sendPasswordLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Nhập email để nhận link đặt lại mật khẩu.');
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
        setErrorMessage('Hệ thống đang giới hạn số email gửi đi. Hãy dùng link đã nhận trong hộp thư hoặc chờ ít phút.');
      } else if (error.message.toLowerCase().includes('redirect')) {
        setErrorMessage('URL callback chưa được cấu hình cho phép.');
      } else {
        setErrorMessage(`Không gửi được link: ${error.message}`);
      }
    } else {
      setNoticeMessage('Nếu email thuộc tài khoản hợp lệ, link đặt lại mật khẩu sẽ được gửi tới hộp thư của bạn.');
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4.5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-[#154C99] focus:ring-2 focus:ring-[#154C99]/15 dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]/20 placeholder:text-muted-foreground"
          placeholder="ten@lhu.edu.vn"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-[#154C99] focus:ring-2 focus:ring-[#154C99]/15 dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]/20 placeholder:text-muted-foreground"
          placeholder="Nhập mật khẩu"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-800 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      {noticeMessage && (
        <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 px-3.5 py-2.5 text-sm text-blue-900 dark:text-blue-300">
          {noticeMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#154C99] hover:bg-[#0A275C] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:shadow-md disabled:cursor-wait disabled:opacity-60 cursor-pointer"
      >
        {pending ? 'Đang xác thực...' : 'Đăng nhập'}
      </button>
      <button
        type="button"
        onClick={sendPasswordLink}
        disabled={pending}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60 cursor-pointer"
      >
        Gửi link đặt lại mật khẩu
      </button>
    </form>
  );
}
