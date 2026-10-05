'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (password.length < 12) {
      setErrorMessage('Mật khẩu cần có ít nhất 12 ký tự.');
      return;
    }
    if (password !== confirmation) {
      setErrorMessage('Hai mật khẩu chưa khớp.');
      return;
    }

    setPending(true);
    setErrorMessage('');
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage('Liên kết đã hết hạn hoặc chưa được xác thực. Hãy gửi lại link thiết lập từ trang đăng nhập.');
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      setPending(false);
      return;
    }

    const { data: roleRecord } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    router.replace(roleRecord?.role === 'teacher' ? '/teacher/dashboard' : '/subjects');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-[#34473d]">
          Mật khẩu mới
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-[#cbd7ce] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#648675] focus:ring-2 focus:ring-[#648675]/15"
          placeholder="Ít nhất 12 ký tự"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-[#34473d]">
          Nhập lại mật khẩu
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="w-full rounded-md border border-[#cbd7ce] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#648675] focus:ring-2 focus:ring-[#648675]/15"
          placeholder="Nhập lại mật khẩu mới"
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
        {pending ? 'Đang lưu...' : 'Lưu mật khẩu và mở dashboard'}
      </button>
    </form>
  );
}
