'use client';

import { useState, useTransition } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Search,
  ShieldAlert,
  Unlock,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toggleStudentStatus } from '@/app/admin/student-management/actions';
import type { StudentAccount } from '@/lib/admin-students';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function StudentTableClient({
  students,
}: {
  students: StudentAccount[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [isPending, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Thống kê nhanh
  const totalCount = students.length;
  const blockedCount = students.filter((s) => s.isBlocked).length;
  const activeCount = totalCount - blockedCount;

  // Lọc dữ liệu theo tìm kiếm và trạng thái
  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      student.fullName.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term) ||
      (student.studentCode &&
        student.studentCode.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return !student.isBlocked;
    if (statusFilter === 'blocked') return student.isBlocked;
    return true;
  });

  const handleToggleStatus = (student: StudentAccount) => {
    const nextBlockedState = !student.isBlocked;
    const actionLabel = nextBlockedState ? 'Khóa' : 'Mở khóa';

    const confirmed = confirm(
      `Bạn có chắc chắn muốn ${actionLabel} tài khoản sinh viên "${student.fullName}" (${student.email})?` +
        (nextBlockedState
          ? '\n\nSau khi khóa, sinh viên này sẽ không thể đăng nhập vào hệ thống.'
          : '\n\nSau khi mở khóa, sinh viên sẽ có thể đăng nhập và làm bài bình thường.'),
    );

    if (!confirmed) return;

    setActiveActionId(student.id);
    setToastMessage(null);

    startTransition(async () => {
      const result = await toggleStudentStatus(student.id, nextBlockedState);
      if (result.success) {
        setToastMessage({
          type: 'success',
          text: `Đã ${actionLabel.toLowerCase()} tài khoản sinh viên thành công.`,
        });
      } else {
        setToastMessage({
          type: 'error',
          text: result.error || `Không thể ${actionLabel.toLowerCase()} tài khoản.`,
        });
      }
      setActiveActionId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Tổng sinh viên */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tổng sinh viên
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Đang hoạt động */}
        <Card className="border-emerald-200/80 dark:border-emerald-800/60 shadow-xs bg-emerald-50/70 dark:bg-emerald-950/30">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Đang hoạt động
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-300">{activeCount}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Đang bị khóa */}
        <Card className="border-rose-200/80 dark:border-rose-800/60 shadow-xs bg-rose-50/70 dark:bg-rose-950/30">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                Đang bị khóa
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-950 dark:text-rose-300">{blockedCount}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
              <UserX className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thông báo thao tác */}
      {toastMessage && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-2 shadow-xs ${
            toastMessage.type === 'success'
              ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200'
              : 'border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="size-4 text-rose-700 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 opacity-70 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Bảng Dữ liệu & Thanh điều khiển */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-[#111C2D]">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="size-5 text-[#154C99] dark:text-[#3B82F6]" />
                Danh sách Tài khoản Sinh viên
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Xem toàn bộ tài khoản sinh viên, tra cứu thông tin và quản lý quyền truy cập.
              </CardDescription>
            </div>

            {/* Thanh Tìm kiếm & Bộ lọc trạng thái */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter Tabs */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === 'all'
                      ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tất cả ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === 'active'
                      ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Hoạt động ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('blocked')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === 'blocked'
                      ? '!bg-rose-600 !text-white shadow-md shadow-rose-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Bị khóa ({blockedCount})
                </button>
              </div>

              {/* Search input */}
              <div className="relative min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Tìm tên, email, mã SV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                <Search className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {searchTerm || statusFilter !== 'all'
                  ? 'Không tìm thấy sinh viên phù hợp'
                  : 'Chưa có tài khoản sinh viên'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái để xem đầy đủ danh sách.'
                  : 'Khi sinh viên đăng ký tài khoản học tập, thông tin sẽ hiển thị tại đây.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                    <TableHead className="pl-5 font-semibold text-slate-700 dark:text-slate-300">Sinh viên</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Email</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Ngày tạo</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                    <TableHead className="pr-5 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((student) => {
                    const isRowPending = isPending && activeActionId === student.id;

                    return (
                      <TableRow
                        key={student.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 transition"
                      >
                        {/* Cột 1: Tên & Mã SV */}
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-blue-900/40 dark:text-blue-300 font-bold text-xs uppercase">
                              {student.fullName.charAt(0) || 'S'}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {student.fullName}
                              </p>
                              {student.studentCode ? (
                                <p className="mt-0.5 text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                                  Mã SV: {student.studentCode}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 italic">
                                  Chưa có mã SV
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Cột 2: Email */}
                        <TableCell className="text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                            <Mail className="size-3.5 text-slate-400 dark:text-slate-500" />
                            {student.email}
                          </span>
                        </TableCell>

                        {/* Cột 3: Ngày tạo */}
                        <TableCell className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="size-3 text-slate-400 dark:text-slate-500" />
                            {formatDate(student.createdAt)}
                          </span>
                        </TableCell>

                        {/* Cột 4: Trạng thái */}
                        <TableCell>
                          {student.isBlocked ? (
                            <Badge className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-semibold gap-1 text-[11px]">
                              <Lock className="size-3" />
                              Bị khóa
                            </Badge>
                          ) : (
                            <Badge className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold gap-1 text-[11px]">
                              <CheckCircle2 className="size-3" />
                              Hoạt động
                            </Badge>
                          )}
                        </TableCell>

                        {/* Cột 5: Nút Hành động */}
                        <TableCell className="pr-5 text-right">
                          {student.isBlocked ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => handleToggleStatus(student)}
                              className="h-8 gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 text-xs cursor-pointer font-medium"
                              title="Mở khóa tài khoản sinh viên này"
                            >
                              {isRowPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Unlock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                              Mở khóa
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => handleToggleStatus(student)}
                              className="h-8 gap-1.5 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-900/60 text-xs cursor-pointer font-medium"
                              title="Khóa tài khoản sinh viên vi phạm"
                            >
                              {isRowPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Ban className="size-3.5 text-rose-600 dark:text-rose-400" />
                              )}
                              Khóa
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
