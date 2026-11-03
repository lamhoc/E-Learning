import { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getAdminStudentsList } from '@/lib/admin-students';
import { StudentTableClient } from '@/components/admin/student-table-client';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Quản lý Tài khoản Sinh viên | Mầm Học Admin',
  description: 'Quản lý danh sách tài khoản sinh viên và quyền truy cập hệ thống.',
};

export default async function AdminStudentManagementPage() {
  const students = await getAdminStudentsList();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#154C99] dark:text-[#3B82F6]">
            Quản trị Người dùng
          </span>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
            Học viên
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#154C99] text-white shadow-xs dark:bg-[#1E5BBB]">
            <Users className="size-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Quản lý Tài khoản Sinh viên
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Tra cứu toàn bộ tài khoản người học trong hệ thống. Quản trị viên có thể kiểm tra trạng thái hoạt động, mã sinh viên và thực hiện khóa hoặc mở khóa tài khoản khi có vi phạm quy chế thi.
        </p>
      </section>

      {/* Interactive Table Component */}
      <StudentTableClient students={students} />
    </div>
  );
}
