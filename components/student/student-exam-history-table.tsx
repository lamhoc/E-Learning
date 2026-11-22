'use client';

import { useState } from 'react';
import { Eye, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExamAnswerReviewModal } from '@/components/student/exam-answer-review-modal';
import { ExamTutorDrawer } from '@/components/student/exam-tutor-drawer';
import type { AttemptHistoryItem } from '@/lib/student-exam';

type Props = {
  attempts: AttemptHistoryItem[];
  examTitle: string;
  showAnswersAfterSubmit: boolean;
};

export function StudentExamHistoryTable({
  attempts,
  examTitle,
  showAnswersAfterSubmit,
}: Props) {
  // Modal Xem đáp án state
  const [reviewModalAttempt, setReviewModalAttempt] = useState<AttemptHistoryItem | null>(null);

  // Drawer Gia sư AI state
  const [tutorDrawerAttempt, setTutorDrawerAttempt] = useState<AttemptHistoryItem | null>(null);
  const [targetQuestionNumber, setTargetQuestionNumber] = useState<number | null>(null);

  const handleOpenReview = (att: AttemptHistoryItem) => {
    setReviewModalAttempt(att);
  };

  const handleAskTutorFromReview = (questionNumber: number, _questionText: string) => {
    // Lưu lượt thi và câu hỏi cần hỏi
    const att = reviewModalAttempt;
    setReviewModalAttempt(null); // Đóng modal xem đáp án
    if (att) {
      setTargetQuestionNumber(questionNumber);
      setTutorDrawerAttempt(att); // Mở ngăn kéo Gia sư AI
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-2.5 font-semibold">Lượt thi</th>
              <th className="py-2.5 font-semibold">Bắt đầu</th>
              <th className="py-2.5 font-semibold">Nộp bài</th>
              <th className="py-2.5 font-semibold">Trạng thái</th>
              <th className="py-2.5 text-right font-semibold">Điểm số</th>
              <th className="py-2.5 text-right font-semibold">Thao tác & Chữa đề</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {attempts.map((att) => {
              const isSubmitted = att.status === 'completed' || att.status === 'pending_grading';

              return (
                <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                    Lượt #{att.attempt_no}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(att.started_at))}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {att.submitted_at
                      ? new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(att.submitted_at))
                      : '—'}
                  </td>
                  <td className="py-3">
                    {att.status === 'completed' && (
                      <Badge className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        Đã chấm điểm
                      </Badge>
                    )}
                    {att.status === 'pending_grading' && (
                      <Badge className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        Chờ chấm tự luận
                      </Badge>
                    )}
                    {att.status === 'in_progress' && (
                      <Badge className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        Đang làm dở
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                    {att.total_score != null ? (
                      <span className="text-emerald-700 dark:text-emerald-400 text-sm">
                        {att.total_score.toLocaleString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Chờ duyệt</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {/* Nút Xem đáp án (nếu được phép xem) hoặc Badge Ẩn đáp án */}
                      {isSubmitted && (
                        showAnswersAfterSubmit ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReview(att)}
                            className="h-7 text-xs font-semibold gap-1.5 border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
                            title="Xem chi tiết từng câu hỏi, đối chiếu đáp án đúng/sai và lời giải"
                          >
                            <Eye className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Xem đáp án</span>
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] gap-1 py-1"
                            title="Giảng viên đang khóa đáp án của đề thi này"
                          >
                            <Lock className="size-3 text-slate-400" />
                            <span>Đáp án đang ẩn</span>
                          </Badge>
                        )
                      )}

                      {/* Nút Gia sư AI */}
                      {att.released_at ? (
                        <ExamTutorDrawer
                          attemptId={att.id}
                          examTitle={examTitle}
                          attemptNo={att.attempt_no}
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Xem chi tiết đáp án */}
      {reviewModalAttempt && (
        <ExamAnswerReviewModal
          attemptId={reviewModalAttempt.id}
          examTitle={examTitle}
          attemptNo={reviewModalAttempt.attempt_no}
          isOpen={Boolean(reviewModalAttempt)}
          onClose={() => setReviewModalAttempt(null)}
          onAskTutor={handleAskTutorFromReview}
        />
      )}

      {/* Drawer Gia sư AI được mở tự động từ Modal Xem đáp án */}
      {tutorDrawerAttempt && (
        <ExamTutorDrawer
          attemptId={tutorDrawerAttempt.id}
          examTitle={examTitle}
          attemptNo={tutorDrawerAttempt.attempt_no}
          isOpenControlled={Boolean(tutorDrawerAttempt)}
          onOpenChange={(open) => {
            if (!open) {
              setTutorDrawerAttempt(null);
              setTargetQuestionNumber(null);
            }
          }}
          initialQuestionNumber={targetQuestionNumber}
        />
      )}
    </>
  );
}
