'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Globe,
  LoaderCircle,
  PlaySquare,
  Trash2,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ClassMaterialItem } from '@/lib/class-materials';
import { deleteClassMaterialAction } from '@/app/teacher/classes/[classId]/materials/actions';

interface ClassMaterialListProps {
  classId: string;
  materials: ClassMaterialItem[];
}

export function ClassMaterialList({ classId, materials }: ClassMaterialListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredMaterials = selectedWeek === 'all'
    ? materials
    : materials.filter((m) => m.weekNumber === selectedWeek);

  // Lấy danh sách các tuần có tài liệu
  const availableWeeks = Array.from(new Set(materials.map((m) => m.weekNumber))).sort((a, b) => a - b);

  const handleDelete = async (materialId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${title}" không?`)) {
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

  return (
    <div className="space-y-4">
      {/* Header & Filter by Week */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Kho tài liệu lớp ({materials.length} mục)
          </h3>
          <p className="text-xs text-slate-500">Phân loại theo tuần học và định dạng tài liệu</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedWeek('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              selectedWeek === 'all'
                ? 'bg-emerald-700 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          {availableWeeks.map((week) => (
            <button
              key={week}
              type="button"
              onClick={() => setSelectedWeek(week)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedWeek === week
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tuần {week}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách Items */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <FileCheck className="size-10 text-slate-300 stroke-[1.5]" />
          <p className="mt-2 text-sm font-medium text-slate-700">Chưa có tài liệu nào trong mục này</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Hãy sử dụng form bên cạnh để đăng tải bài giảng hoặc link tài liệu học tập.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Info */}
              <div className="flex items-start gap-3.5 min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100">
                  {getMaterialIcon(item.materialType, item.mimeType)}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                      Tuần {item.weekNumber}
                    </Badge>
                    <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    {item.fileSizeBytes && <span>{formatFileSize(item.fileSizeBytes)}</span>}
                    {item.fileName && <span className="font-mono text-slate-500 truncate max-w-[200px]">{item.fileName}</span>}
                    <span>Đăng ngày: {formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition shadow-2xs"
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
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                  className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition shadow-2xs"
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
    </div>
  );
}

