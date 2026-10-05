import Link from 'next/link';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { RegistrationForm } from '../registration-form';

type TeacherRegistrationPageProps = {
  searchParams: Promise<{ invite?: string; email?: string }>;
};

export default async function TeacherRegistrationPage({ searchParams }: TeacherRegistrationPageProps) {
  const params = await searchParams;
  const invitationToken = params.invite?.trim() ?? '';
  const invitationEmail = params.email?.trim().toLowerCase() ?? '';

  return (
    <main className="min-h-screen bg-[#f3f6f3] px-4 py-12 text-foreground sm:py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315b48] hover:text-primary">
          <GraduationCap aria-hidden="true" className="size-5" /> Mầm Học
        </Link>
        <section className="mt-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#648174]">Không gian giảng dạy</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Đăng ký giảng viên</h1>
          <div className="mb-6 mt-3 flex gap-2 rounded-lg border border-[#dce7dc] bg-[#f3f8f3] p-3 text-sm leading-5 text-[#385c49]">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
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
