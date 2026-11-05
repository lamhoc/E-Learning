'use client';

import { useState } from 'react';
import {
  BookOpen,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Film,
  PlaySquare,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ClassMaterialItem } from '@/lib/class-materials';
import type { StudentClass } from '@/lib/student-dashboard';

function getMaterialIcon(materialType: string, mimeType?: string | null) {
  if (materialType === 'video') {
    return <Film className="size-5 text-indigo-500" />;
  }
  if (mimeType?.includes('pdf')) {
    return <FileText className="size-5 text-rose-500" />;
  }
  if (mimeType?.includes('word') || mimeType?.includes('officedocument')) {
    return <FileText className="size-5 text-blue-500" />;
  }
  return <FileText className="size-5 text-emerald-500" />;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentClassMaterials({
  classes,
  materials,
}: {
  classes: StudentClass[];
  materials: ClassMaterialItem[];
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || ''
  );
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc tài liệu theo Lớp được chọn
  const classMaterials = materials.filter(
    (m) => m.classId === selectedClassId
  );

  // Danh sách các tuần có tài liệu
  const availableWeeks = Array.from(
    new Set(classMaterials.map((m) => m.weekNumber))
  ).sort((a, b) => a - b);

  // Lọc tài liệu theo Tuần & Từ khóa tìm kiếm
  const filteredMaterials = classMaterials.filter((m) => {
    if (selectedWeek !== 'all' && m.weekNumber !== Number(selectedWeek)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q) ?? false;
      const matchFile = m.fileName?.toLowerCase().includes(q) ?? false;
      return matchTitle || matchDesc || matchFile;
    }
    return true;
  });

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

  if (classes.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-8 text-center">
        <BookOpen className="size-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Bạn chưa được ghi danh vào lớp học nào để xem tài liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh chọn lớp & Tìm kiếm */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Chọn lớp học */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Lớp:</span>
          {classes.map((c) => {
            const isSelected = c.id === selectedClassId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(c.id);
                  setSelectedWeek('all');
                }}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30'
                    : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {c.name} ({c.class_code})
              </button>
            );
          })}
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài liệu, bài giảng..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#154C99] focus:outline-none focus:ring-1 focus:ring-[#154C99]"
          />
        </div>
      </div>

      {/* Lọc theo tuần */}
      {availableWeeks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Tuần học:</span>
          <button
            type="button"
            onClick={() => setSelectedWeek('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              selectedWeek === 'all'
                ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả
          </button>
          {availableWeeks.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWeek(w.toString())}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedWeek === w.toString()
                  ? '!bg-blue-600 !text-white shadow-md shadow-blue-600/30'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Tuần {w}
            </button>
          ))}
        </div>
      )}

      {/* Danh sách Tài liệu */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] py-14 text-center">
          <FileCheck className="size-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {classMaterials.length === 0
              ? 'Giảng viên chưa đăng tải tài liệu nào cho lớp này'
              : 'Không tìm thấy tài liệu phù hợp với bộ lọc'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Tài liệu mới (slide, bài tập, video) sẽ hiển thị tại đây ngay khi giảng viên đăng lên.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] p-4 transition hover:border-[#154C99]/50 hover:shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      {getMaterialIcon(item.materialType, item.mimeType)}
                    </span>
                    <Badge variant="outline" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                      Tuần {item.weekNumber}
                    </Badge>
                  </div>
                  {item.fileSizeBytes && (
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {formatFileSize(item.fileSizeBytes)}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{item.title}</h4>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formatDate(item.createdAt)}
                </span>

                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={item.materialType === 'document' ? item.fileName || true : undefined}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#154C99]/20 dark:border-blue-800/50 bg-[#154C99]/10 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-[#154C99] dark:text-blue-300 hover:bg-[#154C99]/20 dark:hover:bg-blue-900/60 transition shadow-2xs"
                >
                  {item.materialType === 'document' ? (
                    <>
                      <Download className="size-3.5" />
                      <span>Tải về</span>
                    </>
                  ) : item.materialType === 'video' ? (
                    <>
                      <PlaySquare className="size-3.5" />
                      <span>Xem video</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="size-3.5" />
                      <span>Mở link</span>
                    </>
                  )}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
