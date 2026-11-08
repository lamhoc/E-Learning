import Link from 'next/link';
import { FileCheck, PlusCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth-cache';
import { sanitizeVietnameseText } from '@/lib/utils';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { TeacherExamsClient, type ExamItem } from '@/components/teacher/teacher-exams-client';

export const metadata = {
  title: 'Quản lý Đề thi | Cổng Giảng viên LHU',
  description: 'Quản lý danh sách đề thi, trạng thái phát hành, phòng thi trực tuyến và thống kê phổ điểm tại Đại học Lạc Hồng.',
};

export default async function TeacherExamsPage() {
  const { user, supabase } = await requireRole('teacher');

  const [profileResult, examsResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('exams')
      .select(`
        id, title, status, duration_minutes, created_at, available_from, available_until,
        subject:subjects(name),
        exam_questions(id),
        exam_classes(class:classes(name, class_code)),
        exam_attempts(id, status)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const teacherName = sanitizeVietnameseText(profileResult.data?.full_name) || user.email || 'Giảng viên';

  type RawExam = {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'closed' | 'archived';
    duration_minutes: number;
    created_at: string;
    available_from: string | null;
    available_until: string | null;
    subject: { name: string } | { name: string }[] | null;
    exam_questions: { id: string }[];
    exam_classes: { class: { name: string; class_code: string } | null }[];
    exam_attempts: { id: string; status: string }[];
  };

  const rawExams = (examsResult.data ?? []) as unknown as RawExam[];

  const examItems: ExamItem[] = rawExams.map((exam) => {
    const subjectName = Array.isArray(exam.subject)
      ? exam.subject[0]?.name || 'Môn học'
      : exam.subject?.name || 'Môn học';

    const assignedClasses = (exam.exam_classes ?? [])
      .map((c) => c.class?.name)
      .filter((n): n is string => Boolean(n));

    const totalAttempts = exam.exam_attempts?.length || 0;
    const pendingAttempts = exam.exam_attempts?.filter((a) => a.status === 'pending_grading').length || 0;

    return {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      duration_minutes: exam.duration_minutes,
      created_at: exam.created_at,
      available_from: exam.available_from,
      available_until: exam.available_until,
      subjectName,
      questionCount: exam.exam_questions?.length || 0,
      assignedClasses,
      totalAttempts,
      pendingAttempts,
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D18]">
      <TeacherSidebar activeRoute="exams" teacherName={teacherName} />

      <main className="flex-1 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <FileCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Quản lý Đề thi & Phòng thi
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Theo dõi đề thi, phổ điểm thống kê, giám sát phòng thi và xuất kết quả
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/teacher/exams/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <PlusCircle className="size-4" />
              Tạo đề thi mới
            </Link>
          </div>
        </div>

        {/* Exams Table / Cards with Filter */}
        <TeacherExamsClient exams={examItems} />
      </main>
    </div>
  );
}
