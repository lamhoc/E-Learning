'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileEdit, LoaderCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publishExistingDraftExamAction } from '@/app/teacher/exams/create/actions';

type Props = {
  examId: string;
  examTitle: string;
  isDraft: boolean;
};

export function ExamDraftActions({ examId, examTitle, isDraft }: Props) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isDraft) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setFeedback(null);

    const res = await publishExistingDraftExamAction(examId);
    setIsPublishing(false);

    if (res.status === 'error') {
      setFeedback({ type: 'error', message: res.message });
    } else {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        router.refresh();
      }, 1000);
    }
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          role="alert"
          className={`flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-semibold animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/30 p-3.5">
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <strong className="font-bold">Đề thi đang ở trạng thái Bản nháp:</strong> Sinh viên chưa thể nhìn thấy hoặc làm bài thi cho đến khi bạn xuất bản.
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/teacher/exams/create?editId=${examId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold transition"
          >
            <FileEdit className="size-3.5" />
            <span>✏️ Chỉnh sửa bản nháp</span>
          </Link>

          <Button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition"
          >
            {isPublishing ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>🚀 Xuất bản ngay</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
