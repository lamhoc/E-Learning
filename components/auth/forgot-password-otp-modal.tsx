'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  sendPasswordResetOtpAction,
  verifyOtpAndResetPasswordAction,
} from '@/app/login/otp-actions';

type ForgotPasswordOtpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccessPasswordReset?: (email: string) => void;
};

export function ForgotPasswordOtpModal({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccessPasswordReset,
}: ForgotPasswordOtpModalProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  // Đếm ngược 60s trước khi cho phép gửi lại OTP
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');

    startTransition(async () => {
      const res = await sendPasswordResetOtpAction(email);
      if (res.success) {
        setInfoMessage(res.message);
        setStep('otp');
        setResendCooldown(60);
      } else {
        setErrorMessage(res.message);
      }
    });
  }

  function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (otp.trim().length !== 6) {
      setErrorMessage('Mã OTP phải bao gồm đúng 6 chữ số.');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 12 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không trùng khớp.');
      return;
    }

    startTransition(async () => {
      const res = await verifyOtpAndResetPasswordAction(email, otp, newPassword);
      if (res.success) {
        setStep('success');
        if (onSuccessPasswordReset) {
          onSuccessPasswordReset(email);
        }
      } else {
        setErrorMessage(res.message);
      }
    });
  }

  function handleCloseModal() {
    setStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setInfoMessage('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleCloseModal}
          className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Đóng hộp thoại"
        >
          <X className="size-4" />
        </button>

        {/* ── BƯỚC 1: NHẬP EMAIL ĐỂ GỬI MÃ ── */}
        {step === 'email' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">Quên mật khẩu</h3>
                <p className="text-xs text-muted-foreground">Nhận mã xác thực 6 số qua email</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Nhập email đăng ký tài khoản Mầm Học. Hệ thống sẽ gửi mã OTP bảo mật để bạn thiết lập mật khẩu mới ngay lập tức.
            </p>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email tài khoản</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@lhu.edu.vn"
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
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
                    Đang gửi mã...
                  </>
                ) : (
                  <>
                    Gửi mã xác thực OTP
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* ── BƯỚC 2: NHẬP OTP VÀ MẬT KHẨU MỚI ── */}
        {step === 'otp' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Mail className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">Xác nhận mã OTP</h3>
                <p className="text-xs text-muted-foreground">Đã gửi tới {email}</p>
              </div>
            </div>

            {infoMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp-input">Mã OTP 6 số</Label>
                  <button
                    type="button"
                    disabled={isPending || resendCooldown > 0}
                    onClick={() => handleSendOtp()}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3 ${isPending ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã'}
                  </button>
                </div>
                <Input
                  id="otp-input"
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

              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 12 ký tự"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="pl-10"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('email')}
                  className="w-1/3"
                >
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Đang xác nhận...
                    </>
                  ) : (
                    'Đổi mật khẩu'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── BƯỚC 3: THÀNH CÔNG ── */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto">
              <CheckCircle2 className="size-8" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-foreground">Đổi mật khẩu thành công!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Mật khẩu tài khoản <strong>{email}</strong> đã được cập nhật thành công qua xác thực Resend.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleCloseModal}
              className="w-full bg-[#154C99] hover:bg-[#103b77] text-white"
            >
              Đăng nhập ngay
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
