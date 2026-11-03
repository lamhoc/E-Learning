import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { RegistrationForm } from '../registration-form';

type TeacherRegistrationPageProps = {
  searchParams: Promise<{ invite?: string; email?: string }>;
};

export default async function TeacherRegistrationPage({ searchParams }: TeacherRegistrationPageProps) {
  const params = await searchParams;
  const invitationToken = params.invite?.trim() ?? '';
  const invitationEmail = params.email?.trim().toLowerCase() ?? '';

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14 transition-colors">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between mb-4">
          <BrandLogo href="/" size="sm" />
          <ThemeToggle />
        </div>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Cổng Giảng dạy LHU
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Đăng ký giảng viên</h1>
          <div className="mb-6 mt-3 flex gap-2 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-3.5 text-sm leading-5 text-foreground/90">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {invitationToken
                ? 'Mã mời được ràng buộc với email và chỉ sử dụng một lần. Hệ thống xác minh ở cơ sở dữ liệu khi tạo tài khoản.'
                : 'Không có mã mời? Bạn vẫn có thể gửi yêu cầu; tài khoản sẽ ở quyền sinh viên đến khi admin phê duyệt.'}
            </p>
          </div>
          <RegistrationForm role="teacher" invitationToken={invitationToken} invitationEmail={invitationEmail} />
        </section>
      </div>
    </main>
  );
}
