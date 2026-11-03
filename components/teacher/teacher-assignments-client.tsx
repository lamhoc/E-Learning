'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FileUp,
  FolderOpen,
  GraduationCap,
  Layers,
  LoaderCircle,
  Paperclip,
  PenTool,
  Plus,
  Save,
  Search,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { TeacherClassSummary, TeacherAssignmentItem } from '@/lib/teacher-all-assignments';
import type { AssignmentSubmission } from '@/lib/assignments';
import {
  createAssignmentAction,
  gradeAssignmentSubmissionAction,
} from '@/app/teacher/classes/[classId]/assignments/actions';

interface TeacherAssignmentsClientProps {
  classes: TeacherClassSummary[];
  assignments: TeacherAssignmentItem[];
  stats: {
    totalAssignments: number;
    totalSubmissions: number;
    pendingGradingCount: number;
    gradedCount: number;
  };
}

export function TeacherAssignmentsClient({
  classes,
  assignments,
  stats,
}: TeacherAssignmentsClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Assignment Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createClassId, setCreateClassId] = useState<string>(classes[0]?.id || '');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  // Grading Modal / Drawer
  const [activeAssignmentForGrading, setActiveAssignmentForGrading] = useState<TeacherAssignmentItem | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const [savingSubId, setSavingSubId] = useState<string | null>(null);
  const [gradingMsg, setGradingMsg] = useState<string | null>(null);

  // Filtered assignments list
  const filteredAssignments = assignments.filter((a) => {
    if (selectedClassId !== 'all' && a.class_id !== selectedClassId) return false;
    if (statusFilter === 'pending' && a.pending_count === 0) return false;
    if (statusFilter === 'graded' && a.pending_count > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchClass = a.class_name.toLowerCase().includes(q);
      const matchSubject = a.subject_name.toLowerCase().includes(q);
      if (!matchTitle && !matchClass && !matchSubject) return false;
    }
    return true;
  });

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle Create Assignment
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createClassId) {
      setCreateMsg({ type: 'error', text: 'Vui lòng chọn lớp học tiếp nhận bài tập.' });
      return;
    }

    setIsSubmittingCreate(true);
    setCreateMsg(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createAssignmentAction(createClassId, formData);
      if (res.status === 'success') {
        setCreateMsg({ type: 'success', text: res.message });
        createFormRef.current?.reset();
        setTimeout(() => {
          setIsCreateOpen(false);
          setCreateMsg(null);
        }, 1200);
        startTransition(() => {
          router.refresh();
        });
      } else {
        setCreateMsg({ type: 'error', text: res.message });
      }
    } catch {
      setCreateMsg({ type: 'error', text: 'Đã có lỗi bất ngờ xảy ra khi tạo bài tập.' });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Grading Drawer
  const handleOpenGrading = (assignment: TeacherAssignmentItem) => {
    setActiveAssignmentForGrading(assignment);
    const initialMap: Record<string, { score: string; feedback: string }> = {};
    assignment.submissions.forEach((s) => {
      initialMap[s.id] = {
        score: s.score !== null ? String(s.score) : '',
        feedback: s.feedback || '',
      };
    });
    setGradingScores(initialMap);
    setGradingMsg(null);
  };

  // Handle Save Single Grade
  const handleSaveGrade = async (sub: AssignmentSubmission) => {
    if (!activeAssignmentForGrading) return;
    const gradeData = gradingScores[sub.id] || { score: '', feedback: '' };

    if (!gradeData.score.trim()) {
      alert('Vui lòng nhập điểm số trước khi lưu.');
      return;
    }

    const numScore = Number(gradeData.score);
    if (isNaN(numScore) || numScore < 0 || numScore > activeAssignmentForGrading.max_score) {
      alert(`Điểm số phải là số từ 0 đến ${activeAssignmentForGrading.max_score}.`);
      return;
    }

    setSavingSubId(sub.id);
    setGradingMsg(null);

    const formData = new FormData();
    formData.set('score', gradeData.score);
    formData.set('feedback', gradeData.feedback);

    try {
      const res = await gradeAssignmentSubmissionAction(
        activeAssignmentForGrading.class_id,
        activeAssignmentForGrading.id,
        sub.id,
        formData
      );

      if (res.status === 'success') {
        // Update local object to reflect immediately
        sub.score = numScore;
        sub.feedback = gradeData.feedback;
        setGradingMsg(`Đã lưu điểm thành công cho sinh viên ${sub.student?.full_name || ''}!`);
        setTimeout(() => setGradingMsg(null), 3000);
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(res.message);
      }
    } catch {
      alert('Không thể lưu điểm bài nộp.');
    } finally {
      setSavingSubId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. THỐNG KÊ ĐẦU TRANG ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#154C99] dark:bg-blue-950/40 dark:text-blue-400">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tổng bài tập
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.totalAssignments}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <PenTool className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Bài chờ chấm điểm
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {stats.pendingGradingCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Bài đã chấm điểm
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {stats.gradedCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tổng bài đã nộp
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.totalSubmissions}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. THANH CÔNG CỤ TÌM KIẾM, LỌC & NÚT TẠO MỚI ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Lọc theo Lớp */}
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99]"
            >
              <option value="all">Tất cả lớp học ({classes.length})</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.subject_name || cls.class_code})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái chấm */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99]"
            >
              <option value="all">Tất cả bài tập</option>
              <option value="pending">Có bài chờ chấm</option>
              <option value="graded">Đã chấm xong</option>
            </select>
          </div>

          {/* Ô tìm kiếm tiêu đề */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Nút Giao bài tập mới */}
        <Button
          onClick={() => {
            setIsCreateOpen(true);
            setCreateMsg(null);
          }}
          className="gap-2 rounded-xl bg-[#154C99] text-white hover:bg-[#103E7E] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs"
        >
          <Plus className="size-4" />
          <span>Giao bài tập mới</span>
        </Button>
      </div>

      {/* ── 3. DANH SÁCH BÀI TẬP ĐÃ GIAO ── */}
      {filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] py-16 text-center shadow-xs">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <ClipboardList className="size-6" />
          </span>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Chưa có bài tập nào phù hợp
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {assignments.length === 0
              ? 'Bạn chưa giao bài tập về nhà nào cho sinh viên. Bấm "Giao bài tập mới" để bắt đầu.'
              : 'Không tìm thấy bài tập nào khớp với bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map((a) => {
            const isDuePassed = new Date() > new Date(a.due_date);
            return (
              <Card
                key={a.id}
                className="flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 shadow-xs transition hover:border-[#154C99]/40 hover:shadow-md"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-[#154C99] dark:text-blue-300 text-[10px] font-bold">
                      {a.class_name}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="size-3" />
                      {isDuePassed ? 'Hết hạn:' : 'Hạn nộp:'} {formatDate(a.due_date)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {a.description || 'Không có mô tả chi tiết cho bài tập này.'}
                    </p>
                  </div>

                  {/* Attachment if exists */}
                  {a.attachment_url && (
                    <a
                      href={a.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-[#154C99] dark:text-blue-300 hover:underline truncate max-w-full"
                    >
                      <Paperclip className="size-3 shrink-0" />
                      <span className="truncate">{a.attachment_name || 'Đề bài đính kèm'}</span>
                    </a>
                  )}

                  {/* Submissions Stats Strip */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5 text-center border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Đã nộp</p>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {a.submission_count}
                        <span className="text-[10px] font-normal text-slate-400">
                          {a.total_students > 0 ? `/${a.total_students}` : ''}
                        </span>
                      </p>
                    </div>

                    <div className="border-x border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">Chờ chấm</p>
                      <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                        {a.pending_count}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Đã chấm</p>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {a.graded_count}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleOpenGrading(a)}
                    className="w-full gap-2 rounded-xl bg-[#154C99] text-white hover:bg-[#103E7E] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs text-xs"
                  >
                    <PenTool className="size-3.5" />
                    <span>Xem & Chấm bài ({a.submission_count})</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── 4. MODAL GIAO BÀI TẬP MỚI ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-[#154C99] dark:text-blue-300">
                  <ClipboardList className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Giao bài tập về nhà mới
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Đặt hạn nộp bài, thang điểm và tài liệu đính kèm cho lớp học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form */}
            <form ref={createFormRef} onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Lớp nhận bài tập */}
              <div>
                <Label htmlFor="createClass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lớp học nhận bài tập <span className="text-red-500">*</span>
                </Label>
                <select
                  id="createClass"
                  value={createClassId}
                  onChange={(e) => setCreateClassId(e.target.value)}
                  required
                  className="mt-1 flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99]"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.subject_name || cls.class_code}) - Niên khóa {cls.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu đề bài tập */}
              <div>
                <Label htmlFor="assignTitle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tiêu đề bài tập <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="assignTitle"
                  name="title"
                  required
                  placeholder="VD: Bài tập Tuần 3 - Giải bài toán tối ưu tuyến tính"
                  className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {/* Hạn nộp & Thang điểm */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dueDate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hạn nộp bài (Deadline) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="datetime-local"
                    required
                    className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <Label htmlFor="maxScore" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Thang điểm tối đa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="maxScore"
                    name="maxScore"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue="10"
                    required
                    className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Nội dung hướng dẫn */}
              <div>
                <Label htmlFor="assignDesc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung yêu cầu & Hướng dẫn làm bài
                </Label>
                <textarea
                  id="assignDesc"
                  name="description"
                  rows={3}
                  placeholder="Mô tả chi tiết câu hỏi, các bước thực hiện và tiêu chuẩn chấm điểm..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99] shadow-2xs"
                />
              </div>

              {/* File đính kèm đề bài */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  File đính kèm đề bài (Tùy chọn: PDF, DOCX, ZIP)
                </Label>
                <Input
                  type="file"
                  name="attachment"
                  accept=".pdf,.docx,.doc,.zip,.rar,.pptx"
                  className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100 cursor-pointer"
                />
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Tải lên file đề cương, biểu mẫu hoặc dữ liệu mẫu cho sinh viên (Tối đa 50MB)
                </p>
              </div>

              {/* Status Message */}
              {createMsg && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                    createMsg.type === 'success'
                      ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  }`}
                >
                  {createMsg.type === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span>{createMsg.text}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="gap-2 rounded-xl bg-[#154C99] text-white hover:bg-[#103E7E] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs"
                >
                  {isSubmittingCreate ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span>{isSubmittingCreate ? 'Đang tạo bài tập...' : 'Tạo và giao bài tập'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. MODAL / DRAWER CHẤM ĐIỂM BÀI NỘP CỦA SINH VIÊN ── */}
      {activeAssignmentForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-[#154C99] dark:text-blue-300 text-[10px]">
                    {activeAssignmentForGrading.class_name}
                  </Badge>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Thang điểm: <strong>{activeAssignmentForGrading.max_score} điểm</strong>
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  Chấm bài: {activeAssignmentForGrading.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveAssignmentForGrading(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Notification alert if saved */}
            {gradingMsg && (
              <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <Check className="size-4 shrink-0 text-emerald-600" />
                <span>{gradingMsg}</span>
              </div>
            )}

            {/* Submissions List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {activeAssignmentForGrading.submissions.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
                  Chưa có sinh viên nào nộp bài cho bài tập này.
                </div>
              ) : (
                activeAssignmentForGrading.submissions.map((sub) => {
                  const currentData = gradingScores[sub.id] || { score: '', feedback: '' };
                  const isGraded = sub.score !== null;

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 transition hover:border-[#154C99]/30 space-y-3"
                    >
                      {/* Student Info & File Link */}
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950 text-[#154C99] dark:text-blue-300 font-bold text-xs">
                            {sub.student?.full_name ? sub.student.full_name[0].toUpperCase() : 'SV'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-slate-900 dark:text-white">
                                {sub.student?.full_name || 'Sinh viên'}
                              </p>
                              {sub.student?.student_code && (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {sub.student.student_code}
                                </Badge>
                              )}
                              <Badge
                                className={
                                  sub.is_late
                                    ? 'border-amber-200 bg-amber-50 text-amber-800 text-[10px] dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] dark:bg-emerald-950/40 dark:text-emerald-300'
                                }
                              >
                                {sub.is_late ? 'Nộp muộn' : 'Đúng hạn'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              Nộp lúc: {formatDate(sub.submitted_at)}
                            </p>
                          </div>
                        </div>

                        {/* File Bài làm của Sinh viên */}
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#154C99] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition shadow-2xs"
                        >
                          <Download className="size-3.5" />
                          <span className="truncate max-w-[180px]">{sub.file_name}</span>
                          {sub.file_size_bytes && (
                            <span className="text-[10px] opacity-75">
                              ({formatFileSize(sub.file_size_bytes)})
                            </span>
                          )}
                        </a>
                      </div>

                      {/* Note if student added */}
                      {sub.note && (
                        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-2.5 text-xs text-slate-600 dark:text-slate-400">
                          <strong>Ghi chú của sinh viên:</strong> {sub.note}
                        </p>
                      )}

                      {/* Grading Form Row */}
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                        {/* Score Input */}
                        <div className="w-full sm:w-32">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Điểm số (/{activeAssignmentForGrading.max_score})
                          </Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max={activeAssignmentForGrading.max_score}
                            placeholder="VD: 9.5"
                            value={currentData.score}
                            onChange={(e) =>
                              setGradingScores((prev) => ({
                                ...prev,
                                [sub.id]: { ...currentData, score: e.target.value },
                              }))
                            }
                            className="mt-0.5 h-8 rounded-lg text-xs font-mono font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        {/* Feedback Input */}
                        <div className="flex-1">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Nhận xét / Lời khuyên
                          </Label>
                          <Input
                            type="text"
                            placeholder="Nhận xét ưu điểm, lỗi sai cần lưu ý..."
                            value={currentData.feedback}
                            onChange={(e) =>
                              setGradingScores((prev) => ({
                                ...prev,
                                [sub.id]: { ...currentData, feedback: e.target.value },
                              }))
                            }
                            className="mt-0.5 h-8 rounded-lg text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          />
                        </div>

                        {/* Save Button */}
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingSubId === sub.id}
                          onClick={() => handleSaveGrade(sub)}
                          className={`mt-4 sm:mt-auto h-8 gap-1.5 rounded-lg text-xs text-white shadow-2xs ${
                            isGraded
                              ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
                              : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                          }`}
                        >
                          {savingSubId === sub.id ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Save className="size-3.5" />
                          )}
                          <span>{isGraded ? 'Cập nhật điểm' : 'Lưu điểm'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 px-5 py-3">
              <Button
                variant="outline"
                onClick={() => setActiveAssignmentForGrading(null)}
                className="rounded-xl text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Đóng danh sách
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

