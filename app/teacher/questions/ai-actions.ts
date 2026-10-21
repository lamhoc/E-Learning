'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
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

async function getAuthenticatedTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { supabase: null, user: null, role: null };

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !role || (role !== 'admin' && role !== 'teacher')) {
    return { supabase: null, user: null, role: null };
  }

  return { supabase, user, role };
}

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

  const { supabase, user, role } = await getAuthenticatedTeacher();
  if (!supabase || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.' };
  }

  // 1. Fetch Subject Info
  const { data: subject, error: subError } = await supabase
    .from('subjects')
    .select('id, name, code')
    .eq('id', subjectId)
    .maybeSingle();

  if (subError || !subject) {
    return { status: 'error', message: 'Không tìm thấy thông tin môn học.' };
  }

  // 2. Check Teacher Assignment (unless admin)
  if (role === 'teacher') {
    const { data: assignment, error: assignError } = await supabase
      .from('teacher_subject_assignments')
      .select('subject_id')
      .eq('teacher_id', user.id)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (assignError || !assignment) {
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

    // Record job in ai_generation_jobs (audit log)
    try {
      await supabase.from('ai_generation_jobs').insert({
        teacher_id: user.id,
        subject_id: subjectId,
        status: 'completed',
        generated_questions: questions,
        completed_at: new Date().toISOString(),
      });
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

  const { supabase, user } = await getAuthenticatedTeacher();
  if (!supabase || !user) {
    return { status: 'error', message: 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.' };
  }

  let savedCount = 0;

  for (const q of questions) {
    try {
      // 1. Insert question_bank
      const { data: qb, error: qbError } = await supabase
        .from('question_bank')
        .insert({
          subject_id: subjectId,
          created_by: user.id,
          question_type: q.question_type,
          question_text: q.question_text.trim(),
          explanation: q.explanation?.trim() || null,
        })
        .select('id')
        .single();

      if (qbError || !qb) {
        console.error('Batch save question_bank error:', qbError);
        continue;
      }

      const questionId = qb.id;

      if (q.question_type === 'multiple_choice') {
        // 2. Insert Options
        const optionsData = [
          { question_id: questionId, option_key: 'A', option_text: q.option_a?.trim() || 'A', position: 1 },
          { question_id: questionId, option_key: 'B', option_text: q.option_b?.trim() || 'B', position: 2 },
          { question_id: questionId, option_key: 'C', option_text: q.option_c?.trim() || 'C', position: 3 },
          { question_id: questionId, option_key: 'D', option_text: q.option_d?.trim() || 'D', position: 4 },
        ];

        const { error: optErr } = await supabase.from('question_options').insert(optionsData);
        if (optErr) {
          console.error('Batch save options error:', optErr);
          await supabase.from('question_bank').delete().eq('id', questionId);
          continue;
        }

        // 3. Insert Answer Key
        const { error: keyErr } = await supabase.from('question_answer_keys').insert({
          question_id: questionId,
          correct_option_key: q.correct_option || 'A',
          model_answer: null,
          grading_rubric: null,
        });

        if (keyErr) {
          console.error('Batch save answer key error:', keyErr);
          await supabase.from('question_bank').delete().eq('id', questionId);
          continue;
        }
      } else {
        // Essay
        const { error: keyErr } = await supabase.from('question_answer_keys').insert({
          question_id: questionId,
          correct_option_key: null,
          model_answer: q.model_answer?.trim() || null,
          grading_rubric: q.grading_rubric?.trim() || null,
        });

        if (keyErr) {
          console.error('Batch save essay key error:', keyErr);
          await supabase.from('question_bank').delete().eq('id', questionId);
          continue;
        }
      }

      savedCount++;
    } catch (saveItemErr) {
      console.error('Error saving question item:', saveItemErr);
    }
  }

  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/dashboard');

  if (savedCount === 0) {
    return { status: 'error', message: 'Không thể lưu câu hỏi vào ngân hàng. Vui lòng thử lại.' };
  }

  return {
    status: 'success',
    savedCount,
    message: `Đã lưu thành công ${savedCount}/${questions.length} câu hỏi vào ngân hàng!`,
  };
}

