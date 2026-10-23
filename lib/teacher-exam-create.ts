import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { BankQuestion, SubjectSummary } from '@/lib/question-bank';

export type TeacherClassSummary = {
  id: string;
  name: string;
  class_code: string;
  subject_id: string;
  academic_year: string;
};

export type TeacherExamCreateData = {
  teacherName: string;
  assignedSubjects: SubjectSummary[];
  classes: TeacherClassSummary[];
  questions: BankQuestion[];
};

export async function getTeacherExamCreateData(): Promise<TeacherExamCreateData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

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

  // 2. Fetch Assigned Subjects
  let assignedSubjects: SubjectSummary[] = [];
  let subjectIds: string[] = [];

  if (userRole === 'admin') {
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, code')
      .is('archived_at', null)
      .order('name');
    assignedSubjects = subjectsData ?? [];
    subjectIds = assignedSubjects.map((s) => s.id);
  } else {
    const { data: assignments } = await supabase
      .from('teacher_subject_assignments')
      .select('subject:subjects(id, name, code, archived_at)')
      .eq('teacher_id', user.id);

    const subs = (assignments ?? [])
      .map((a) => (Array.isArray(a.subject) ? a.subject[0] : a.subject))
      .filter((s): s is { id: string; name: string; code: string; archived_at: string | null } => Boolean(s && !s.archived_at))
      .map(({ id, name, code }) => ({ id, name, code }));

    assignedSubjects = subs;
    subjectIds = subs.map((s) => s.id);
  }

  // 3. Fetch Classes
  let classesQuery = supabase
    .from('classes')
    .select('id, name, class_code, subject_id, academic_year')
    .is('archived_at', null)
    .order('name');

  if (userRole !== 'admin') {
    classesQuery = classesQuery.eq('teacher_id', user.id);
  }

  const { data: classesData } = await classesQuery;
  const classes: TeacherClassSummary[] = (classesData ?? []) as TeacherClassSummary[];

  // 4. Fetch Bank Questions
  let questions: BankQuestion[] = [];
  if (subjectIds.length > 0) {
    const { data: questionsData } = await supabase
      .from('question_bank')
      .select(`
        id, subject_id, created_by, question_type, question_text, explanation, created_at, updated_at,
        subject:subjects(id, name, code),
        options:question_options(option_key, option_text, position),
        answer_key:question_answer_keys(correct_option_key, model_answer, grading_rubric)
      `)
      .in('subject_id', subjectIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    questions = ((questionsData ?? []) as unknown[]).map((row: unknown) => {
      const q = row as Record<string, unknown>;
      const subjectObj = Array.isArray(q.subject) ? q.subject[0] : q.subject;
      const answerKeyObj = Array.isArray(q.answer_key) ? q.answer_key[0] : q.answer_key;
      const rawOptions = (Array.isArray(q.options) ? q.options : []) as {
        option_key: 'A' | 'B' | 'C' | 'D';
        option_text: string;
        position: number;
      }[];

      const sortedOptions = [...rawOptions].sort((a, b) => a.position - b.position);

      return {
        id: String(q.id),
        subject_id: String(q.subject_id),
        created_by: String(q.created_by),
        question_type: q.question_type as 'multiple_choice' | 'essay',
        question_text: String(q.question_text),
        explanation: q.explanation ? String(q.explanation) : null,
        created_at: String(q.created_at),
        updated_at: String(q.updated_at),
        subject: subjectObj as SubjectSummary | null,
        options: sortedOptions,
        answer_key: answerKeyObj ? {
          correct_option_key: answerKeyObj.correct_option_key as 'A' | 'B' | 'C' | 'D' | null,
          model_answer: answerKeyObj.model_answer ? String(answerKeyObj.model_answer) : null,
          grading_rubric: answerKeyObj.grading_rubric ? String(answerKeyObj.grading_rubric) : null,
        } : null,
      };
    });
  }

  return {
    teacherName,
    assignedSubjects,
    classes,
    questions,
  };
}

