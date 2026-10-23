'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { approveTeacher, rejectTeacher } from './actions';

export function ApplicationActions({
  userId,
  applicantEmail,
}: {
  userId: string;
  applicantEmail?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveTeacher(userId);
      if (res.success) {
        setActionDone('approved');
      } else {
        setError(res.error || 'Duyệt thất bại');
      }
    });
  };

  const handleReject = () => {
    const note = prompt(`Lý do từ chối hồ sơ của ${applicantEmail || 'ứng viên'} (không bắt buộc):`);
    if (note === null) return; // Người dùng ấn Cancel

    setError(null);
    startTransition(async () => {
      const res = await rejectTeacher(userId, note);
      if (res.success) {
        setActionDone('rejected');
      } else {
        setError(res.error || 'Từ chối thất bại');
      }
    });
  };

  if (actionDone === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
        <Check className="size-3.5" /> Đã duyệt
      </span>
    );
  }

  if (actionDone === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
        <X className="size-3.5" /> Đã từ chối
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleApprove}
          className="gap-1.5 bg-[#17372e] hover:bg-[#224e41] text-white"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-3.5 text-[#c9ed99]" />
          )}
          Duyệt
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleReject}
          className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X aria-hidden="true" className="size-3.5" />
          )}
          Từ chối
        </Button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
