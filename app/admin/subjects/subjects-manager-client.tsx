'use client';

import { useState, useTransition } from 'react';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  CheckCircle2,
  Edit2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createSubjectAction,
  updateSubjectAction,
  toggleArchiveSubjectAction,
  deleteSubjectAction,
  quickAssignTeacherAction,
  quickUnassignTeacherAction,
} from './actions';

export type SubjectWithRelations = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  archived_at: string | null;
  classesCount: number;
  assignedTeachers: {
    id: string;
    name: string;
  }[];
};

export type AvailableTeacher = {
  id: string;
  name: string;
};

export function SubjectsManagerClient({
  subjects,
  availableTeachers,
}: {
  subjects: SubjectWithRelations[];
  availableTeachers: AvailableTeacher[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isPending, startTransition] = useTransition();

  // Toast notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithRelations | null>(null);
  const [assigningSubject, setAssigningSubject] = useState<SubjectWithRelations | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<SubjectWithRelations | null>(null);

  // Form states
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addDescription, setAddDescription] = useState('');

  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [selectedTeacherIdToAssign, setSelectedTeacherIdToAssign] = useState('');

  // Metrics computation
  const totalSubjects = subjects.length;
  const archivedCount = subjects.filter((s) => s.archived_at !== null).length;
  const activeCount = totalSubjects - archivedCount;

  const assignedTeacherIds = new Set<string>();
  let totalActiveClasses = 0;
  for (const s of subjects) {
    if (!s.archived_at) {
      totalActiveClasses += s.classesCount;
    }
    for (const t of s.assignedTeachers) {
      assignedTeacherIds.add(t.id);
    }
  }
  const totalAssignedTeachersCount = assignedTeacherIds.size;

  // Filtered subjects
  const filteredSubjects = subjects.filter((subject) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      subject.code.toLowerCase().includes(term) ||
      subject.name.toLowerCase().includes(term) ||
      (subject.description && subject.description.toLowerCase().includes(term)) ||
      subject.assignedTeachers.some((t) => t.name.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return subject.archived_at === null;
    if (statusFilter === 'archived') return subject.archived_at !== null;
    return true;
  });

  // Action handlers
  const handleOpenAdd = () => {
    setAddCode('');
    setAddName('');
    setAddDescription('');
    setIsAddOpen(true);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('code', addCode.trim().toUpperCase());
    formData.append('name', addName.trim());
    formData.append('description', addDescription.trim());

    startTransition(async () => {
      const res = await createSubjectAction(formData);
      if (res.success) {
        setIsAddOpen(false);
        showToast('success', res.message || 'Tạo môn học thành công.');
      } else {
        showToast('error', res.error || 'Không thể tạo môn học.');
      }
    });
  };

  const handleOpenEdit = (subject: SubjectWithRelations) => {
    setEditingSubject(subject);
    setEditCode(subject.code);
    setEditName(subject.name);
    setEditDescription(subject.description || '');
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    const formData = new FormData();
    formData.append('id', editingSubject.id);
    formData.append('code', editCode.trim().toUpperCase());
    formData.append('name', editName.trim());
    formData.append('description', editDescription.trim());

    startTransition(async () => {
      const res = await updateSubjectAction(formData);
      if (res.success) {
        setEditingSubject(null);
        showToast('success', res.message || 'Cập nhật môn học thành công.');
      } else {
        showToast('error', res.error || 'Không thể cập nhật môn học.');
      }
    });
  };

  const handleToggleArchive = (subject: SubjectWithRelations) => {
    const nextArchiveState = !subject.archived_at;
    startTransition(async () => {
      const res = await toggleArchiveSubjectAction(subject.id, nextArchiveState);
      if (res.success) {
        showToast('success', res.message || 'Thay đổi trạng thái thành công.');
      } else {
        showToast('error', res.error || 'Thao tác thất bại.');
      }
    });
  };

  const handleDeleteSubject = () => {
    if (!deletingSubject) return;
    startTransition(async () => {
      const res = await deleteSubjectAction(deletingSubject.id);
      if (res.success) {
        setDeletingSubject(null);
        showToast('success', res.message || 'Đã xóa môn học thành công.');
      } else {
        showToast('error', res.error || 'Không thể xóa môn học.');
      }
    });
  };

  const handleOpenAssignModal = (subject: SubjectWithRelations) => {
    setAssigningSubject(subject);
    setSelectedTeacherIdToAssign('');
  };

  const handleAssignTeacher = () => {
    if (!assigningSubject || !selectedTeacherIdToAssign) return;
    const currentSubjectId = assigningSubject.id;
    const targetTeacherId = selectedTeacherIdToAssign;

    startTransition(async () => {
      const res = await quickAssignTeacherAction(currentSubjectId, targetTeacherId);
      if (res.success) {
        showToast('success', res.message || 'Phân công giảng viên thành công.');
        setSelectedTeacherIdToAssign('');
        // Update local modal state to reflect addition
        const addedTeacher = availableTeachers.find((t) => t.id === targetTeacherId);
        if (addedTeacher) {
          setAssigningSubject((prev) =>
            prev
              ? {
                  ...prev,
                  assignedTeachers: [...prev.assignedTeachers, addedTeacher],
                }
              : null
          );
        }
      } else {
        showToast('error', res.error || 'Không thể phân công giảng viên.');
      }
    });
  };

  const handleUnassignTeacher = (teacherId: string) => {
    if (!assigningSubject) return;
    const currentSubjectId = assigningSubject.id;

    startTransition(async () => {
      const res = await quickUnassignTeacherAction(currentSubjectId, teacherId);
      if (res.success) {
        showToast('success', res.message || 'Đã gỡ giảng viên.');
        setAssigningSubject((prev) =>
          prev
            ? {
                ...prev,
                assignedTeachers: prev.assignedTeachers.filter((t) => t.id !== teacherId),
              }
            : null
        );
      } else {
        showToast('error', res.error || 'Không thể gỡ phân công.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-medium">{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-md p-1 opacity-70 hover:opacity-100 transition"
            aria-label="Đóng thông báo"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric 1: Tổng số môn học */}
        <Card className="border border-border/80 shadow-xs bg-card dark:bg-[#111C2D]">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tổng số môn học
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {totalSubjects}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({activeCount} mở / {archivedCount} lưu trữ)
                </span>
              </div>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-[#154C99]/10 text-[#154C99] dark:bg-[#3B82F6]/20 dark:text-[#60A5FA]">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Giảng viên được phân môn */}
        <Card className="border border-border/80 shadow-xs bg-card dark:bg-[#111C2D]">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                GV đã phân môn
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {totalAssignedTeachersCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {availableTeachers.length} giảng viên
                </span>
              </div>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-[#EAB308]/15 text-[#CA8A04] dark:bg-[#EAB308]/20 dark:text-[#FACC15]">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Tổng số lớp đang mở */}
        <Card className="border border-border/80 shadow-xs bg-card dark:bg-[#111C2D]">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tổng lớp học đang mở
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {totalActiveClasses}
                </span>
                <span className="text-xs text-muted-foreground">lớp học phần</span>
              </div>
            </div>
            <div className="grid size-11 place-items-center rounded-xl bg-[#0A275C]/10 text-[#0A275C] dark:bg-slate-800 dark:text-slate-300">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar: Search, Filters & Add Subject Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 max-w-xl">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm theo mã môn, tên môn hoặc giảng viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9.5 text-sm bg-card dark:bg-[#111C2D] border-border"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs font-semibold dark:bg-[#111C2D]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({totalSubjects})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'active'
                  ? 'bg-card text-foreground shadow-xs font-semibold dark:bg-[#111C2D]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đang mở ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'archived'
                  ? 'bg-card text-foreground shadow-xs font-semibold dark:bg-[#111C2D]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lưu trữ ({archivedCount})
            </button>
          </div>
        </div>

        {/* Add Subject Button */}
        <Button
          onClick={handleOpenAdd}
          className="gap-2 bg-[#154C99] hover:bg-[#0F3D8A] text-white shadow-xs dark:bg-[#1E5BBB] dark:hover:bg-[#154C99]"
        >
          <Plus className="size-4" />
          <span>Thêm môn học mới</span>
        </Button>
      </div>

      {/* Subjects Data Table */}
      <Card className="border border-border/80 shadow-xs bg-card dark:bg-[#111C2D] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 dark:bg-slate-900/40">
              <TableRow className="border-border">
                <TableHead className="w-[120px] font-semibold text-foreground">Mã môn</TableHead>
                <TableHead className="min-w-[220px] font-semibold text-foreground">Tên môn học</TableHead>
                <TableHead className="min-w-[240px] font-semibold text-foreground">
                  Giảng viên phụ trách
                </TableHead>
                <TableHead className="w-[110px] text-center font-semibold text-foreground">
                  Số lớp
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-foreground">Trạng thái</TableHead>
                <TableHead className="w-[140px] text-right font-semibold text-foreground">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Không tìm thấy môn học nào phù hợp</p>
                      <p className="text-xs text-muted-foreground">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bấm nút "Thêm môn học mới" ở trên.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((subject) => {
                  const isArchived = Boolean(subject.archived_at);

                  return (
                    <TableRow
                      key={subject.id}
                      className={`border-border transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40 ${
                        isArchived ? 'opacity-70 bg-muted/20' : ''
                      }`}
                    >
                      {/* Mã môn */}
                      <TableCell className="font-mono text-xs font-semibold">
                        <span className="inline-block rounded-md bg-[#154C99]/10 px-2 py-1 text-[#154C99] dark:bg-[#3B82F6]/20 dark:text-[#93C5FD]">
                          {subject.code}
                        </span>
                      </TableCell>

                      {/* Tên & Mô tả */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {subject.name}
                          </p>
                          {subject.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {subject.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground/60 italic">
                              Chưa có mô tả
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Giảng viên phụ trách */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {subject.assignedTeachers.length === 0 ? (
                            <span className="text-xs text-muted-foreground/70 italic">
                              Chưa có giảng viên
                            </span>
                          ) : (
                            subject.assignedTeachers.map((t) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className="border-[#154C99]/20 bg-[#154C99]/5 text-xs font-normal text-[#154C99] dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 gap-1 py-0.5"
                              >
                                <UserCheck className="size-3" />
                                {t.name}
                              </Badge>
                            ))
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAssignModal(subject)}
                            disabled={isPending}
                            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-[#154C99] dark:hover:text-[#60A5FA]"
                            title="Quản lý phân công giảng viên cho môn này"
                          >
                            <UserPlus className="size-3 mr-1" />
                            <span>Gán GV</span>
                          </Button>
                        </div>
                      </TableCell>

                      {/* Số lớp học */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {subject.classesCount} lớp
                        </Badge>
                      </TableCell>

                      {/* Trạng thái */}
                      <TableCell>
                        {isArchived ? (
                          <Badge
                            variant="outline"
                            className="border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 text-xs gap-1"
                          >
                            <Archive className="size-3" />
                            Đã lưu trữ
                          </Badge>
                        ) : (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang mở
                          </Badge>
                        )}
                      </TableCell>

                      {/* Thao tác */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Sửa môn học */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleOpenEdit(subject)}
                            className="size-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Sửa môn học"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {/* Lưu trữ / Khôi phục */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleToggleArchive(subject)}
                            className="size-8 p-0 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                            title={isArchived ? 'Kích hoạt lại môn học' : 'Lưu trữ môn học'}
                          >
                            {isArchived ? (
                              <ArchiveRestore className="size-3.5" />
                            ) : (
                              <Archive className="size-3.5" />
                            )}
                          </Button>

                          {/* Xóa vĩnh viễn */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setDeletingSubject(subject)}
                            className="size-8 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                            title="Xóa môn học"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM MÔN HỌC MỚI                                                  */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card dark:bg-[#111C2D] border-border text-foreground">
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-foreground">Thêm Môn Học Mới</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Nhập thông tin mã môn, tên môn và mô tả học phần để tạo môn mới trong hệ thống Mầm Học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-code" className="text-foreground font-medium text-xs">
                  Mã môn học <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-code"
                  placeholder="Ví dụ: INT101, WEB302, MATH101"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                  required
                  maxLength={24}
                  className="bg-background border-border font-mono text-sm uppercase"
                />
                <p className="text-[11px] text-muted-foreground">
                  Mã môn gồm 2-24 ký tự in hoa, số hoặc gạch nối. Không dấu cách.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-name" className="text-foreground font-medium text-xs">
                  Tên môn học <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-name"
                  placeholder="Ví dụ: Lập trình Web nâng cao"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  maxLength={120}
                  className="bg-background border-border text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-desc" className="text-foreground font-medium text-xs">
                  Mô tả học phần (Tùy chọn)
                </Label>
                <Textarea
                  id="add-desc"
                  placeholder="Tóm tắt nội dung học phần, mục tiêu hoặc chuẩn đầu ra..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="bg-background border-border text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setIsAddOpen(false)}
                className="border-border text-foreground hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || !addCode.trim() || !addName.trim()}
                className="bg-[#154C99] hover:bg-[#0F3D8A] text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Tạo môn học'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: SỬA MÔN HỌC                                                      */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editingSubject)} onOpenChange={(open) => !open && setEditingSubject(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card dark:bg-[#111C2D] border-border text-foreground">
          <form onSubmit={handleUpdateSubject} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-foreground">Sửa Thông Tin Môn Học</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Cập nhật thông tin chi tiết của môn học trong hệ thống.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-code" className="text-foreground font-medium text-xs">
                  Mã môn học <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-code"
                  placeholder="Mã môn"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  required
                  maxLength={24}
                  className="bg-background border-border font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-foreground font-medium text-xs">
                  Tên môn học <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Tên môn học"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  maxLength={120}
                  className="bg-background border-border text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-foreground font-medium text-xs">
                  Mô tả học phần
                </Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Mô tả học phần..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="bg-background border-border text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setEditingSubject(null)}
                className="border-border text-foreground hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || !editCode.trim() || !editName.trim()}
                className="bg-[#154C99] hover:bg-[#0F3D8A] text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: GÁN / HỦY NHANH GIẢNG VIÊN PHỤ TRÁCH MÔN HỌC                     */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(assigningSubject)}
        onOpenChange={(open) => !open && setAssigningSubject(null)}
      >
        <DialogContent className="sm:max-w-[520px] bg-card dark:bg-[#111C2D] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Users className="size-5 text-[#154C99] dark:text-[#60A5FA]" />
              <span>Phân Công Giảng Viên Phụ Trách</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Môn học: <strong className="text-foreground">{assigningSubject?.name}</strong> (
              <span className="font-mono text-xs">{assigningSubject?.code}</span>)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Danh sách giảng viên hiện đang phụ trách môn */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Giảng viên đang phụ trách ({assigningSubject?.assignedTeachers.length ?? 0})
              </Label>

              {assigningSubject?.assignedTeachers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Chưa có giảng viên nào được phân công phụ trách môn này.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-border p-2 bg-muted/20">
                  {assigningSubject?.assignedTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-card dark:bg-[#0A275C]/40 border border-border/80 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-full bg-[#154C99]/15 text-[#154C99] dark:bg-blue-900/50 dark:text-blue-200 text-xs font-bold">
                          {teacher.name.charAt(0)}
                        </span>
                        <span className="text-sm font-medium text-foreground">{teacher.name}</span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleUnassignTeacher(teacher.id)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Gỡ phân công môn học này"
                      >
                        <UserMinus className="size-3.5 mr-1" />
                        Gỡ
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form chọn thêm giảng viên mới */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="teacher-select" className="text-xs font-semibold text-foreground">
                Gán thêm giảng viên
              </Label>
              <div className="flex gap-2">
                <select
                  id="teacher-select"
                  value={selectedTeacherIdToAssign}
                  onChange={(e) => setSelectedTeacherIdToAssign(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#154C99]"
                >
                  <option value="">-- Chọn giảng viên từ danh sách trường --</option>
                  {availableTeachers
                    .filter(
                      (teacher) =>
                        !assigningSubject?.assignedTeachers.some((t) => t.id === teacher.id)
                    )
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </select>

                <Button
                  type="button"
                  disabled={isPending || !selectedTeacherIdToAssign}
                  onClick={handleAssignTeacher}
                  className="bg-[#154C99] hover:bg-[#0F3D8A] text-white shrink-0"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="size-4 mr-1.5" />
                      Gán ngay
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Chỉ hiển thị các tài khoản đã được phê duyệt quyền Giảng viên toàn trường.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssigningSubject(null)}
              className="border-border text-foreground hover:bg-muted"
            >
              Hoàn tất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA MÔN HỌC                                             */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(deletingSubject)} onOpenChange={(open) => !open && setDeletingSubject(null)}>
        <DialogContent className="sm:max-w-[440px] bg-card dark:bg-[#111C2D] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="size-5" />
              <span>Xóa Môn Học</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa môn học{' '}
              <strong className="text-foreground">{deletingSubject?.name}</strong> (
              <span className="font-mono text-xs">{deletingSubject?.code}</span>)?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p className="text-red-600/90 dark:text-red-400/90 font-medium">
              Lưu ý quan trọng:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Nếu môn học đã có lớp học hoặc câu hỏi liên quan, hệ thống sẽ từ chối xóa để đảm bảo toàn vẹn dữ liệu. Trong trường hợp đó, bạn nên chọn chức năng <strong>Lưu trữ</strong>.
              </li>
              <li>Thao tác xóa vĩnh viễn không thể khôi phục lại.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeletingSubject(null)}
              className="border-border text-foreground hover:bg-muted"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteSubject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                'Xác nhận xóa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

