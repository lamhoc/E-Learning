import { Trophy } from 'lucide-react';
import { In } from 'typeorm';
import { requireRole } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import {
  AssignmentSchema,
  AssignmentSubmissionSchema,
  AttemptResultSchema,
  ClassSchema,
  ExamAttemptSchema,
  ExamSchema,
  SubjectSchema,
} from '@/lib/db/entities';
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

  const [
    attemptRepo,
    resultRepo,
    examRepo,
    subjectRepo,
    submissionRepo,
    assignmentRepo,
    classRepo,
  ] = await Promise.all([
    getRepo(ExamAttemptSchema),
    getRepo(AttemptResultSchema),
    getRepo(ExamSchema),
    getRepo(SubjectSchema),
    getRepo(AssignmentSubmissionSchema),
    getRepo(AssignmentSchema),
    getRepo(ClassSchema),
  ]);

  const [rawAttempts, rawSubmissions] = await Promise.all([
    attemptRepo.find({
      where: { student_id: user.id },
      order: { started_at: 'DESC' },
    }),
    submissionRepo.find({
      where: { student_id: user.id },
      order: { submitted_at: 'DESC' },
    }),
  ]);

  const submittedAttempts = rawAttempts.filter(
    (attempt) => attempt.status !== 'in_progress' || Boolean(attempt.submitted_at),
  );

  const attemptIds = submittedAttempts.map((a) => a.id);
  const examIds = Array.from(new Set(submittedAttempts.map((a) => a.exam_id)));
  const assignmentIds = Array.from(new Set(rawSubmissions.map((s) => s.assignment_id)));

  const [attemptResults, exams, assignments] = await Promise.all([
    attemptIds.length > 0 ? resultRepo.find({ where: { attempt_id: In(attemptIds) } }) : Promise.resolve([]),
    examIds.length > 0 ? examRepo.find({ where: { id: In(examIds) } }) : Promise.resolve([]),
    assignmentIds.length > 0 ? assignmentRepo.find({ where: { id: In(assignmentIds) } }) : Promise.resolve([]),
  ]);

  const classIds = Array.from(new Set(assignments.map((a) => a.class_id)));
  const classes = classIds.length > 0 ? await classRepo.find({ where: { id: In(classIds) } }) : [];

  const subjectIds = Array.from(
    new Set([
      ...exams.map((e) => e.subject_id),
      ...classes.map((c) => c.subject_id),
    ]),
  );
  const subjects = subjectIds.length > 0 ? await subjectRepo.find({ where: { id: In(subjectIds) } }) : [];

  const resultMap = new Map(attemptResults.map((r) => [r.attempt_id, r]));
  const examMap = new Map(exams.map((e) => [e.id, e]));
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const examResults: ExamResultRecord[] = submittedAttempts.map((attempt) => {
    const rawExam = examMap.get(attempt.exam_id);
    const subjectName = rawExam ? subjectMap.get(rawExam.subject_id)?.name || 'Môn học' : 'Môn học';
    const resultObj = resultMap.get(attempt.id);

    const totalScoreNum =
      resultObj && resultObj.total_score !== null && Number.isFinite(Number(resultObj.total_score))
        ? Math.round(Number(resultObj.total_score) * 100) / 100
        : null;

    const isPassed = totalScoreNum !== null ? totalScoreNum >= 5.0 : false;

    let normalizedStatus: 'in_progress' | 'pending_grading' | 'completed' | 'voided' = 'pending_grading';
    if (
      attempt.status === 'completed' ||
      (totalScoreNum !== null && Boolean(resultObj?.released_at))
    ) {
      normalizedStatus = 'completed';
    } else if (attempt.status === 'voided') {
      normalizedStatus = 'voided';
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
      objectiveScore: null,
      subjectiveScore: null,
      feedback: null,
      isPassed,
      showAnswersAfterSubmit: isShowAnswersAfterSubmit(rawExam ?? null),
      releasedAt: resultObj?.released_at || null,
    };
  });

  const assignmentResults: AssignmentResultRecord[] = rawSubmissions.map((sub) => {
    const assignment = assignmentMap.get(sub.assignment_id);
    const cls = assignment ? classMap.get(assignment.class_id) : undefined;
    const subjectName = cls ? subjectMap.get(cls.subject_id)?.name || 'Môn học' : 'Môn học';

    return {
      id: sub.id,
      assignmentId: sub.assignment_id,
      assignmentTitle: assignment?.title || 'Bài tập',
      className: cls?.name || 'Lớp học',
      subjectName,
      submittedAt: sub.submitted_at,
      grade: sub.score,
      maxScore: assignment?.max_score ?? 10,
      feedback: sub.feedback,
      status: sub.graded_at ? 'graded' : sub.is_late ? 'late' : 'submitted',
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D18]">
      <main className="flex-1 p-6 md:p-8 lg:p-10">
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

        <StudentResultsClient
          examResults={examResults}
          assignmentResults={assignmentResults}
        />
      </main>
    </div>
  );
}
