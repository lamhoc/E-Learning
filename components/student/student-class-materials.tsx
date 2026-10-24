'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Globe,
  PlaySquare,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StudentClass } from '@/lib/student-dashboard';
import type { ClassMaterialItem } from '@/lib/class-materials';

interface StudentClassMaterialsProps {
  classes: StudentClass[];
  materials: ClassMaterialItem[];
}

export function StudentClassMaterials({
  classes,
  materials,
}: StudentClassMaterialsProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return classes[0]?.id || '';
  });
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc tài liệu theo lớp đang chọn
  const classMaterials = useMemo(() => {
    return materials.filter((m) => m.classId === selectedClassId);
  }, [materials, selectedClassId]);

  // Lọc theo tuần và từ khóa
  const filteredMaterials = useMemo(() => {
    return classMaterials.filter((m) => {
      const matchWeek = selectedWeek === 'all' || m.weekNumber === selectedWeek;
      const matchQuery =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.fileName && m.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchWeek && matchQuery;
    });
  }, [classMaterials, selectedWeek, searchQuery]);

  // Danh sách các tuần của lớp đang chọn
  const availableWeeks = useMemo(() => {
    return Array.from(new Set(classMaterials.map((m) => m.weekNumber))).sort((a, b) => a - b);
  }, [classMaterials]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const getMaterialIcon = (type: string, mime?: string | null) => {
    if (type === 'video') {
      return <Video className="size-5 text-purple-600" />;
    }
    if (type === 'link') {
      return <Globe className="size-5 text-sky-600" />;
    }
    if (mime?.includes('pdf')) {
      return <FileText className="size-5 text-red-600" />;
    }
    return <FileText className="size-5 text-blue-600" />;
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

  if (classes.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <BookOpen className="size-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">
          Bạn chưa được ghi danh vào lớp học nào để xem tài liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh chọn lớp & Tìm kiếm */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Chọn lớp học */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Lớp:</span>
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
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {c.name} ({c.class_code})
              </button>
            );
          })}
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài liệu, bài giảng..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Lọc theo tuần */}
      {availableWeeks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">Tuần học:</span>
          <button
            type="button"
            onClick={() => setSelectedWeek('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              selectedWeek === 'all'
                ? 'bg-emerald-700 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </button>
          {availableWeeks.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWeek(w)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedWeek === w
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tuần {w}
            </button>
          ))}
        </div>
      )}

      {/* Danh sách Tài liệu */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <FileCheck className="size-10 text-slate-300 stroke-[1.5]" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            {classMaterials.length === 0
              ? 'Giảng viên chưa đăng tải tài liệu nào cho lớp này'
              : 'Không tìm thấy tài liệu phù hợp với bộ lọc'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Tài liệu mới (slide, bài tập, video) sẽ hiển thị tại đây ngay khi giảng viên đăng lên.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100">
                      {getMaterialIcon(item.materialType, item.mimeType)}
                    </span>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                      Tuần {item.weekNumber}
                    </Badge>
                  </div>
                  {item.fileSizeBytes && (
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatFileSize(item.fileSizeBytes)}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">
                  {formatDate(item.createdAt)}
                </span>

                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={item.materialType === 'document' ? item.fileName || true : undefined}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
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

