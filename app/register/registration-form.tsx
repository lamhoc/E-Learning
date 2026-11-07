'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  requestRegistrationOtpAction,
  completeRegistrationWithOtpAction,
} from './actions';

type RegistrationFormProps = {
  role: 'student' | 'teacher';
  invitationToken?: string;
  invitationEmail?: string;
};

export function RegistrationForm({
  role,
  invitationToken = '',
  invitationEmail = '',
}: RegistrationFormProps) {
  const router = useRouter();
  const isTeacher = role === 'teacher';
  const hasInvitation = isTeacher && Boolean(invitationToken);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [registeredEmail, setRegisteredEmail] = useState(invitationEmail);
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form states to re-send OTP if needed
  const [savedFormData, setSavedFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const formData = new FormData(e.currentTarget);
    setSavedFormData(formData);

    startTransition(async () => {
      const res = await requestRegistrationOtpAction(formData, role);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      if (res.bypass && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
        return;
      }

      if (res.email) {
        setRegisteredEmail(res.email);
        setStep('otp');
        setInfoMessage(res.message);
        setResendCooldown(60);
      }
    });
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (otp.trim().length !== 6) {
      setErrorMessage('Mã xác thực phải bao gồm đúng 6 chữ số.');
      return;
    }

    startTransition(async () => {
      const res = await completeRegistrationWithOtpAction(registeredEmail, otp);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      if (res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  }

  function handleResendOtp() {
    if (!savedFormData || resendCooldown > 0) return;
    setErrorMessage('');
    startTransition(async () => {
      const res = await requestRegistrationOtpAction(savedFormData, role);
      if (res.success) {
        setInfoMessage('Đã gửi mã xác thực mới vào email của bạn.');
        setResendCooldown(60);
      } else {
        setErrorMessage(res.message);
      }
    });
  }

  return (
    <div>
      {/* ── BƯỚC 1: ĐIỀN THÔNG TIN TÀI KHOẢN ── */}
      {step === 'form' && (
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {hasInvitation && <input type="hidden" name="invitationToken" value={invitationToken} />}
          {isTeacher && !hasInvitation && <input type="hidden" name="invitationToken" value="" />}

          <div className="space-y-2">
            <Label htmlFor="fullName">Họ và tên</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              placeholder="Nguyễn Minh An"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              readOnly={Boolean(invitationEmail)}
              defaultValue={invitationEmail}
              placeholder="ten@lhu.edu.vn"
              className={invitationEmail ? 'bg-muted' : undefined}
            />
            {invitationEmail && (
              <p className="text-xs text-muted-foreground">
                Email này được khóa theo mã mời của quản trị viên.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              placeholder="Ít nhất 12 ký tự"
            />
            <p className="text-xs text-muted-foreground">
              Tối thiểu 12 ký tự để đảm bảo an toàn tài khoản.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full gap-2 bg-[#154C99] hover:bg-[#103b77] text-white"
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                Tiếp tục (Nhận mã xác thực OTP)
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* ── BƯỚC 2: NHẬP MÃ OTP XÁC THỰC EMAIL QUA RESEND ── */}
      {step === 'otp' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/40">
            <span className="grid size-10 place-items-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Mail className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                Xác thực địa chỉ Email
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                Đã gửi mã OTP tới: <strong>{registeredEmail}</strong>
              </p>
            </div>
          </div>

          {infoMessage && (
            <p className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border">
              {infoMessage}
            </p>
          )}

          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reg-otp">Nhập mã OTP 6 chữ số</Label>
                <button
                  type="button"
                  disabled={isPending || resendCooldown > 0}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${isPending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã'}
                </button>
              </div>
              <Input
                id="reg-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="text-center font-mono text-2xl tracking-[8px] font-bold h-12"
                autoFocus
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
                className="w-1/3"
              >
                <ArrowLeft className="size-4 mr-1" /> Sửa lại
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Kích hoạt tài khoản
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
