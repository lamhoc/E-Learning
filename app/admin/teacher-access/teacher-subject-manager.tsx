'use client';

import { useState, useTransition } from 'react';
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { assignSubject, unassignSubject } from './actions';
import type { AcademicAssignment, AcademicSubject, AcademicTeacher } from './academic-access';

export function TeacherSubjectManager({
  teachers,
  subjects,
  assignments,
}: {
  teachers: AcademicTeacher[];
  subjects: AcademicSubject[];
  assignments: AcademicAssignment[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectByTeacher, setSelectedSubjectByTeacher] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAssign = (teacherId: string) => {
    const subjectId = selectedSubjectByTeacher[teacherId];
    if (!subjectId) return;

    setActiveActionId(`assign-${teacherId}-${subjectId}`);
    setActionMessage(null);

    startTransition(async () => {
      const result = await assignSubject(teacherId, subjectId);
      if (result.success) {
        setSelectedSubjectByTeacher((prev) => ({ ...prev, [teacherId]: '' }));
        setActionMessage({ type: 'success', text: 'Đã phân công môn học thành công.' });
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Không thể phân công môn học.' });
      }
      setActiveActionId(null);
    });
  };

  const handleUnassign = (teacherId: string, subjectId: string, subjectName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ môn "${subjectName}" khỏi giảng viên này?`)) {
      return;
    }

    setActiveActionId(`unassign-${teacherId}-${subjectId}`);
    setActionMessage(null);

    startTransition(async () => {
      const result = await unassignSubject(teacherId, subjectId);
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Đã gỡ môn học thành công.' });
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Không thể gỡ môn học.' });
      }
      setActiveActionId(null);
    });
  };

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="border-b border-slate-100 bg-white pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="size-5 text-[#17372e]" />
              Danh sách Giảng viên & Môn phụ trách
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Xem và click chọn gán hoặc hủy các môn giảng dạy cho từng giảng viên trong hệ thống.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Tìm theo tên giảng viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </div>
        {actionMessage && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {actionMessage.text}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredTeachers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {searchTerm ? 'Không tìm thấy giảng viên phù hợp.' : 'Chưa có giảng viên nào trong hệ thống.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTeachers.map((teacher) => {
              const teacherAssignments = assignments.filter((a) => a.teacherId === teacher.id);
              const assignedSubjectIds = new Set(teacherAssignments.map((a) => a.subjectId));
              const availableSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));
              const currentSelectValue = selectedSubjectByTeacher[teacher.id] || '';

              return (
                <div
                  key={teacher.id}
                  className="p-4 sm:p-5 flex flex-col gap-3.5 hover:bg-slate-50/60 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#17372e]/10 text-[#17372e] font-bold text-sm">
                        <User className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900">{teacher.name}</h3>
                        <p className="text-xs text-slate-500">
                          {teacherAssignments.length} môn đang phụ trách
                        </p>
                      </div>
                    </div>

                    {/* Inline Add Subject Controls */}
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Chọn môn gán cho ${teacher.name}`}
                        value={currentSelectValue}
                        onChange={(e) =>
                          setSelectedSubjectByTeacher((prev) => ({
                            ...prev,
                            [teacher.id]: e.target.value,
                          }))
                        }
                        disabled={isPending || availableSubjects.length === 0}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-emerald-600 disabled:opacity-50 min-w-44"
                      >
                        <option value="">
                          {availableSubjects.length === 0
                            ? 'Đã gán hết môn'
                            : '— Chọn môn học để gán —'}
                        </option>
                        {availableSubjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} · {subject.name}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending || !currentSelectValue}
                        onClick={() => handleAssign(teacher.id)}
                        className="h-8 gap-1 bg-[#17372e] hover:bg-[#20493e] text-white text-xs px-2.5 rounded-lg"
                      >
                        {activeActionId?.startsWith(`assign-${teacher.id}`) ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Plus className="size-3.5" />
                        )}
                        Gán môn
                      </Button>
                    </div>
                  </div>

                  {/* Assigned Subjects Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                      <BookOpen className="size-3" /> Môn đảm nhiệm:
                    </span>
                    {teacherAssignments.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        Chưa được phân công môn nào
                      </span>
                    ) : (
                      teacherAssignments.map((assignment) => {
                        const isUnassigning =
                          activeActionId === `unassign-${teacher.id}-${assignment.subjectId}`;
                        return (
                          <span
                            key={assignment.subjectId}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-900 shadow-2xs"
                          >
                            <span className="font-mono text-[10px] text-emerald-700 font-bold uppercase">
                              {assignment.subjectCode}
                            </span>
                            <span>{assignment.subjectName}</span>
                            <button
                              type="button"
                              aria-label={`Gỡ môn ${assignment.subjectName}`}
                              disabled={isPending}
                              onClick={() =>
                                handleUnassign(
                                  teacher.id,
                                  assignment.subjectId,
                                  assignment.subjectName,
                                )
                              }
                              className="ml-0.5 rounded-full p-0.5 text-emerald-700 hover:bg-emerald-200/60 hover:text-emerald-950 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isUnassigning ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <X className="size-3" />
                              )}
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
