import { sanitizeVietnameseText } from '@/lib/utils';
import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { BankQuestion, SubjectSummary } from '@/lib/question-bank';
import { cleanExamInstructions, isAutoGradeEssay, isCameraRequired } from '@/lib/exam-auto-grade';

export type TeacherClassSummary = {
  id: string;
  name: string;
  class_code: string;
  subject_id: string;
  academic_year: string;
};

export type DraftExamInitialData = {
  id: string;
  subject_id: string;
  title: string;
  instructions: string;
  duration_minutes: number;
  max_attempts: number;
  available_from: string | null;
  available_until: string | null;
  require_camera: boolean;
  auto_grade_essay: boolean;
  status: 'draft' | 'published' | 'closed' | 'archived';
  selectedClassIds: string[];
  selectedQuestions: {
    questionId: string;
    points: number;
  }[];
};

export type TeacherExamCreateData = {
  teacherName: string;
  assignedSubjects: SubjectSummary[];
  classes: TeacherClassSummary[];
  questions: BankQuestion[];
  initialExam?: DraftExamInitialData | null;
};

export async function getTeacherExamCreateData(editId?: string): Promise<TeacherExamCreateData> {
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

  const teacherName = sanitizeVietnameseText(profile?.full_name) || user.email || 'Giảng viên';

  // 1.5. Nếu có editId, fetch thông tin bản nháp cần nạp
  let initialExam: DraftExamInitialData | null = null;
  let draftSubjectId: string | null = null;

  if (editId) {
    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select(`
        id, subject_id, title, instructions, duration_minutes, max_attempts,
        available_from, available_until, status, created_by,
        require_camera, auto_grade_essay,
        exam_classes(class_id),
        exam_questions(id, source_question_id, points, position)
      `)
      .eq('id', editId)
      .maybeSingle();

    if (examData && !examErr) {
      const isOwner = examData.created_by === user.id;
      const isAdmin = userRole === 'admin';
      if (isOwner || isAdmin) {
        draftSubjectId = examData.subject_id;
        const rawClasses = (examData.exam_classes ?? []) as { class_id: string }[];
        const selectedClassIds = rawClasses.map((c) => c.class_id).filter(Boolean);

        const rawQuestions = (examData.exam_questions ?? []) as {
          id: string;
          source_question_id: string | null;
          points: number;
          position: number;
        }[];

        const sortedQuestions = [...rawQuestions].sort((a, b) => a.position - b.position);
        const selectedQuestions = sortedQuestions
          .filter((q) => Boolean(q.source_question_id))
          .map((q) => ({
            questionId: String(q.source_question_id),
            points: Number(q.points) || 1,
          }));

        const requireCamera = isCameraRequired(examData);
        const autoGradeEssay = isAutoGradeEssay(examData);
        const instructionsClean = cleanExamInstructions(examData.instructions) || '';

        initialExam = {
          id: examData.id,
          subject_id: examData.subject_id,
          title: examData.title,
          instructions: instructionsClean,
          duration_minutes: examData.duration_minutes || 45,
          max_attempts: examData.max_attempts || 1,
          available_from: examData.available_from,
          available_until: examData.available_until,
          require_camera: requireCamera,
          auto_grade_essay: autoGradeEssay,
          status: examData.status,
          selectedClassIds,
          selectedQuestions,
        };
      }
    }
  }

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

    // Nếu sửa bản nháp của một môn chưa có trong assignments, tự động nạp thêm môn đó
    if (draftSubjectId && !subjectIds.includes(draftSubjectId)) {
      const { data: draftSub } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('id', draftSubjectId)
        .maybeSingle();
      if (draftSub) {
        assignedSubjects.unshift(draftSub);
        subjectIds.unshift(draftSub.id);
      }
    }
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
    initialExam,
  };
}
