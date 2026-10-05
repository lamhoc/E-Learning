'use client';

import { useActionState } from 'react';
import { BookPlus, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTeacherClass, type CreateClassState } from './actions';

type SubjectOption = { id: string; code: string; name: string };

const initialState: CreateClassState = { status: 'idle', message: '' };

export function ClassForm({ subjects }: { subjects: SubjectOption[] }) {
  const [state, formAction, pending] = useActionState(createTeacherClass, initialState);

  if (subjects.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        Bạn chưa được phân công môn học. Hãy liên hệ quản trị viên để được cấp môn phụ trách.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="class-subject">Môn học được phân công</Label>
        <select id="class-subject" name="subjectId" required defaultValue={subjects[0].id} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="class-name">Tên lớp</Label>
        <Input id="class-name" name="name" required minLength={2} maxLength={120} placeholder="Lớp Toán 10A" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="class-code">Mã lớp</Label>
        <Input id="class-code" name="classCode" required minLength={2} maxLength={24} pattern="[A-Za-z0-9_-]+" placeholder="TOAN10A" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="class-year">Năm học</Label>
        <Input id="class-year" name="academicYear" required pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" />
      </div>

      {state.message && (
        <p role={state.status === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm sm:col-span-2 ${state.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="gap-2 sm:col-span-2 sm:justify-self-start">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <BookPlus aria-hidden="true" className="size-4" />}
        {pending ? 'Đang tạo lớp...' : 'Tạo lớp'}
      </Button>
    </form>
  );
}