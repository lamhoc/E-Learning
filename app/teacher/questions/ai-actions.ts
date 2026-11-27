'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  AiGenerationJobSchema,
  QuestionAnswerKeySchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';
import {
  generateQuestionsAI,
  type AIDifficulty,
  type GeneratedQuestionDraft,
} from '@/lib/ai-question-generator';

export type AIGenerateState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  questions?: GeneratedQuestionDraft[];
};

export type AISaveState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  savedCount?: number;
};

const uuidPattern = /^[0-9a-f-]{36}$/i;

export async function generateAIQuestionsAction(input: {
  subjectId: string;
  topic: string;
  questionType: 'multiple_choice' | 'essay';
  difficulty: AIDifficulty;
  count: number;
  additionalNote?: string;
}): Promise<AIGenerateState> {
  const { subjectId, topic, questionType, difficulty, count, additionalNote } = input;

  if (!uuidPattern.test(subjectId)) {
    return { status: 'error', message: 'Vui lòng chọn môn học hợp lệ.' };
  }
  if (!topic || topic.trim().length < 2) {
    return { status: 'error', message: 'Vui lòng nhập chủ đề hoặc bài học cần tạo câu hỏi.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.' };
  }

  const ds = await getDataSource();
  const subject = await ds.getRepository(SubjectSchema).findOne({
    select: { id: true, name: true, code: true },
    where: { id: subjectId },
  });

  if (!subject) {
    return { status: 'error', message: 'Không tìm thấy thông tin môn học.' };
  }

  if (role === 'teacher') {
    const assignment = await ds.getRepository(TeacherSubjectAssignmentSchema).findOne({
      where: { teacher_id: user.id, subject_id: subjectId },
    });
    if (!assignment) {
      return { status: 'error', message: 'Bạn không được phân công phụ trách môn học này.' };
    }
  }

  try {
    const questions = await generateQuestionsAI({
      subjectName: subject.name,
      subjectCode: subject.code,
      topic: topic.trim(),
      questionType,
      difficulty,
      count: Math.min(Math.max(count, 1), 10),
      additionalNote: additionalNote?.trim(),
    });

    try {
      const jobRepo = ds.getRepository(AiGenerationJobSchema);
      await jobRepo.save(
        jobRepo.create({
          teacher_id: user.id,
          subject_id: subjectId,
          status: 'completed',
          generated_questions: questions,
          completed_at: new Date().toISOString(),
        }),
      );
    } catch (logErr) {
      console.warn('Could not record ai_generation_job:', logErr);
    }

    return {
      status: 'success',
      message: `Đã sinh thành công ${questions.length} câu hỏi.`,
      questions,
    };
  } catch (err) {
    console.error('generateAIQuestionsAction error:', err);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Không thể kết nối đến AI. Hãy thử lại.',
    };
  }
}

export async function saveAIQuestionsBatchAction(
  subjectId: string,
  questions: GeneratedQuestionDraft[],
): Promise<AISaveState> {
  if (!uuidPattern.test(subjectId)) {
    return { status: 'error', message: 'Môn học không hợp lệ.' };
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return { status: 'error', message: 'Không có câu hỏi nào được chọn để lưu.' };
  }

  const { user, role } = await getCurrentUserWithRole();
  if (!user || (role !== 'admin' && role !== 'teacher')) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.' };
  }

  const ds = await getDataSource();
  let savedCount = 0;

  try {
    await ds.transaction(async (manager) => {
      const qbRepo = manager.getRepository(QuestionBankSchema);
      const optRepo = manager.getRepository(QuestionOptionSchema);
      const keyRepo = manager.getRepository(QuestionAnswerKeySchema);

      const prepared = questions.map((q) => ({ q, id: crypto.randomUUID() }));

      await qbRepo.save(
        prepared.map(({ q, id }) =>
          qbRepo.create({
            id,
            subject_id: subjectId,
            created_by: user.id,
            question_type: q.question_type,
            question_text: q.question_text.trim(),
            explanation: q.explanation?.trim() || null,
            archived_at: null,
          }),
        ),
      );

      const optionRows = prepared
        .filter(({ q }) => q.question_type === 'multiple_choice')
        .flatMap(({ q, id }) => [
          optRepo.create({ question_id: id, option_key: 'A', option_text: q.option_a?.trim() || 'A', position: 1 }),
          optRepo.create({ question_id: id, option_key: 'B', option_text: q.option_b?.trim() || 'B', position: 2 }),
          optRepo.create({ question_id: id, option_key: 'C', option_text: q.option_c?.trim() || 'C', position: 3 }),
          optRepo.create({ question_id: id, option_key: 'D', option_text: q.option_d?.trim() || 'D', position: 4 }),
        ]);

      if (optionRows.length > 0) {
        await optRepo.save(optionRows);
      }

      await keyRepo.save(
        prepared.map(({ q, id }) =>
          q.question_type === 'multiple_choice'
            ? keyRepo.create({
                question_id: id,
                correct_option_key: q.correct_option || 'A',
                model_answer: null,
                grading_rubric: null,
              })
            : keyRepo.create({
                question_id: id,
                correct_option_key: null,
                model_answer: q.model_answer?.trim() || null,
                grading_rubric: q.grading_rubric?.trim() || null,
              }),
        ),
      );

      savedCount = prepared.length;
    });
  } catch (err) {
    console.error('Bulk save AI questions failed:', err);
    return { status: 'error', message: 'Không thể lưu câu hỏi vào ngân hàng. Vui lòng thử lại.' };
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');

  return {
    status: 'success',
    savedCount,
    message: `Đã lưu thành công ${savedCount}/${questions.length} câu hỏi vào ngân hàng!`,
  };
}
