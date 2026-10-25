'use client';

import { useState, useTransition } from 'react';
import { Award, CheckCircle2, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
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
import { gradeAssignmentSubmissionAction } from '@/app/teacher/classes/[classId]/assignments/actions';
import type { AssignmentSubmission } from '@/lib/assignments';

interface GradeSubmissionDialogProps {
  submission: AssignmentSubmission;
  assignmentId: string;
  classId: string;
  maxScore: number;
}

export function GradeSubmissionDialog({
  submission,
  assignmentId,
  classId,
  maxScore,
}: GradeSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [score, setScore] = useState<string>(
    submission.score !== null ? String(submission.score) : ''
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback || '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.set('score', score);
    formData.set('feedback', feedback);

    startTransition(async () => {
      const res = await gradeAssignmentSubmissionAction(
        submission.id,
        assignmentId,
        classId,
        formData
      );
      if (res.status === 'success') {
        setOpen(false);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const isGraded = submission.score !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={isGraded ? 'outline' : 'default'}
          className={
            isGraded
              ? 'border-slate-300 hover:bg-slate-50 text-slate-700 text-xs'
              : 'bg-[#17372e] hover:bg-[#122c25] text-white text-xs'
          }
        >
          {isGraded ? 'Sửa điểm' : 'Chấm bài'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Award className="size-4" />
            <span>Chấm bài tập về nhà</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {submission.student?.full_name || 'Sinh viên'}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {submission.student?.student_code ? `MSSV: ${submission.student.student_code} · ` : ''}
            {submission.student?.email}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nhập điểm số */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="score" className="text-xs font-semibold text-slate-800">
                Điểm số (Thang điểm: {maxScore}) <span className="text-destructive">*</span>
              </Label>
              {/* Nút cho điểm nhanh */}
              <div className="flex items-center gap-1">
                {[0.5, 0.7, 0.85, 1.0].map((ratio) => {
                  const quickVal = Math.round(maxScore * ratio * 10) / 10;
                  return (
                    <button
                      type="button"
                      key={ratio}
                      onClick={() => setScore(String(quickVal))}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    >
                      {quickVal}đ
                    </button>
                  );
                })}
              </div>
            </div>
            <Input
              id="score"
              type="number"
              step="0.25"
              min="0"
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={`Nhập từ 0 đến ${maxScore}`}
              required
              disabled={isPending}
              className="text-sm font-semibold"
            />
          </div>

          {/* Nhận xét / Góp ý */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-slate-500" />
              <span>Nhận xét & Góp ý cho sinh viên</span>
            </Label>
            <Textarea
              id="feedback"
              rows={4}
              value={feedback}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
              placeholder="Nhận xét chi tiết về ưu điểm, lỗi sai cần khắc phục..."
              disabled={isPending}
              className="text-xs leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-[#17372e] hover:bg-[#122c25] text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Đang lưu...
                </>
              ) : (
                'Lưu điểm & Nhận xét'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

