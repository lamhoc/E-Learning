'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FileUp,
  FolderOpen,
  Globe,
  GraduationCap,
  Layers,
  Link as LinkIcon,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { TeacherClassSummary, TeacherMaterialItem } from '@/lib/teacher-materials';
import {
  uploadClassMaterialAction,
  deleteClassMaterialAction,
} from '@/app/teacher/classes/[classId]/materials/actions';

interface TeacherMaterialsClientProps {
  classes: TeacherClassSummary[];
  materials: TeacherMaterialItem[];
  stats: {
    totalMaterials: number;
    totalClasses: number;
    documentCount: number;
    videoCount: number;
    linkCount: number;
  };
}

export function TeacherMaterialsClient({
  classes,
  materials,
  stats,
}: TeacherMaterialsClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || '');
  const [materialType, setMaterialType] = useState<'document' | 'video' | 'link'>('document');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    if (selectedClassId !== 'all' && m.classId !== selectedClassId) return false;
    if (selectedWeek !== 'all' && m.weekNumber !== selectedWeek) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchClass = m.className.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchClass) return false;
    }
    return true;
  });

  // Unique weeks in filtered or all
  const availableWeeks = Array.from(new Set(materials.map((m) => m.weekNumber))).sort((a, b) => a - b);

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

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const getMaterialIcon = (type: string, mime?: string | null) => {
    if (type === 'video') {
      return <Video className="size-5 text-purple-600 dark:text-purple-400" />;
    }
    if (type === 'link') {
      return <Globe className="size-5 text-sky-600 dark:text-sky-400" />;
    }
    if (mime?.includes('pdf')) {
      return <FileText className="size-5 text-red-600 dark:text-red-400" />;
    }
    return <FileText className="size-5 text-blue-600 dark:text-blue-400" />;
  };

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetClassId) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn lớp học tiếp nhận tài liệu.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set('materialType', materialType);
    formData.set('weekNumber', String(weekNumber));

    if (materialType === 'document' && selectedFile) {
      formData.set('file', selectedFile);
    }

    try {
      const res = await uploadClassMaterialAction(targetClassId, formData);
      if (res.status === 'success') {
        setStatusMessage({ type: 'success', text: res.message });
        formRef.current?.reset();
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => {
          setIsUploadOpen(false);
          setStatusMessage(null);
        }, 1200);
        startTransition(() => {
          router.refresh();
        });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Đã có lỗi bất ngờ xảy ra khi tải tài liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (materialId: string, classId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${title}" không? Sinh viên lớp này sẽ không còn xem được tài liệu này nữa.`)) {
      return;
    }

    setDeletingId(materialId);
    try {
      const res = await deleteClassMaterialAction(materialId, classId);
      if (res.status === 'success') {
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(res.message);
      }
    } catch {
      alert('Không thể xóa tài liệu.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. THẺ THỐNG KÊ ĐẦU TRANG ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#154C99] dark:bg-blue-950/40 dark:text-blue-400">
              <FileText className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tổng tài liệu
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.totalMaterials}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Lớp phụ trách
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.totalClasses}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
              <FileUp className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tài liệu File (PDF/Doc)
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.documentCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <Video className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Video & Link ngoài
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.videoCount + stats.linkCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. THANH CÔNG CỤ TÌM KIẾM, LỌC & NÚT ĐĂNG TẢI ── */}
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

          {/* Ô tìm kiếm tiêu đề */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Nút Mở Modal Đăng tải tài liệu */}
        <Button
          onClick={() => {
            setIsUploadOpen(true);
            setStatusMessage(null);
          }}
          className="gap-2 rounded-xl bg-[#154C99] text-white hover:bg-[#103E7E] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs"
        >
          <Plus className="size-4" />
          <span>Đăng tải tài liệu mới</span>
        </Button>
      </div>

      {/* ── 3. DANH SÁCH LỌC THEO TUẦN ── */}
      {availableWeeks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="size-3.5" /> Lọc theo tuần:
          </span>
          <button
            type="button"
            onClick={() => setSelectedWeek('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              selectedWeek === 'all'
                ? 'bg-[#154C99] text-white shadow-xs'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả các tuần
          </button>
          {availableWeeks.map((week) => (
            <button
              key={week}
              type="button"
              onClick={() => setSelectedWeek(week)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedWeek === week
                  ? 'bg-[#154C99] text-white shadow-xs'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Tuần {week}
            </button>
          ))}
        </div>
      )}

      {/* ── 4. DANH SÁCH TÀI LIỆU ── */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] py-16 text-center shadow-xs">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <FileCheck className="size-6" />
          </span>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Chưa có tài liệu nào phù hợp
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {materials.length === 0
              ? 'Bạn chưa đăng tài liệu nào cho các lớp học. Bấm "Đăng tải tài liệu mới" để bổ sung bài giảng.'
              : 'Không tìm thấy tài liệu nào khớp với bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4 text-slate-900 dark:text-slate-100 transition hover:border-[#154C99]/40 hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Info Block */}
              <div className="flex items-start gap-3.5 min-w-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800/90 shadow-2xs">
                  {getMaterialIcon(item.materialType, item.mimeType)}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-[#154C99] dark:text-blue-300 text-[10px] font-bold">
                      Tuần {item.weekNumber}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[10px]">
                      {item.className}
                    </Badge>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[320px] sm:max-w-md">
                      {item.title}
                    </h4>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                    {item.fileSizeBytes && <span>{formatFileSize(item.fileSizeBytes)}</span>}
                    {item.fileName && (
                      <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {item.fileName}
                      </span>
                    )}
                    <span>Đăng ngày: {formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#154C99] dark:hover:text-blue-400 transition shadow-2xs"
                >
                  {item.materialType === 'document' ? (
                    <>
                      <Download className="size-3.5" />
                      <span>Tải về</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="size-3.5" />
                      <span>Mở link</span>
                    </>
                  )}
                </a>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.classId, item.title)}
                  disabled={deletingId === item.id}
                  className="grid size-8 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-400 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition shadow-2xs"
                  title="Xóa tài liệu"
                >
                  {deletingId === item.id ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. MODAL ĐĂNG TẢI TÀI LIỆU MỚI ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-[#154C99] dark:text-blue-300">
                  <FileUp className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Đăng tải tài liệu học tập
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phân phối slide bài giảng, file PDF/Word hoặc link video cho sinh viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form ref={formRef} onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Chọn Lớp học */}
              <div>
                <Label htmlFor="targetClass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lớp học tiếp nhận tài liệu <span className="text-red-500">*</span>
                </Label>
                <select
                  id="targetClass"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
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

              {/* Loại tài liệu */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Loại tài liệu
                </Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialType('document');
                      setStatusMessage(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-semibold transition ${
                      materialType === 'document'
                        ? 'border-[#154C99] bg-blue-50/70 text-[#154C99] ring-1 ring-[#154C99] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="size-4" />
                    <span>File tài liệu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMaterialType('video');
                      setStatusMessage(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-semibold transition ${
                      materialType === 'video'
                        ? 'border-[#154C99] bg-blue-50/70 text-[#154C99] ring-1 ring-[#154C99] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
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
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-semibold transition ${
                      materialType === 'link'
                        ? 'border-[#154C99] bg-blue-50/70 text-[#154C99] ring-1 ring-[#154C99] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <LinkIcon className="size-4" />
                    <span>Link Drive / Web</span>
                  </button>
                </div>
              </div>

              {/* Tiêu đề & Tuần học */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="matTitle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tiêu đề tài liệu <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="matTitle"
                    name="title"
                    required
                    placeholder="VD: Bài giảng Tuần 1 - Tổng quan môn học"
                    className="mt-1 h-9 rounded-xl text-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <Label htmlFor="matWeek" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tuần học <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="matWeek"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="mt-1 flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 shadow-2xs focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99]"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Tuần {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File upload hoặc Link URL */}
              {materialType === 'document' ? (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    File tải lên (PDF, DOCX, PPTX, ZIP) <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-1.5">
                    {!selectedFile ? (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-5 text-center cursor-pointer transition hover:border-[#154C99] dark:hover:border-blue-400 hover:bg-blue-50/20">
                        <Upload className="size-6 text-slate-400" />
                        <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          Bấm để chọn file hoặc kéo thả tài liệu vào đây
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          Hỗ trợ định dạng .pdf, .docx, .pptx, .zip (Tối đa 50 MB)
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc,.pptx,.ppt,.zip,.rar"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 p-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#154C99] text-white">
                            <FileText className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900 dark:text-white">{selectedFile.name}</p>
                            <p className="text-[11px] text-[#154C99] dark:text-blue-300">{formatFileSize(selectedFile.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="rounded-lg p-1 text-slate-400 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-slate-700 transition"
                          title="Gỡ file"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="matUrl" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {materialType === 'video' ? 'Đường dẫn Video bài giảng (YouTube, Vimeo...)' : 'Đường dẫn liên kết ngoài (Google Drive, Dropbox...)'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="matUrl"
                    name="videoUrl"
                    required
                    type="url"
                    placeholder="https://..."
                    className="mt-1 h-9 rounded-xl text-xs font-mono dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Mô tả */}
              <div>
                <Label htmlFor="matDesc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mô tả / Ghi chú (Tùy chọn)
                </Label>
                <textarea
                  id="matDesc"
                  name="description"
                  rows={2}
                  placeholder="Ghi chú thêm về nội dung cần sinh viên lưu ý khi đọc tài liệu..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99] shadow-2xs"
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
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Nút Submit */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-xl dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (materialType === 'document' && !selectedFile)}
                  className="gap-2 rounded-xl bg-[#154C99] text-white hover:bg-[#103E7E] dark:bg-[#1E5BBB] dark:hover:bg-[#154C99] shadow-xs"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  <span>{isSubmitting ? 'Đang lưu tài liệu...' : 'Đăng tải tài liệu'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

