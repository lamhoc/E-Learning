import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { RegistrationForm } from '../registration-form';

export default function StudentRegistrationPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f3] px-4 py-12 text-foreground sm:py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315b48] hover:text-primary">
          <GraduationCap aria-hidden="true" className="size-5" /> Mầm Học
        </Link>
        <section className="mt-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174]">Tài khoản người học</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Đăng ký sinh viên</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
            Tạo tài khoản bằng email của bạn. Sau đăng ký, hãy đăng nhập để vào không gian học tập.
          </p>
          <RegistrationForm role="student" />
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Tài khoản mới được tạo với quyền sinh viên; không thể tự nâng quyền trong biểu mẫu.
        </p>
      </div>
    </main>
  );
}
