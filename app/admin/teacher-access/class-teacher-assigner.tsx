'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateClassTeacher } from './actions';
import type { AcademicClass } from './academic-access';

interface ClassTeacherAssignerProps {
  classItem: AcademicClass;
}

export function ClassTeacherAssigner({ classItem }: ClassTeacherAssignerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentTeacherId, setCurrentTeacherId] = useState<string>(classItem.teacherId || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(classItem.teacherId || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Kiểm tra xem Admin có thay đổi lựa chọn không
  const isChanged = Boolean(selectedTeacherId && selectedTeacherId !== currentTeacherId);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChanged || isPending) return;

    setFeedback(null);

    startTransition(async () => {
      try {
        const res = await updateClassTeacher(classItem.id, selectedTeacherId);
        if (res.success) {
          setCurrentTeacherId(selectedTeacherId);
          setFeedback({
            type: 'success',
            message: 'Đã cập nhật giảng viên phụ trách lớp!',
          });
          setTimeout(() => {
            setFeedback(null);
          }, 3500);
          router.refresh();
        } else {
          setFeedback({
            type: 'error',
            message: res.error || 'Không thể cập nhật giảng viên.',
          });
          setTimeout(() => {
            setFeedback(null);
          }, 5000);
        }
      } catch {
        setFeedback({
          type: 'error',
          message: 'Lỗi kết nối máy chủ khi cập nhật.',
        });
      }
    });
  };

  if (classItem.eligibleTeachers.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
        <AlertCircle className="size-3" />
        Chưa có giảng viên được gán môn này
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[260px]">
      <form onSubmit={handleAssign} className="flex items-center gap-1.5">
        <select
          value={selectedTeacherId}
          disabled={isPending}
          onChange={(e) => {
            setSelectedTeacherId(e.target.value);
            setFeedback(null);
          }}
          className={`h-8 min-w-0 flex-1 rounded-lg border px-2.5 text-xs text-slate-800 dark:text-slate-100 transition-colors shadow-2xs focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99] ${
            isChanged
              ? 'border-[#154C99] dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90'
          }`}
        >
          {!currentTeacherId && (
            <option value="" disabled>
              -- Chưa phân công giảng viên --
            </option>
          )}
          {classItem.eligibleTeachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          size="sm"
          disabled={!isChanged || isPending}
          className={`h-8 gap-1.5 px-3 text-xs transition-all ${
            isChanged && !isPending
              ? 'bg-[#154C99] hover:bg-[#103E7E] text-white dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs font-semibold'
              : 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed'
          }`}
          title={isChanged ? 'Lưu giảng viên phụ trách mới' : 'Chưa có thay đổi'}
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <UserCheck className="size-3.5" />
              <span>Giao lớp</span>
            </>
          )}
        </Button>
      </form>

      {/* Phản hồi trực quan sau khi lưu */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium animate-in fade-in slide-in-from-top-1 ${
            feedback.type === 'success'
              ? 'border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
              : 'border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-3 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

