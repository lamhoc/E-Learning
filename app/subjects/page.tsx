import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';

type AppRole = 'admin' | 'teacher' | 'student';
type Subject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  archived_at: string | null;
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giảng viên',
  student: 'Sinh viên',
};

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const [{ data: profile }, { data: roleRecord, error: roleError }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (roleError || !roleRecord) {
    return (
      <main className="min-h-screen bg-[#f4f6f1] px-5 py-12 text-[#202b27]">
        <section className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-white p-6">
          <h1 className="text-lg font-semibold">Tài khoản chưa có vai trò</h1>
          <p className="mt-2 text-sm leading-6 text-[#68776e]">
            Không đọc được `user_roles` cho tài khoản này. Kiểm tra trigger tạo người dùng và RLS trong Supabase.
          </p>
        </section>
      </main>
    );
  }

  const role = roleRecord.role as AppRole;
  if (!['admin', 'teacher', 'student'].includes(role)) redirect('/login');

  let subjectIds: string[] | null = null;
  let lookupError = '';

  if (role === 'teacher') {
    const { data, error } = await supabase
      .from('classes')
      .select('subject_id')
      .eq('teacher_id', user.id)
      .is('archived_at', null);

    if (error) lookupError = error.message;
    subjectIds = [...new Set((data ?? []).map((row) => row.subject_id as string))];
  } else if (role === 'student') {
    const { data: memberships, error: membershipError } = await supabase
      .from('class_memberships')
      .select('class_id')
      .eq('student_id', user.id);

    if (membershipError) {
      lookupError = membershipError.message;
    } else {
      const classIds = [...new Set((memberships ?? []).map((row) => row.class_id as string))];
      if (classIds.length > 0) {
        const { data, error } = await supabase
          .from('classes')
          .select('subject_id')
          .in('id', classIds)
          .is('archived_at', null);

        if (error) lookupError = error.message;
        subjectIds = [...new Set((data ?? []).map((row) => row.subject_id as string))];
      } else {
        subjectIds = [];
      }
    }
  }

  let subjects: Subject[] = [];
  if (!lookupError && (subjectIds === null || subjectIds.length > 0)) {
    let query = supabase
      .from('subjects')
      .select('id, code, name, description, archived_at')
      .order('name', { ascending: true });

    if (subjectIds !== null) query = query.in('id', subjectIds);
    if (role !== 'admin') query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) lookupError = error.message;
    else subjects = (data ?? []) as Subject[];
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#202b27]">
      <div className="mx-auto min-h-screen max-w-5xl border-x border-[#dfe5dd] bg-[#fbfcf9]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe5dd] px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d766a]">E-Learning</p>
            <h1 className="mt-1 text-lg font-semibold">Danh sách môn học</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#e7efe8] px-3 py-2 text-xs font-semibold text-[#355347]">
              {roleLabels[role]}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-[#cbd7ce] px-3 py-2 text-sm font-medium text-[#355347] hover:bg-[#edf3ed]"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </header>

        <section className="px-5 py-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-[#68776e]">Xin chào, {profile?.full_name ?? user.email}</p>
              <h2 className="mt-1 text-xl font-semibold">Môn học của bạn</h2>
            </div>
            <p className="text-sm text-[#68776e]">{subjects.length} môn học</p>
          </div>

          {lookupError ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Không thể tải dữ liệu từ Supabase: {lookupError}
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#cbd7ce] bg-white px-5 py-12 text-center">
              <h3 className="font-semibold">Chưa có môn học để hiển thị</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#68776e]">
                {role === 'admin'
                  ? 'Thêm môn học thật trong bảng subjects trên Supabase.'
                  : role === 'teacher'
                    ? 'Tạo hoặc được phân công lớp học trong Supabase để thấy môn phụ trách.'
                    : 'Tài khoản này cần được ghi danh vào một lớp có môn học.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#dfe5dd] bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[#e7ece6] bg-[#f7f9f6] px-4 py-3 text-xs font-semibold uppercase text-[#60776a] sm:px-5">
                <span>Môn học</span>
                <span>Mã môn</span>
              </div>
              <ul>
                {subjects.map((subject) => (
                  <li
                    key={subject.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#edf0ec] px-4 py-4 last:border-b-0 sm:px-5"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{subject.name}</h3>
                      {subject.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-[#68776e]">{subject.description}</p>
                      )}
                      {subject.archived_at && (
                        <span className="mt-2 inline-block text-xs text-[#8a6b34]">Đã lưu trữ</span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-[#60776a]">{subject.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/" className="mt-6 inline-block text-sm font-medium text-[#355347] hover:underline">
            Quay lại gia sư AI
          </Link>
        </section>
      </div>
    </main>
  );
}
