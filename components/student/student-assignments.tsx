'use client';

import { useMemo, useState, useTransition, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  FileUp,
  Loader2,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StudentAssignmentItem } from '@/lib/assignments';
import { submitAssignmentAction } from '@/app/teacher/classes/[classId]/assignments/actions';

interface StudentAssignmentsProps {
  assignments: StudentAssignmentItem[];
}

function formatDateTime(isoString: string) {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StudentAssignments({ assignments }: StudentAssignmentsProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const hasSubmitted = !!a.submission;
      const isGraded = a.submission?.score !== null && a.submission?.score !== undefined;

      if (filter === 'pending') return !hasSubmitted;
      if (filter === 'submitted') return hasSubmitted && !isGraded;
      if (filter === 'graded') return isGraded;
      return true;
    });
  }, [assignments, filter]);

  const pendingCount = assignments.filter((a) => !a.submission).length;
  const gradedCount = assignments.filter((a) => a.submission?.score !== null && a.submission?.score !== undefined).length;

  return (
    <div className="space-y-4">
      {/* Thanh lọc trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#d9e3dc]">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className={
              filter === 'all'
                ? 'bg-[#17372e] hover:bg-[#122c25] text-white text-xs h-8'
                : 'text-slate-600 hover:text-slate-900 text-xs h-8'
            }
          >
            Tất cả ({assignments.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'ghost'}
            onClick={() => setFilter('pending')}
            className={
              filter === 'pending'
                ? 'bg-[#17372e] hover:bg-[#122c25] text-white text-xs h-8'
                : 'text-slate-600 hover:text-slate-900 text-xs h-8'
            }
          >
            Chưa nộp ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'submitted' ? 'default' : 'ghost'}
            onClick={() => setFilter('submitted')}
            className={
              filter === 'submitted'
                ? 'bg-[#17372e] hover:bg-[#122c25] text-white text-xs h-8'
                : 'text-slate-600 hover:text-slate-900 text-xs h-8'
            }
          >
            Chờ chấm ({assignments.length - pendingCount - gradedCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'graded' ? 'default' : 'ghost'}
            onClick={() => setFilter('graded')}
            className={
              filter === 'graded'
                ? 'bg-[#17372e] hover:bg-[#122c25] text-white text-xs h-8'
                : 'text-slate-600 hover:text-slate-900 text-xs h-8'
            }
          >
            Đã có điểm ({gradedCount})
          </Button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Đã hoàn thành <strong>{assignments.length - pendingCount}</strong> / {assignments.length} bài
        </div>
      </div>

      {/* Danh sách bài tập */}
      {filteredAssignments.length === 0 ? (
        <Card className="border-dashed border-2 border-[#d9e3dc] p-10 text-center bg-white/70">
          <div className="mx-auto size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <FileCheck2 className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Không có bài tập nào trong mục này</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Tuyệt vời! Bạn không còn bài tập nào chưa nộp hoặc chưa có bài tập mới được giao.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const submission = assignment.submission;
            const isGraded = submission?.score !== null && submission?.score !== undefined;
            const isOverdue = new Date() > new Date(assignment.due_date);
            const isUploadOpen = activeUploadId === assignment.id;

            return (
              <Card
                key={assignment.id}
                className="border-[#d9e3dc] bg-white hover:border-emerald-300 transition-all shadow-xs overflow-hidden"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px]">
                        {assignment.class_name}
                      </Badge>
                      {assignment.subject_name && (
                        <span className="text-xs text-slate-500">{assignment.subject_name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isGraded ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1">
                          <CheckCircle2 className="size-3" />
                          Điểm: {submission?.score} / {assignment.max_score}
                        </Badge>
                      ) : submission ? (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 text-[11px] gap-1">
                          <Clock className="size-3" />
                          Đã nộp (Chờ chấm)
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 text-[11px] gap-1">
                          <AlertTriangle className="size-3" />
                          Quá hạn nộp
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[11px] gap-1">
                          <Clock className="size-3" />
                          Chưa nộp
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {assignment.title}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <CalendarClock className="size-3.5 text-slate-400" />
                          <span>
                            Hạn nộp: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                              {formatDateTime(assignment.due_date)}
                            </strong>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>Thang điểm: <strong>{assignment.max_score}</strong></span>
                        </p>
                      </div>

                      {/* Nút đính kèm đề bài của Giảng viên */}
                      {assignment.attachment_url && (
                        <a
                          href={assignment.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 transition shrink-0"
                        >
                          <Download className="size-3.5" />
                          <span>Tải đề bài: {assignment.attachment_name || 'Đề bài'}</span>
                        </a>
                      )}
                    </div>

                    {assignment.description && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  {/* Kết quả chấm điểm (Nếu đã chấm) */}
                  {isGraded && (
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <Award className="size-4 text-emerald-700" />
                        <span>Kết quả chấm điểm: {submission?.score} / {assignment.max_score} điểm</span>
                        {submission?.is_late && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0">
                            Nộp muộn
                          </Badge>
                        )}
                      </div>
                      {submission?.feedback ? (
                        <p className="text-xs text-slate-700 leading-relaxed italic bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                          &quot;{submission.feedback}&quot;
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Giảng viên không để lại lời nhận xét.</p>
                      )}
                    </div>
                  )}

                  {/* Thông tin bài đã nộp */}
                  {submission && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck2 className="size-4 text-emerald-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {submission.file_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Nộp lúc: {formatDateTime(submission.submitted_at)}
                            {submission.file_size_bytes && ` · ${formatFileSize(submission.file_size_bytes)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={submission.file_name}
                          className="inline-flex items-center gap-1 text-xs text-emerald-800 font-semibold hover:underline bg-white px-2.5 py-1 rounded border border-slate-200"
                        >
                          <Download className="size-3" />
                          <span>Tải bài làm</span>
                        </a>

                        {!isGraded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveUploadId(isUploadOpen ? null : assignment.id)}
                            className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                          >
                            {isUploadOpen ? 'Đóng form' : 'Nộp lại bài'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Form Nộp bài tập (Hiện khi chưa nộp hoặc khi bấm "Nộp lại bài") */}
                  {(!submission || isUploadOpen) && (
                    <StudentSubmissionForm
                      assignment={assignment}
                      onSuccess={() => setActiveUploadId(null)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentSubmissionForm({
  assignment,
  onSuccess,
}: {
  assignment: StudentAssignmentItem;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File nộp không được vượt quá 50MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn file bài làm (.zip, .pdf, .docx...).');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set('file', selectedFile);
    formData.set('note', note);

    startTransition(async () => {
      const res = await submitAssignmentAction(
        assignment.id,
        assignment.class_id,
        formData
      );
      if (res.status === 'success') {
        setSuccessMessage(res.message);
        setSelectedFile(null);
        setNote('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#17372e] flex items-center gap-1.5">
          <Upload className="size-4 text-emerald-700" />
          <span>{assignment.submission ? 'Nộp lại bài tập' : 'Khu vực nộp bài tập'}</span>
        </p>
        <span className="text-[11px] text-slate-500">Định dạng hỗ trợ: .pdf, .docx, .zip, .rar</span>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Upload file */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isPending}
            className="hidden"
            accept=".pdf,.doc,.docx,.zip,.rar"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full flex flex-col items-center justify-center gap-1.5 border border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 rounded-lg p-3 text-center transition cursor-pointer h-[80px]"
            >
              <FileUp className="size-4 text-emerald-700" />
              <p className="text-xs font-medium text-slate-700">
                Chọn file bài làm (.zip, .pdf, .docx)
              </p>
            </button>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-300 bg-white h-[80px]">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="size-5 text-emerald-700 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedFile(null)}
                disabled={isPending}
                className="text-slate-400 hover:text-destructive"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Ghi chú cho giáo viên */}
        <div className="space-y-1">
          <Textarea
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            placeholder="Lời nhắn gửi giảng viên (nếu có): link repo github, pass giải nén..."
            disabled={isPending}
            className="text-xs h-[80px] resize-none bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !selectedFile}
          className="bg-[#17372e] hover:bg-[#122c25] text-white text-xs gap-1.5 shadow-2xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin mr-1" />
              Đang tải lên...
            </>
          ) : (
            <>
              <Send className="size-3" />
              <span>Nộp bài ngay</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

