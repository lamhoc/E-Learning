import { Sparkles, Wand2 } from 'lucide-react';
import { getTeacherQuestionsData } from '@/lib/question-bank';
import { TeacherSidebar } from '@/components/teacher/teacher-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { AIGeneratorStandalone } from '@/components/teacher/ai-generator-standalone';

export const metadata = {
  title: 'Sinh câu hỏi AI | Cổng Giảng viên LHU',
  description: 'Tự động biên soạn câu hỏi trắc nghiệm & tự luận chuẩn LaTeX KaTeX bằng siêu trí tuệ nhân tạo Groq AI.',
};

export default async function TeacherAIGeneratorPage() {
  const data = await getTeacherQuestionsData();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070D18]">
      <TeacherSidebar activeRoute="ai-generator" teacherName={data.teacherName} />

      <main className="flex-1 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sinh câu hỏi AI (Groq Llama 3)
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Tự động biên soạn câu hỏi trắc nghiệm & tự luận chuẩn LaTeX KaTeX từ chủ đề bài giảng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        {/* Standalone AI Generator Client */}
        <AIGeneratorStandalone
          subjects={data.assignedSubjects}
          teacherName={data.teacherName}
        />
      </main>
    </div>
  );
}
