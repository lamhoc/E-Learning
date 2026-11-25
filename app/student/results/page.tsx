import { Trophy } from 'lucide-react';
import { requireRole } from '@/lib/auth-cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeVietnameseText } from '@/lib/utils';
import { isShowAnswersAfterSubmit } from '@/lib/exam-auto-grade';
import {
  StudentResultsClient,
  type ExamResultRecord,
  type AssignmentResultRecord,
} from '@/components/student/student-results-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Kết quả học tập | Cổng Sinh viên LHU',
  description: 'Bảng điểm và theo dõi tiến độ thi, bài tập cá nhân tại Đại học Lạc Hồng.',
};

export default async function StudentResultsPage() {
  const { user } = await requireRole('student');
  const adminClient = createAdminClient();

  const [profileResult, attemptsResult, assignmentSubmissionsResult] = await Promise.all([
    adminClient.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    adminClient
      .from('exam_attempts')
      .select(`
        id, exam_id, attempt_no, started_at, submitted_at, status,
        exam:exams(title, duration_minutes, instructions, show_answers_after_submit, subject:subjects(name)),
        result:attempt_results(total_score, objective_score, subjective_score, feedback, released_at)
      `)
      .eq('student_id', user.id)
      .order('started_at', { ascending: false }),
    adminClient
      .from('assignment_submissions')
      .select(`
        id, assignment_id, submitted_at, grade, feedback, status,
        assignment:assignments(title, max_score, class:classes(name, subject:subjects(name)))
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false }),
  ]);

  const studentName =
    sanitizeVietnameseText(profileResult.data?.full_name) || user.email || 'Sinh viên';

  type RawAttempt = {
    id: string;
    exam_id: string;
    attempt_no: number;
    started_at: string;
    submitted_at: string | null;
    status: string;
    final_score?: number | string | null;
    total_score?: number | string | null;
    score?: number | string | null;
    auto_score?: number | string | null;
    exam: {
      title: string;
      duration_minutes: number;
      instructions?: string | null;
      show_answers_after_submit?: boolean | null;
      subject: { name: string } | { name: string }[] | null;
    } | {
      title: string;
      duration_minutes: number;
      instructions?: string | null;
      show_answers_after_submit?: boolean | null;
      subject: { name: string } | { name: string }[] | null;
    }[] | null;
    result: {
      total_score?: number | string | null;
      score?: number | string | null;
      objective_score?: number | string | null;
      subjective_score?: number | string | null;
      feedback?: string | null;
      released_at?: string | null;
    } | {
      total_score?: number | string | null;
      score?: number | string | null;
      objective_score?: number | string | null;
      subjective_score?: number | string | null;
      feedback?: string | null;
      released_at?: string | null;
    }[] | null;
  };

  const rawAttempts = (attemptsResult.data ?? []) as unknown as RawAttempt[];

  // Lấy TẤT CẢ các lượt thi đã kết thúc / đã nộp (loại trừ lượt in_progress chưa có submitted_at)
  const submittedAttempts = rawAttempts.filter(
    (attempt) => attempt.status !== 'in_progress' || Boolean(attempt.submitted_at)
  );

  const examResults: ExamResultRecord[] = submittedAttempts.map((attempt) => {
    const rawExam = Array.isArray(attempt.exam) ? attempt.exam[0] : attempt.exam;
    const subjectName = Array.isArray(rawExam?.subject)
      ? rawExam.subject[0]?.name || 'Môn học'
      : rawExam?.subject?.name || 'Môn học';

    const resultObj = Array.isArray(attempt.result) ? attempt.result[0] : attempt.result;

    // Chuẩn hóa đọc điểm số theo thứ tự ưu tiên đa trường
    const rawScore =
      attempt.final_score ??
      attempt.total_score ??
      attempt.score ??
      attempt.auto_score ??
      resultObj?.total_score ??
      resultObj?.score ??
      null;

    const totalScoreNum =
      rawScore !== null && rawScore !== undefined && rawScore !== '' && Number.isFinite(Number(rawScore))
        ? Math.round(Number(rawScore) * 100) / 100
        : null;

    const objectiveScoreNum =
      resultObj?.objective_score !== null && resultObj?.objective_score !== undefined
        ? Number(resultObj.objective_score)
        : null;

    const subjectiveScoreNum =
      resultObj?.subjective_score !== null && resultObj?.subjective_score !== undefined
        ? Number(resultObj.subjective_score)
        : null;

    const isPassed = totalScoreNum !== null ? totalScoreNum >= 5.0 : false;

    // Chuẩn hóa trạng thái
    let normalizedStatus: 'in_progress' | 'pending_grading' | 'completed' | 'voided' = 'pending_grading';
    if (
      attempt.status === 'completed' ||
      attempt.status === 'graded' ||
      attempt.status === 'published' ||
      (totalScoreNum !== null && Boolean(resultObj?.released_at))
    ) {
      normalizedStatus = 'completed';
    } else if (attempt.status === 'voided') {
      normalizedStatus = 'voided';
    } else {
      normalizedStatus = 'pending_grading';
    }

    return {
      id: attempt.id,
      examId: attempt.exam_id,
      examTitle: rawExam?.title || 'Đề thi không xác định',
      subjectName,
      attemptNo: attempt.attempt_no,
      submittedAt: attempt.submitted_at || attempt.started_at,
      status: normalizedStatus,
      totalScore: totalScoreNum,
      objectiveScore: objectiveScoreNum,
      subjectiveScore: subjectiveScoreNum,
      feedback: resultObj?.feedback || null,
      isPassed,
      showAnswersAfterSubmit: isShowAnswersAfterSubmit(rawExam),
      releasedAt: resultObj?.released_at || null,
    };
  });

  type RawSubmission = {
    id: string;
    assignment_id: string;
    submitted_at: string;
    grade: number | null;
    feedback: string | null;
    status: string;
    assignment: {
      title: string;
      max_score: number;
      class: {
        name: string;
        subject: { name: string } | { name: string }[] | null;
      } | null;
    } | null;
  };

  const rawSubmissions = (assignmentSubmissionsResult.data ?? []) as unknown as RawSubmission[];

  const assignmentResults: AssignmentResultRecord[] = rawSubmissions.map((sub) => {
    const rawSubject = sub.assignment?.class?.subject;
    const subjectName = Array.isArray(rawSubject)
      ? rawSubject[0]?.name || 'Môn học'
      : rawSubject?.name || 'Môn học';

    return {
      id: sub.id,
      assignmentId: sub.assignment_id,
      assignmentTitle: sub.assignment?.title || 'Bài tập',
      className: sub.assignment?.class?.name || 'Lớp học',
      subjectName,
      submittedAt: sub.submitted_at,
      grade: sub.grade,
      maxScore: sub.assignment?.max_score || 10,
      feedback: sub.feedback,
      status: sub.status,
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D18]">

      <main className="flex-1 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-600/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Trophy className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Kết quả Học tập & Bảng điểm
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Theo dõi tiến độ, lịch sử làm bài thi, điểm trung bình và bài tập đã nộp
              </p>
            </div>
          </div>

          
        </div>

        {/* Client Results Interactive Component */}
        <StudentResultsClient
          examResults={examResults}
          assignmentResults={assignmentResults}
        />
      </main>
    </div>
  );
}
