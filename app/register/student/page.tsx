import Link from 'next/link';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { RegistrationForm } from '../registration-form';

export default function StudentRegistrationPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14 transition-colors">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between mb-4">
          <BrandLogo href="/" size="sm" />
          <ThemeToggle />
        </div>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Tài khoản người học LHU
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Đăng ký sinh viên</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
            Tạo tài khoản bằng email sinh viên LHU của bạn. Sau đăng ký, hãy đăng nhập để vào không gian học tập.
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
