'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrorMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage('Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại thông tin đăng nhập.');
      setPending(false);
      return;
    }

    router.replace('/subjects');
    router.refresh();
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#285845] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f4837] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Đang xác thực...' : 'Đăng nhập'}
      </button>
    </form>
  );
}
