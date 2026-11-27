import 'server-only';

import { redirect } from 'next/navigation';
import { In, IsNull } from 'typeorm';
import { getCurrentUserWithRole, getCurrentProfile } from '@/lib/auth-cache';
import { getDataSource } from '@/lib/db/data-source';
import {
  ClassSchema,
  ExamClassSchema,
  ExamQuestionSchema,
  ExamSchema,
  QuestionAnswerKeySchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
} from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';
import type { BankQuestion, QuestionOption, SubjectSummary } from '@/lib/question-bank';
import {
  cleanExamInstructions,
  isAutoGradeEssay,
  isCameraRequired,
  isShowAnswersAfterSubmit,
} from '@/lib/exam-auto-grade';

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
  show_answers_after_submit: boolean;
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
  const { user, role } = await getCurrentUserWithRole();

  if (!user) redirect('/login');
  if (role !== 'teacher' && role !== 'admin') redirect('/subjects');

  const { fullName } = await getCurrentProfile();
  const teacherName = sanitizeVietnameseText(fullName) || user.email || 'Giảng viên';

  const ds = await getDataSource();
  let initialExam: DraftExamInitialData | null = null;
  let draftSubjectId: string | null = null;

  if (editId) {
    const examData = await ds.getRepository(ExamSchema).findOne({ where: { id: editId } });
    if (examData && (examData.created_by === user.id || role === 'admin')) {
      draftSubjectId = examData.subject_id;
      const [examClasses, examQuestions] = await Promise.all([
        ds.getRepository(ExamClassSchema).find({ where: { exam_id: examData.id } }),
        ds.getRepository(ExamQuestionSchema).find({
          where: { exam_id: examData.id },
          order: { position: 'ASC' },
        }),
      ]);

      initialExam = {
        id: examData.id,
        subject_id: examData.subject_id,
        title: examData.title,
        instructions: cleanExamInstructions(examData.instructions) || '',
        duration_minutes: examData.duration_minutes || 45,
        max_attempts: examData.max_attempts || 1,
        available_from: examData.available_from,
        available_until: examData.available_until,
        require_camera: isCameraRequired(examData),
        auto_grade_essay: isAutoGradeEssay(examData),
        show_answers_after_submit: isShowAnswersAfterSubmit(examData),
        status: examData.status,
        selectedClassIds: examClasses.map((c) => c.class_id),
        selectedQuestions: examQuestions
          .filter((q) => Boolean(q.source_question_id))
          .map((q) => ({
            questionId: String(q.source_question_id),
            points: Number(q.points) || 1,
          })),
      };
    }
  }

  let assignedSubjects: SubjectSummary[] = [];
  if (role === 'admin') {
    assignedSubjects = await ds.getRepository(SubjectSchema).find({
      select: { id: true, name: true, code: true },
      where: { archived_at: IsNull() },
      order: { name: 'ASC' },
    });
  } else {
    const assignments = await ds.getRepository(TeacherSubjectAssignmentSchema).find({
      select: { subject_id: true },
      where: { teacher_id: user.id },
    });
    const ids = assignments.map((a) => a.subject_id);
    if (ids.length > 0) {
      assignedSubjects = await ds.getRepository(SubjectSchema).find({
        select: { id: true, name: true, code: true },
        where: { id: In(ids), archived_at: IsNull() },
        order: { name: 'ASC' },
      });
    }
    if (draftSubjectId && !assignedSubjects.some((s) => s.id === draftSubjectId)) {
      const draftSub = await ds.getRepository(SubjectSchema).findOne({
        select: { id: true, name: true, code: true },
        where: { id: draftSubjectId },
      });
      if (draftSub) assignedSubjects.unshift(draftSub);
    }
  }

  const subjectIds = assignedSubjects.map((s) => s.id);
  const subjectMap = new Map(assignedSubjects.map((s) => [s.id, s]));

  const classWhere: Record<string, unknown> = { archived_at: IsNull() };
  if (role !== 'admin') classWhere.teacher_id = user.id;

  const [classesData, rawQuestions] = await Promise.all([
    ds.getRepository(ClassSchema).find({
      select: { id: true, name: true, class_code: true, subject_id: true, academic_year: true },
      where: classWhere,
      order: { name: 'ASC' },
    }),
    subjectIds.length > 0
      ? ds.getRepository(QuestionBankSchema).find({
          where: { subject_id: In(subjectIds), archived_at: IsNull() },
          order: { created_at: 'DESC' },
        })
      : Promise.resolve([]),
  ]);

  const qIds = rawQuestions.map((q) => q.id);
  const [optionsRows, keysRows] = qIds.length
    ? await Promise.all([
        ds.getRepository(QuestionOptionSchema).find({ where: { question_id: In(qIds) } }),
        ds.getRepository(QuestionAnswerKeySchema).find({ where: { question_id: In(qIds) } }),
      ])
    : [[], []];

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

  const questions: BankQuestion[] = rawQuestions.map((q) => {
    const keyRow = keyByQ.get(q.id);
    return {
      id: q.id,
      subject_id: q.subject_id,
      created_by: q.created_by,
      question_type: q.question_type,
      question_text: q.question_text,
      explanation: q.explanation,
      created_at: q.created_at,
      updated_at: q.updated_at,
      subject: subjectMap.get(q.subject_id) ?? null,
      options: (optionsByQ.get(q.id) ?? []).sort((a, b) => a.position - b.position),
      answer_key: keyRow
        ? {
            correct_option_key: (keyRow.correct_option_key?.trim() as 'A' | 'B' | 'C' | 'D') ?? null,
            model_answer: keyRow.model_answer,
            grading_rubric: keyRow.grading_rubric,
          }
        : null,
    };
  });

  return {
    teacherName,
    assignedSubjects,
    classes: classesData,
    questions,
    initialExam,
  };
}
