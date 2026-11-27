'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function getSafeNextPath(value: string | null) {
  if (!value) return '/login';
  try {
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : '/login';
  } catch {
    return '/login';
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const nextPath = getSafeNextPath(url.searchParams.get('next'));
    router.replace(nextPath);
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6f1] px-4 py-12 text-[#202b27]">
      <section className="w-full max-w-md rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">Xác thực tài khoản</p>
        <h1 className="mt-2 text-xl font-semibold">Đang chuyển hướng</h1>
        <p role="status" className="mt-3 text-sm text-[#68776e]">
          Hệ thống đang chuyển bạn về trang đăng nhập.
        </p>
        <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-[#285845] hover:underline">
          Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}
