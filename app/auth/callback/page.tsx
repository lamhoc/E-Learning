'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function getSafeNextPath(value: string | null) {
  if (!value) return '/subjects';
  const target = new URL(value, window.location.origin);
  return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : '/subjects';
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      const url = new URL(window.location.href);
      const nextPath = getSafeNextPath(url.searchParams.get('next'));
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');
      const supabase = createClient();

      if (url.searchParams.has('error_description') || url.hash.includes('error_description=')) {
        throw new Error('Liên kết xác thực không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link đặt mật khẩu mới.');
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email',
        });
        if (error) throw error;
      }

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let session = currentSession;

      if (!session) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (result.error) throw result.error;
          session = result.data.session;
        }
      }

      if (!session) throw new Error('Không nhận được phiên xác thực từ liên kết. Hãy yêu cầu link mới.');
      if (active) router.replace(nextPath);
    }

    completeAuth().catch((error: unknown) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xác thực liên kết.');
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6f1] px-4 py-12 text-[#202b27]">
      <section className="w-full max-w-md rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">Xác thực tài khoản</p>
        <h1 className="mt-2 text-xl font-semibold">Đang hoàn tất liên kết</h1>
        {errorMessage ? (
          <>
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
              {errorMessage}
            </p>
            <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-[#285845] hover:underline">
              Quay lại đăng nhập để gửi link mới
            </Link>
          </>
        ) : (
          <p role="status" className="mt-3 text-sm text-[#68776e]">
            Đang xác minh với Supabase. Bạn sẽ được chuyển tiếp tự động.
          </p>
        )}
      </section>
    </main>
  );
}
