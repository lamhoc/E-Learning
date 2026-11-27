import 'server-only';

import { redirect } from 'next/navigation';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  QuestionAnswerKeySchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';

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
  const { user, role } = await getCurrentUserWithRole();

  if (!user) redirect('/login');
  if (role !== 'teacher' && role !== 'admin') redirect('/subjects');

  const { fullName } = await getCurrentProfile();
  const teacherName = sanitizeVietnameseText(fullName) || user.email || 'Giảng viên';

  const ds = await getDataSource();

  let assignedSubjects: SubjectSummary[] = [];
  if (role === 'admin') {
    const subjectsData = await ds.getRepository(SubjectSchema).find({
      select: { id: true, name: true, code: true },
      order: { name: 'ASC' },
    });
    assignedSubjects = subjectsData;
  } else {
    const assignments = await ds.getRepository(TeacherSubjectAssignmentSchema).find({
      select: { subject_id: true },
      where: { teacher_id: user.id },
    });
    const assignedIds = assignments.map((a) => a.subject_id);
    if (assignedIds.length > 0) {
      assignedSubjects = await ds.getRepository(SubjectSchema).find({
        select: { id: true, name: true, code: true },
        where: { id: In(assignedIds) },
        order: { name: 'ASC' },
      });
    }
  }

  const subjectFilter = params?.subjectId ?? 'all';
  const typeFilter = params?.type ?? 'all';
  const searchFilter = (params?.query ?? '').trim();

  const qb = ds
    .getRepository(QuestionBankSchema)
    .createQueryBuilder('q')
    .where('q.archived_at IS NULL')
    .orderBy('q.created_at', 'DESC');

  if (role === 'teacher') {
    qb.andWhere('q.created_by = :userId', { userId: user.id });
  }
  if (subjectFilter !== 'all') {
    qb.andWhere('q.subject_id = :subjectId', { subjectId: subjectFilter });
  }
  if (typeFilter === 'multiple_choice' || typeFilter === 'essay') {
    qb.andWhere('q.question_type = :qType', { qType: typeFilter });
  }
  if (searchFilter) {
    qb.andWhere('LOWER(q.question_text) LIKE :search', {
      search: `%${searchFilter.toLowerCase()}%`,
    });
  }

  const rawQuestions = await qb.getMany();
  const qIds = rawQuestions.map((q) => q.id);
  const sIds = Array.from(new Set(rawQuestions.map((q) => q.subject_id)));

  const [subjects, optionsRows, keysRows] = qIds.length
    ? await Promise.all([
        sIds.length
          ? ds.getRepository(SubjectSchema).find({ select: { id: true, name: true, code: true }, where: { id: In(sIds) } })
          : Promise.resolve([]),
        ds.getRepository(QuestionOptionSchema).find({ where: { question_id: In(qIds) } }),
        ds.getRepository(QuestionAnswerKeySchema).find({ where: { question_id: In(qIds) } }),
      ])
    : [[], [], []];

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const optionsByQ = new Map<string, QuestionOption[]>();
  for (const opt of optionsRows) {
    const arr = optionsByQ.get(opt.question_id) ?? [];
    arr.push({
      option_key: opt.option_key.trim() as 'A' | 'B' | 'C' | 'D',
      option_text: opt.option_text,
      position: opt.position,
    });
    optionsByQ.set(opt.question_id, arr);
  }
  const keyByQ = new Map(keysRows.map((k) => [k.question_id, k]));

  const questions: BankQuestion[] = rawQuestions.map((row) => {
    const opts = (optionsByQ.get(row.id) ?? []).sort((a, b) => a.position - b.position);
    const keyRow = keyByQ.get(row.id);

    return {
      id: row.id,
      subject_id: row.subject_id,
      created_by: row.created_by,
      question_type: row.question_type,
      question_text: row.question_text,
      explanation: row.explanation,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject: subjectMap.get(row.subject_id) ?? null,
      options: opts,
      answer_key: keyRow
        ? {
            correct_option_key: (keyRow.correct_option_key?.trim() as 'A' | 'B' | 'C' | 'D') ?? null,
            model_answer: keyRow.model_answer,
            grading_rubric: keyRow.grading_rubric,
          }
        : null,
    };
  });

  const multipleChoiceCount = questions.filter((q) => q.question_type === 'multiple_choice').length;
  const essayCount = questions.filter((q) => q.question_type === 'essay').length;

  return {
    teacherName,
    userRole: role,
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
