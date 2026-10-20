'use client';

import { useActionState, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Download, FileSpreadsheet, Search, UserMinus, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  bulkEnrollClassCsv,
  enrollStudentInClass,
  findStudentForClass,
  previewClassEnrollmentCsv,
  unenrollStudentFromClass,
  type CsvPreviewState,
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
const initialCsvPreview: CsvPreviewState = { status: 'idle', message: '' };
const csvTemplate = 'student_code,email\r\n';

type CsvPreviewRow = NonNullable<CsvPreviewState['rows']>[number];

const csvStatusLabels = {
  ready: 'Sẵn sàng',
  not_found: 'Chưa đăng ký',
  already_enrolled: 'Đã trong lớp',
  duplicate: 'Trùng trong file',
  invalid: 'Sai định dạng',
} satisfies Record<CsvPreviewRow['result'], string>;

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
  const [preview, previewAction, previewing] = useActionState(previewClassEnrollmentCsv, initialCsvPreview);
  const [bulkResult, bulkAction, importing] = useActionState(bulkEnrollClassCsv, initialMembership);
  const [identifiersJson, setIdentifiersJson] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState('');

  async function handleCsvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setIdentifiersJson('');
    setCsvFileName('');
    setCsvError('');
    if (!file) return;
    if (file.size > 1_000_000) {
      setCsvError('File vượt quá giới hạn 1 MB.');
      return;
    }

    let parsed: Papa.ParseResult<Record<string, string>>;
    try {
      parsed = await new Promise((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header) => header.replace(/^\uFEFF/, '').trim().toLowerCase(),
          complete: (result) => resolve(result),
          error: (error) => reject(error),
        });
      });
    } catch {
      setCsvError('Không đọc được file CSV. Hãy kiểm tra file và thử lại.');
      return;
    }
    if (parsed.errors.length > 0) {
      setCsvError('CSV không đúng định dạng. Kiểm tra dấu phẩy, dấu nháy và dòng tiêu đề.');
      return;
    }
    const fields = parsed.meta.fields ?? [];
    if (!fields.includes('student_code') || !fields.includes('email')) {
      setCsvError('CSV cần có đúng hai cột tiêu đề: student_code,email. Mỗi dòng chỉ điền một trong hai cột.');
      return;
    }

    const identifiers = parsed.data.map((row) => {
      const studentCode = String(row.student_code ?? '').trim();
      const email = String(row.email ?? '').trim();
      if (studentCode && email) return '';
      return studentCode || email;
    });
    if (identifiers.length === 0) {
      setCsvError('CSV chưa có dòng sinh viên nào.');
      return;
    }
    if (identifiers.length > 500) {
      setCsvError('Mỗi lần import tối đa 500 dòng.');
      return;
    }

    setIdentifiersJson(JSON.stringify(identifiers));
    setCsvFileName(file.name);
  }

  const currentPreview = preview.requestKey === identifiersJson ? preview : null;
  const previewRows = currentPreview?.rows ?? [];
  const readyStudentIds = [...new Set(
    previewRows.flatMap((row) => row.result === 'ready' && row.studentId ? [row.studentId] : []),
  )];

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

      <section className="space-y-3 border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Import CSV</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tải mẫu, điền mã hoặc email sinh viên đã có tài khoản, rồi xem trước trước khi ghi danh.</p>
          </div>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
            download="danh-sach-sinh-vien.csv"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
          >
            <Download aria-hidden="true" className="size-4" /> Tải mẫu CSV
          </a>
        </div>

        <form action={previewAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="identifiersJson" value={identifiersJson} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="class-students-csv">File CSV (tối đa 1 MB, 500 dòng)</Label>
            <Input id="class-students-csv" type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} />
            {csvFileName && <p className="text-xs text-muted-foreground">{csvFileName}</p>}
          </div>
          <Button type="submit" variant="outline" disabled={previewing || !identifiersJson} className="gap-2">
            <FileSpreadsheet aria-hidden="true" className="size-4" /> {previewing ? 'Đang kiểm tra...' : 'Xem trước'}
          </Button>
        </form>

        {csvError && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{csvError}</p>}
        {currentPreview?.message && (
          <p role={currentPreview.status === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${currentPreview.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-border bg-muted/30 text-foreground'}`}>
            {currentPreview.message}
          </p>
        )}

        {currentPreview?.status === 'ready' && (
          <>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Dòng</th>
                    <th className="px-3 py-2.5 font-medium">Mã/email trong file</th>
                    <th className="px-3 py-2.5 font-medium">Sinh viên</th>
                    <th className="px-3 py-2.5 font-medium">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={`${row.rowNumber}:${row.identifier}`} className="border-t border-border">
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{row.rowNumber}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{row.identifier || '—'}</td>
                      <td className="px-3 py-2.5">
                        {row.fullName ? (
                          <><span className="block font-medium">{row.fullName}</span><span className="text-xs text-muted-foreground">{row.studentCode} · {row.email}</span></>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5">{csvStatusLabels[row.result]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form action={bulkAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="classId" value={classId} />
              <input type="hidden" name="studentIdsJson" value={JSON.stringify(readyStudentIds)} />
              <Button type="submit" disabled={importing || readyStudentIds.length === 0} className="gap-2">
                <UserPlus aria-hidden="true" className="size-4" />
                {importing ? 'Đang ghi danh...' : `Thêm ${readyStudentIds.length} sinh viên hợp lệ`}
              </Button>
              <span className="text-xs text-muted-foreground">Dòng lỗi, chưa đăng ký hoặc đã có trong lớp sẽ được bỏ qua.</span>
            </form>
          </>
        )}

        {bulkResult.message && (
          <p role={bulkResult.status === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${bulkResult.status === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {bulkResult.message}
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