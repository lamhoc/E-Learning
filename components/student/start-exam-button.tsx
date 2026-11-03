'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOrResumeExamAttempt } from '@/app/student/exams/[examId]/actions';

type StartExamButtonProps = {
  examId: string;
  label?: string;
  attemptNo?: number;
};

export function StartExamButton({
  examId,
  label = 'Bắt đầu làm bài thi',
  attemptNo,
}: StartExamButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const res = await startOrResumeExamAttempt(examId);
    if (res.status === 'error') {
      setErrorMsg(res.message);
      setIsLoading(false);
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        onClick={handleStart}
        disabled={isLoading}
        className="w-full gap-2 bg-primary py-6 text-base font-bold text-white shadow-md hover:bg-primary/90 sm:w-auto sm:px-8"
      >
        {isLoading ? (
          <LoaderCircle className="size-5 animate-spin text-[#FACC15]" />
        ) : (
          <Play className="size-5 fill-current text-[#FACC15]" />
        )}
        <span>
          {isLoading ? 'Đang chuẩn bị đề thi...' : attemptNo ? `Bắt đầu lượt thi #${attemptNo}` : label}
        </span>
        {!isLoading && <ArrowRight className="size-4 ml-1" />}
      </Button>

      {errorMsg && (
        <p className="text-xs font-medium text-destructive animate-in fade-in">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
