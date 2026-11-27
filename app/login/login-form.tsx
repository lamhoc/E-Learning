'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { ForgotPasswordOtpModal } from '@/components/auth/forgot-password-otp-modal';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage('');
    setNoticeMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.error || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        );
        setPending(false);
        return;
      }

      // Refresh để Server Component đọc cookie JWT mới và điều hướng theo role
      router.refresh();
    } catch {
      setErrorMessage('Không thể kết nối máy chủ. Vui lòng thử lại.');
      setPending(false);
    }
  }

  return (
    <>
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
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => setIsOtpModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>
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
          onClick={() => setIsOtpModalOpen(true)}
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60 cursor-pointer"
        >
          <KeyRound className="size-4 text-blue-600 dark:text-blue-400" />
          Đặt lại mật khẩu bằng mã OTP (Email)
        </button>
      </form>

      <ForgotPasswordOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        defaultEmail={email}
        onSuccessPasswordReset={(resetEmail) => {
          setEmail(resetEmail);
          setNoticeMessage('Đổi mật khẩu thành công! Vui lòng nhập mật khẩu mới để đăng nhập.');
        }}
      />
    </>
  );
}
