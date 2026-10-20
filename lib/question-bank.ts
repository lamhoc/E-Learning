import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type QuestionOption = {
  option_key: 'A' | 'B' | 'C' | 'D';
  option_text: string;
  position: number;
};

export type QuestionAnswerKey = {
  correct_option_key: 'A' | 'B' | 'C' | 'D' | null;
  model_answer: string | null;
  grading_rubric: string | null;
};

export type SubjectSummary = {
  id: string;
  name: string;
  code: string;
};

export type BankQuestion = {
  id: string;
  subject_id: string;
  created_by: string;
  question_type: 'multiple_choice' | 'essay';
  question_text: string;
  explanation: string | null;
  created_at: string;
  updated_at: string;
  subject: SubjectSummary | null;
  options: QuestionOption[];
  answer_key: QuestionAnswerKey | null;
};

export type TeacherQuestionsData = {
  teacherName: string;
  userRole: 'admin' | 'teacher';
  userId: string;
  assignedSubjects: SubjectSummary[];
  questions: BankQuestion[];
  totalCount: number;
  multipleChoiceCount: number;
  essayCount: number;
  filters: {
    subjectId: string;
    type: string;
    query: string;
  };
};

export async function getTeacherQuestionsData(params?: {
  subjectId?: string;
  type?: string;
  query?: string;
}): Promise<TeacherQuestionsData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = roleRecord?.role as 'admin' | 'teacher' | 'student' | undefined;
  if (roleError || !userRole || (userRole !== 'teacher' && userRole !== 'admin')) {
    redirect('/subjects');
  }

  // 1. Fetch Teacher Profile Name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const teacherName = profile?.full_name ?? user.email ?? 'Giảng viên';

  // 2. Fetch Assigned Subjects (or all subjects if admin)
  let assignedSubjects: SubjectSummary[] = [];

  if (userRole === 'admin') {
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, code')
      .order('name');
    assignedSubjects = subjectsData ?? [];
  } else {
    const { data: assignments } = await supabase
      .from('teacher_subject_assignments')
      .select('subject:subjects(id, name, code)')
      .eq('teacher_id', user.id);

    assignedSubjects = (assignments ?? [])
      .map((item) => {
        const s = item.subject as SubjectSummary | SubjectSummary[] | null;
        return Array.isArray(s) ? s[0] : s;
      })
      .filter((s): s is SubjectSummary => Boolean(s?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // 3. Fetch Questions
  const subjectFilter = params?.subjectId ?? 'all';
  const typeFilter = params?.type ?? 'all';
  const searchFilter = (params?.query ?? '').trim();

  let questionsQuery = supabase
    .from('question_bank')
    .select(
      `
      id,
      subject_id,
      created_by,
      question_type,
      question_text,
      explanation,
      created_at,
      updated_at,
      subject:subjects(id, name, code),
      options:question_options(option_key, option_text, position),
      answer_key:question_answer_keys(correct_option_key, model_answer, grading_rubric)
    `,
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (userRole === 'teacher') {
    questionsQuery = questionsQuery.eq('created_by', user.id);
  }

  if (subjectFilter !== 'all') {
    questionsQuery = questionsQuery.eq('subject_id', subjectFilter);
  }

  if (typeFilter === 'multiple_choice' || typeFilter === 'essay') {
    questionsQuery = questionsQuery.eq('question_type', typeFilter);
  }

  if (searchFilter) {
    questionsQuery = questionsQuery.ilike('question_text', `%${searchFilter}%`);
  }

  const { data: rawQuestions, error: questionsError } = await questionsQuery;

  if (questionsError) {
    console.error('Could not fetch questions from question_bank:', questionsError.code, questionsError.message);
  }

  const questions: BankQuestion[] = (rawQuestions ?? []).map((row) => {
    const rawSubject = row.subject as SubjectSummary | SubjectSummary[] | null;
    const subject = Array.isArray(rawSubject) ? rawSubject[0] ?? null : rawSubject ?? null;

    const rawOptions = (row.options ?? []) as QuestionOption[];
    const sortedOptions = [...rawOptions].sort((a, b) => a.position - b.position);

    const rawAnswerKey = row.answer_key as QuestionAnswerKey | QuestionAnswerKey[] | null;
    const answerKey = Array.isArray(rawAnswerKey) ? rawAnswerKey[0] ?? null : rawAnswerKey ?? null;

    return {
      id: row.id,
      subject_id: row.subject_id,
      created_by: row.created_by,
      question_type: row.question_type as 'multiple_choice' | 'essay',
      question_text: row.question_text,
      explanation: row.explanation,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject,
      options: sortedOptions,
      answer_key: answerKey,
    };
  });

  const multipleChoiceCount = questions.filter((q) => q.question_type === 'multiple_choice').length;
  const essayCount = questions.filter((q) => q.question_type === 'essay').length;

  return {
    teacherName,
    userRole,
    userId: user.id,
    assignedSubjects,
    questions,
    totalCount: questions.length,
    multipleChoiceCount,
    essayCount,
    filters: {
      subjectId: subjectFilter,
      type: typeFilter,
      query: searchFilter,
    },
  };
}
