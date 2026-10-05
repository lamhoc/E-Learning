'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { claimTeacherInvitation } from '@/app/register/actions';

export function ClaimInvitationForm({ token, emailMatches }: { token: string; emailMatches: boolean }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailMatches || pending) return;

    setPending(true);
    setErrorMessage('');
    const result = await claimTeacherInvitation(token);
    if (!result.success) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }

    router.replace('/teacher/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {errorMessage && (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={!emailMatches || pending} className="w-full gap-2">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <BadgeCheck aria-hidden="true" className="size-4" />}
        {pending ? 'Đang xác nhận...' : 'Nhận lời mời và mở dashboard'}
      </Button>
    </form>
  );
}
