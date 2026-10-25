'use client';

import { useState, useTransition, useRef } from 'react';
import {
  CalendarClock,
  FileCheck2,
  FileUp,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAssignmentAction } from '@/app/teacher/classes/[classId]/assignments/actions';

interface CreateAssignmentDialogProps {
  classId: string;
  classNameTitle?: string;
  onSuccess?: () => void;
}

export function CreateAssignmentDialog({
  classId,
  classNameTitle,
  onSuccess,
}: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mặc định hạn nộp là 7 ngày sau lúc 23:59
  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [dueDate, setDueDate] = useState(getDefaultDueDate());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File đính kèm không được vượt quá 50MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    if (selectedFile) {
      formData.set('attachment', selectedFile);
    }

    startTransition(async () => {
      const res = await createAssignmentAction(classId, formData);
      if (res.status === 'success') {
        setOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#17372e] hover:bg-[#122c25] text-white gap-2 font-medium shadow-xs">
          <Plus className="size-4" />
          <span>Giao bài tập mới</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <FileCheck2 className="size-4" />
            <span>Bài tập về nhà {classNameTitle ? `· ${classNameTitle}` : ''}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Tạo và giao bài tập mới
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Giao bài tập tự luận, bài tập lớn hoặc đồ án cho sinh viên trong lớp nộp file (.pdf, .zip, .docx).
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-800">
              Tiêu đề bài tập <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Ví dụ: Bài tập lớn Chương 3 - Phân tích kiến trúc hệ thống"
              required
              disabled={isPending}
              className="text-sm"
            />
          </div>

          {/* Hạn nộp & Thang điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-slate-500" />
                <span>Hạn nộp bài</span> <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                disabled={isPending}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxScore" className="text-xs font-semibold text-slate-800">
                Thang điểm tối đa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="maxScore"
                name="maxScore"
                type="number"
                step="0.5"
                min="1"
                max="100"
                defaultValue="10"
                required
                disabled={isPending}
                className="text-sm"
              />
            </div>
          </div>

          {/* Hướng dẫn & Yêu cầu đề bài */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-slate-800">
              Mô tả & Hướng dẫn làm bài
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Ghi rõ định dạng nộp (.zip, .pdf), yêu cầu nội dung, cấu trúc thư mục, quy định đặt tên file..."
              disabled={isPending}
              className="text-sm"
            />
          </div>

          {/* Đính kèm file đề bài */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Đính kèm file đề bài / Template (Tùy chọn, tối đa 50MB)
            </Label>
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
                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 rounded-xl p-5 text-center transition cursor-pointer"
              >
                <div className="p-2.5 rounded-full bg-slate-100 text-slate-600">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    Bấm để chọn file đề bài (.pdf, .docx, .zip)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dung lượng tối đa 50MB
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileUp className="size-5 text-emerald-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="text-slate-400 hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#17372e] hover:bg-[#122c25] text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Đang tạo...
                </>
              ) : (
                'Giao bài tập'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

