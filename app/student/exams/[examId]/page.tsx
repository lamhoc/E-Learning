import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  History,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentExamPageData } from '@/lib/student-exam';
import { ExamTakingClient } from '@/components/student/exam-taking-client';
import { StartExamButton } from '@/components/student/start-exam-button';
import { ExamTutorDrawer } from '@/components/student/exam-tutor-drawer';

type StudentExamPageProps = {
  params: Promise<{
    examId: string;
  }>;
};

export default async function StudentExamPage({ params }: StudentExamPageProps) {
  const { examId } = await params;
  const data = await getStudentExamPageData(examId);

  // If student has an active in_progress attempt, go directly to taking screen
  if (data.activeAttempt) {
    return (
      <ExamTakingClient
        exam={data.exam}
        questions={data.questions}
        activeAttempt={data.activeAttempt}
        studentName={data.studentName}
      />
    );
  }

  const { exam, questions, attempts, canStartNewAttempt, remainingAttempts, isOpenNow } = data;
  const latestAttempt = attempts[0] ?? null;

  return (
    <main className="min-h-screen bg-[#f3f6f3] text-foreground">
      {/* Top Header */}
      <header className="border-b border-[#dfe5dd] bg-white px-5 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#17372e] hover:underline"
          >
            <ArrowLeft className="size-4" /> Quay lại Bảng điều khiển
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-[#17372e] text-[#c9ed99]">
              <GraduationCap className="size-4" />
            </span>
            <span className="text-xs font-bold text-slate-800">Mầm Học Khảo Thí</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        {/* Exam Title & Subject Info */}
        <section className="rounded-2xl border border-[#dce7e0] bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="gap-1.5 border-[#246348]/30 bg-[#eef6f1] text-[#17372e] font-semibold">
              <BookOpen className="size-3.5" />
              {exam.subject?.code} · {exam.subject?.name}
            </Badge>

            {isOpenNow ? (
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Đang mở làm bài
              </Badge>
            ) : (
              <Badge variant="destructive">
                Chưa mở hoặc đã hết hạn
              </Badge>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {exam.title}
          </h1>

          {exam.instructions && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {exam.instructions}
            </p>
          )}

          {/* Quick Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
              <Clock className="mx-auto size-5 text-[#246348]" />
              <p className="mt-1 text-xs text-slate-500">Thời gian làm</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {exam.duration_minutes} phút
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
              <FileQuestion className="mx-auto size-5 text-blue-600" />
              <p className="mt-1 text-xs text-slate-500">Số lượng câu</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {questions.length} câu
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
              <History className="mx-auto size-5 text-purple-600" />
              <p className="mt-1 text-xs text-slate-500">Lượt thi còn lại</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {remainingAttempts} / {exam.max_attempts}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
              <Trophy className="mx-auto size-5 text-amber-600" />
              <p className="mt-1 text-xs text-slate-500">Điểm cao nhất</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {attempts.length > 0 && attempts.some((a) => a.total_score != null)
                  ? Math.max(...attempts.map((a) => a.total_score ?? 0)).toLocaleString('vi-VN')
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* If Latest Attempt Result is Released: AI Tutor Callout */}
        {latestAttempt?.released_at && (
          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50/90 via-purple-50/50 to-emerald-50/40 p-5 sm:p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-700 text-white shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Gia sư AI Chữa đề — Lượt #{latestAttempt.attempt_no}
                  </h2>
                  <Badge className="border-violet-200 bg-violet-100 text-violet-800 text-[10px]">
                    Groq AI
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600 max-w-xl leading-relaxed">
                  Gia sư AI sẽ phân tích các câu bạn làm sai, hướng dẫn phương pháp giải từng bước kèm công thức Toán học chuẩn xác.
                </p>
              </div>
            </div>
            <ExamTutorDrawer
              attemptId={latestAttempt.id}
              examTitle={exam.title}
              attemptNo={latestAttempt.attempt_no}
              variant="banner"
            />
          </section>
        )}

        {/* If Student Already Has Previous Attempts */}
        {attempts.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-slate-600" />
                <h2 className="text-base font-bold text-slate-900">Lịch sử các lần làm bài</h2>
              </div>
              <span className="text-xs text-slate-500">
                Đã làm: <strong>{attempts.length}</strong> / {exam.max_attempts} lượt
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-2.5 font-semibold">Lượt thi</th>
                    <th className="py-2.5 font-semibold">Bắt đầu</th>
                    <th className="py-2.5 font-semibold">Nộp bài</th>
                    <th className="py-2.5 font-semibold">Trạng thái</th>
                    <th className="py-2.5 text-right font-semibold">Điểm số</th>
                    <th className="py-2.5 text-right font-semibold">Gia sư AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80">
                      <td className="py-3 font-bold text-slate-800">
                        Lượt #{att.attempt_no}
                      </td>
                      <td className="py-3 text-slate-600">
                        {new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(att.started_at))}
                      </td>
                      <td className="py-3 text-slate-600">
                        {att.submitted_at
                          ? new Intl.DateTimeFormat('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(att.submitted_at))
                          : '—'}
                      </td>
                      <td className="py-3">
                        {att.status === 'completed' && (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            Đã chấm điểm
                          </Badge>
                        )}
                        {att.status === 'pending_grading' && (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                            Chờ chấm tự luận
                          </Badge>
                        )}
                        {att.status === 'in_progress' && (
                          <Badge className="border-blue-200 bg-blue-50 text-blue-800">
                            Đang làm dở
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {att.total_score != null ? (
                          <span className="text-emerald-700 text-sm">
                            {att.total_score.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Chờ duyệt</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {att.released_at ? (
                          <ExamTutorDrawer
                            attemptId={att.id}
                            examTitle={exam.title}
                            attemptNo={att.attempt_no}
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Rules & Action Container */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Quy chế và lưu ý quan trọng trước khi làm bài
            </h2>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Hệ thống tự động lưu:</strong> Mọi lựa chọn trắc nghiệm và nội dung tự luận sẽ được lưu ngay tức thì vào máy chủ.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Đồng hồ đếm ngược:</strong> Thời gian làm bài sẽ liên tục chạy kể cả khi bạn đóng trình duyệt. Khi hết giờ, bài thi sẽ tự động được thu và chấm điểm.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Chấm điểm tự động:</strong> Đối với các câu hỏi trắc nghiệm, hệ thống sẽ tính điểm tự động ngay khi bạn bấm nộp bài.
                </span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="border-t border-slate-100 pt-6">
            {canStartNewAttempt ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Bạn đã sẵn sàng bước vào bài thi?
                  </p>
                  <p className="text-xs text-slate-500">
                    Thời gian sẽ bắt đầu đếm ngược ngay khi bạn bấm nút bên cạnh.
                  </p>
                </div>
                <StartExamButton
                  examId={exam.id}
                  attemptNo={attempts.length + 1}
                />
              </div>
            ) : !isOpenNow ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <AlertCircle className="size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Đề thi hiện không mở</p>
                  <p className="mt-0.5">Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc của đợt thi.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <span>Bạn đã hoàn thành đủ số lượt thi tối đa cho đề thi này.</span>
                <Link
                  href="/student/dashboard"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Quay về trang chủ
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
