'use client';

import { useActionState } from 'react';
import { Search, UserMinus, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  enrollStudentInClass,
  findStudentForClass,
  unenrollStudentFromClass,
  type MembershipActionState,
  type StudentLookupState,
} from './actions';

export type ClassRosterStudent = {
  id: string;
  fullName: string;
  email: string;
  studentCode: string;
  enrolledAt: string;
};

const initialLookup: StudentLookupState = { status: 'idle', message: '' };
const initialMembership: MembershipActionState = { status: 'idle', message: '' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

function RemoveStudentButton({ classId, studentId }: { classId: string; studentId: string }) {
  const [state, formAction, pending] = useActionState(unenrollStudentFromClass, initialMembership);

  return (
    <div className="flex items-center justify-end gap-2">
      {state.message && <span role={state.status === 'error' ? 'alert' : 'status'} className="text-xs text-muted-foreground">{state.message}</span>}
      <form action={formAction}>
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="studentId" value={studentId} />
        <Button type="submit" variant="outline" size="icon-sm" disabled={pending} aria-label="Gỡ sinh viên khỏi lớp" title="Gỡ khỏi lớp">
          <UserMinus aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

export function RosterManager({ classId, students }: { classId: string; students: ClassRosterStudent[] }) {
  const [lookup, lookupAction, searching] = useActionState(findStudentForClass, initialLookup);
  const [membership, membershipAction, enrolling] = useActionState(enrollStudentInClass, initialMembership);

  return (
    <div className="space-y-6">
      <section className="max-w-2xl">
        <h2 className="text-base font-semibold">Thêm sinh viên</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tìm theo mã sinh viên hoặc email chính xác. Sinh viên cần đăng ký tài khoản trước.</p>
        <form action={lookupAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="classId" value={classId} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="student-identifier">Mã sinh viên hoặc email</Label>
            <Input id="student-identifier" name="identifier" type="text" autoComplete="off" required placeholder="SV000123 hoặc email chính xác" />
          </div>
          <Button type="submit" disabled={searching} className="gap-2">
            <Search aria-hidden="true" className="size-4" /> {searching ? 'Đang tìm...' : 'Tìm sinh viên'}
          </Button>
        </form>

        {lookup.message && (
          <p role={lookup.status === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-md border px-3 py-2 text-sm ${lookup.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {lookup.message}
          </p>
        )}

        {lookup.student && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{lookup.student.fullName}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{lookup.student.studentCode} · {lookup.student.email}</p>
            </div>
            {lookup.student.alreadyEnrolled ? (
              <Badge variant="secondary">Đã trong lớp</Badge>
            ) : (
              <form action={membershipAction} className="flex items-center gap-2">
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="studentId" value={lookup.student.id} />
                <Button type="submit" disabled={enrolling || membership.status === 'success'} className="gap-2">
                  <UserPlus aria-hidden="true" className="size-4" /> {enrolling ? 'Đang thêm...' : 'Thêm vào lớp'}
                </Button>
              </form>
            )}
          </div>
        )}

        {membership.message && (
          <p role={membership.status === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-md border px-3 py-2 text-sm ${membership.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {membership.message}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Danh sách sinh viên</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tài khoản đã được ghi danh vào lớp này.</p>
          </div>
          <Badge variant="outline">{students.length}</Badge>
        </div>

        {students.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Lớp chưa có sinh viên.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Sinh viên</th>
                  <th className="px-4 py-3 font-medium">Ngày ghi danh</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{student.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(student.enrolledAt)}</td>
                    <td className="px-4 py-3"><RemoveStudentButton classId={classId} studentId={student.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}