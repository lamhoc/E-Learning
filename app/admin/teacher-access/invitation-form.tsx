'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, LoaderCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTeacherInvitation, type InvitationState } from './actions';

const initialState: InvitationState = { status: 'idle', message: '' };

export function InvitationForm() {
  const [state, formAction, pending] = useActionState(createTeacherInvitation, initialState);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!state.invitationUrl) return;
    await navigator.clipboard.writeText(state.invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mời giảng viên</CardTitle>
        <CardDescription>Link gắn với email, hết hạn sau 24 giờ và tự vô hiệu hóa khi được dùng.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="teacher-email">Email giảng viên</Label>
            <Input id="teacher-email" name="email" type="email" autoComplete="email" required placeholder="giangvien@truong.edu.vn" />
          </div>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
            {pending ? 'Đang tạo...' : 'Tạo link mời'}
          </Button>
        </form>

        {state.message && (
          <p role={state.status === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${state.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {state.message}
          </p>
        )}

        {state.invitationUrl && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input aria-label="Link mời một lần" readOnly value={state.invitationUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyLink} className="shrink-0 gap-2">
              {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
              {copied ? 'Đã sao chép' : 'Sao chép link'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
