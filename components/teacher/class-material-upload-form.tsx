'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Link as LinkIcon,
  LoaderCircle,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { uploadClassMaterialAction } from '@/app/teacher/classes/[classId]/materials/actions';

interface ClassMaterialUploadFormProps {
  classId: string;
}

export function ClassMaterialUploadForm({ classId }: ClassMaterialUploadFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materialType, setMaterialType] = useState<'document' | 'video' | 'link'>('document');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setStatusMessage({ type: 'error', text: 'Dung lượng file không được vượt quá 50 MB.' });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setStatusMessage(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set('materialType', materialType);
    formData.set('weekNumber', String(weekNumber));

    if (materialType === 'document' && selectedFile) {
      formData.set('file', selectedFile);
    }

    try {
      const res = await uploadClassMaterialAction(classId, formData);
      if (res.status === 'success') {
        setStatusMessage({ type: 'success', text: res.message });
        formRef.current?.reset();
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        startTransition(() => {
          router.refresh();
        });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Đã có lỗi bất ngờ xảy ra khi tải tài liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-5 sm:p-6 shadow-xs text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
          <FileUp className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Đăng tải tài liệu học tập</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Bổ sung slide bài giảng, giáo trình PDF/Word hoặc link video bài học</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Toggle Loại tài liệu */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loại tài liệu</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setMaterialType('document');
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                materialType === 'document'
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="size-4" />
              <span>File (PDF / Word)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMaterialType('video');
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                materialType === 'video'
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Video className="size-4" />
              <span>Video bài giảng</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMaterialType('link');
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                materialType === 'link'
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <LinkIcon className="size-4" />
              <span>Link ngoài / Drive</span>
            </button>
          </div>
        </div>

        {/* Tiêu đề & Tuần học */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tiêu đề tài liệu <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="VD: Bài giảng Tuần 1 - Nhập môn Giải tích"
              className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <Label htmlFor="weekSelect" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tuần học <span className="text-red-500">*</span>
            </Label>
            <select
              id="weekSelect"
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="mt-1 flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input File Upload (Nếu là document) */}
        {materialType === 'document' ? (
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chọn File tải lên (PDF, DOCX, PPTX) <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1.5">
              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-5 text-center cursor-pointer transition hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20">
                  <Upload className="size-6 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Bấm để chọn file hoặc kéo thả tài liệu vào đây
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Hỗ trợ định dạng .pdf, .docx, .doc, .pptx (Tối đa 50 MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.pptx,.ppt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-emerald-950 dark:text-emerald-100">{selectedFile.name}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 hover:text-slate-700 transition"
                    title="Gỡ file"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Input URL (Nếu là Video hoặc Link) */
          <div>
            <Label htmlFor="videoUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {materialType === 'video' ? 'Đường dẫn Video (YouTube, Vimeo, Drive...)' : 'Đường dẫn liên kết ngoài'} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              required
              type="url"
              placeholder="https://www.youtube.com/watch?v=... hoặc https://drive.google.com/..."
              className="mt-1 h-9 rounded-xl text-xs font-mono dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        )}

        {/* Mô tả / Ghi chú */}
        <div>
          <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mô tả tóm tắt (Tùy chọn)
          </Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Ghi chú thêm về nội dung cần lưu ý cho sinh viên khi ôn tập..."
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
        </div>

        {/* Thông báo kết quả */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || (materialType === 'document' && !selectedFile)}
            className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span>{isSubmitting ? 'Đang lưu tài liệu...' : 'Đăng tải tài liệu'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

