import Link from 'next/link';
import { In } from 'typeorm';
import { FileCheck, PlusCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  ExamAttemptSchema,
  ExamClassSchema,
  ExamQuestionSchema,
  ExamSchema,
  SubjectSchema,
} from '@/lib/db/entities';
import { TeacherExamsClient, type ExamItem } from '@/components/teacher/teacher-exams-client';
import {
  isAutoGradeEssay,
  isCameraRequired,
  isShowAnswersAfterSubmit,
} from '@/lib/exam-auto-grade';

export const metadata = {
  title: 'Quản lý Đề thi | Cổng Giảng viên LHU',
  description:
    'Quản lý danh sách đề thi, trạng thái phát hành, phòng thi trực tuyến và thống kê phổ điểm tại Đại học Lạc Hồng.',
};

export default async function TeacherExamsPage() {
  const { user } = await requireRole('teacher');
  const ds = await getDataSource();

  const rawExams = await ds.getRepository(ExamSchema).find({
    where: { created_by: user.id },
    order: { created_at: 'DESC' },
  });

  const examIds = rawExams.map((e) => e.id);
  const subjectIds = Array.from(new Set(rawExams.map((e) => e.subject_id)));

  const [subjects, examQuestions, examClasses, examAttempts] = examIds.length
    ? await Promise.all([
        subjectIds.length
          ? ds.getRepository(SubjectSchema).find({ select: { id: true, name: true }, where: { id: In(subjectIds) } })
          : Promise.resolve([]),
        ds.getRepository(ExamQuestionSchema).find({ select: { id: true, exam_id: true }, where: { exam_id: In(examIds) } }),
        ds.getRepository(ExamClassSchema).find({ where: { exam_id: In(examIds) } }),
        ds.getRepository(ExamAttemptSchema).find({
          select: { id: true, exam_id: true, status: true },
          where: { exam_id: In(examIds) },
        }),
      ])
    : [[], [], [], []];

  const classIds = Array.from(new Set(examClasses.map((ec) => ec.class_id)));
  const classes = classIds.length
    ? await ds.getRepository(ClassSchema).find({
        select: { id: true, name: true, class_code: true },
        where: { id: In(classIds) },
      })
    : [];

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  const examItems: ExamItem[] = rawExams.map((exam) => {
    const assignedClasses = examClasses
      .filter((ec) => ec.exam_id === exam.id)
      .map((ec) => classMap.get(ec.class_id))
      .filter((n): n is string => Boolean(n));

    const attempts = examAttempts.filter((a) => a.exam_id === exam.id);
    const totalAttempts = attempts.length;
    const pendingAttempts = attempts.filter((a) => a.status === 'pending_grading').length;

    return {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      duration_minutes: exam.duration_minutes,
      created_at: exam.created_at,
      available_from: exam.available_from,
      available_until: exam.available_until,
      subjectName: subjectMap.get(exam.subject_id) || 'Môn học',
      questionCount: examQuestions.filter((q) => q.exam_id === exam.id).length,
      assignedClasses,
      totalAttempts,
      pendingAttempts,
      requireCamera: isCameraRequired(exam),
      autoGradeEssay: isAutoGradeEssay(exam),
      showAnswersAfterSubmit: isShowAnswersAfterSubmit(exam),
    };
  });

  return (
    <main className="w-full max-w-full min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <FileCheck className="size-5.5 sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
              Quản lý Đề thi & Phòng thi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 break-words">
              Theo dõi đề thi, phổ điểm thống kê, giám sát phòng thi và xuất kết quả
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Link
            href="/teacher/exams/create"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <PlusCircle className="size-4" />
            Tạo đề thi mới
          </Link>
        </div>
      </div>

      <TeacherExamsClient exams={examItems} />
    </main>
  );
}
