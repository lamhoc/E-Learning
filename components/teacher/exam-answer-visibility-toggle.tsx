'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toggleExamAnswerVisibilityAction } from '@/app/teacher/exams/create/actions';

type Props = {
  examId: string;
  initialShowAnswers: boolean;
};

export function ExamAnswerVisibilityToggle({ examId, initialShowAnswers }: Props) {
  const router = useRouter();
  const [showAnswers, setShowAnswers] = useState(initialShowAnswers);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isUpdating) return;
    const targetState = !showAnswers;
    setIsUpdating(true);
    setMessage(null);

    const res = await toggleExamAnswerVisibilityAction(examId, targetState);
    setIsUpdating(false);

    if (res.status === 'success') {
      setShowAnswers(targetState);
      setMessage(res.message);
      setTimeout(() => {
        setMessage(null);
        router.refresh();
      }, 1500);
    } else {
      setMessage(res.message);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {showAnswers ? (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold gap-1 py-1 px-2.5">
          <Eye className="size-3" />
          <span>Cho xem đáp án & lời giải</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium gap-1 py-1 px-2.5"
        >
          <EyeOff className="size-3 text-slate-400" />
          <span>Đang ẩn đáp án</span>
        </Badge>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isUpdating}
        onClick={handleToggle}
        className="h-7 text-xs gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
        title={showAnswers ? 'Nhấn để khóa đáp án' : 'Nhấn để mở đáp án cho học sinh xem'}
      >
        {isUpdating ? (
          <LoaderCircle className="size-3 animate-spin text-blue-600 dark:text-blue-400" />
        ) : showAnswers ? (
          <EyeOff className="size-3 text-amber-600 dark:text-amber-400" />
        ) : (
          <Eye className="size-3 text-emerald-600 dark:text-emerald-400" />
        )}
        <span>{showAnswers ? 'Khóa đáp án' : 'Mở đáp án cho SV'}</span>
      </Button>

      {message && (
        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 animate-in fade-in">
          {message}
        </span>
      )}
    </div>
  );
}
