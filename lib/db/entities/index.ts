import { EntitySchema } from 'typeorm';
import {
  bigintTransformer,
  createJsonTransformer,
  decimalTransformer,
  isoDateTransformer,
  uuidTransformer,
} from '../transformers';

export type AppRole = 'admin' | 'teacher' | 'student';
export type QuestionType = 'multiple_choice' | 'essay';
export type ExamStatus = 'draft' | 'published' | 'closed' | 'archived';
export type AttemptStatus = 'in_progress' | 'pending_grading' | 'completed' | 'voided';
export type AiJobStatus = 'queued' | 'processing' | 'needs_review' | 'completed' | 'failed';
export type TeacherApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  email_confirmed_at: string | null;
  is_blocked: boolean;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileEntity {
  id: string;
  full_name: string;
  student_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleEntity {
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface InvitationTokenEntity {
  id: string;
  email: string;
  token_hash: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
}

export interface TeacherApplicationEntity {
  user_id: string;
  email: string;
  status: TeacherApplicationStatus;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface SubjectEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface ClassEntity {
  id: string;
  subject_id: string;
  teacher_id: string;
  class_code: string;
  name: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface TeacherSubjectAssignmentEntity {
  teacher_id: string;
  subject_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface ClassMembershipEntity {
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface QuestionBankEntity {
  id: string;
  subject_id: string;
  created_by: string;
  question_type: QuestionType;
  question_text: string;
  explanation: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface QuestionOptionEntity {
  question_id: string;
  option_key: string;
  option_text: string;
  position: number;
}

export interface QuestionAnswerKeyEntity {
  question_id: string;
  correct_option_key: string | null;
  model_answer: string | null;
  grading_rubric: string | null;
  updated_at: string;
}

export interface ExamEntity {
  id: string;
  subject_id: string;
  created_by: string;
  title: string;
  instructions: string | null;
  duration_minutes: number;
  max_attempts: number;
  available_from: string | null;
  available_until: string | null;
  status: ExamStatus;
  require_camera: boolean;
  auto_grade_essay: boolean;
  show_answers_after_submit: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamClassEntity {
  exam_id: string;
  class_id: string;
}

export interface ExamQuestionOptionJson {
  key: string;
  text: string;
  position?: number;
}

export interface ExamQuestionEntity {
  id: string;
  exam_id: string;
  source_question_id: string | null;
  position: number;
  question_type: QuestionType;
  question_text: string;
  options: ExamQuestionOptionJson[];
  points: number;
  created_at: string;
}

export interface ExamAnswerKeyEntity {
  exam_question_id: string;
  correct_option_key: string | null;
  model_answer: string | null;
  grading_rubric: string | null;
  explanation: string | null;
}

export interface ExamAttemptEntity {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_no: number;
  started_at: string;
  ends_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
}

export interface StudentAnswerEntity {
  id: string;
  attempt_id: string;
  exam_id: string;
  exam_question_id: string;
  selected_option: string | null;
  answer_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentAnswerGradeEntity {
  attempt_id: string;
  exam_question_id: string;
  awarded_points: number;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
}

export interface AttemptResultEntity {
  attempt_id: string;
  total_score: number;
  released_at: string | null;
  graded_by: string | null;
  updated_at: string;
}

export interface NotificationEntity {
  id: string;
  user_id: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export interface AiGenerationJobEntity {
  id: string;
  teacher_id: string;
  subject_id: string;
  status: AiJobStatus;
  source_file_name: string | null;
  generated_questions: unknown[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AiTutorConversationEntity {
  id: string;
  attempt_id: string;
  student_id: string;
  title: string | null;
  created_at: string;
}

export interface AiTutorMessageEntity {
  id: string;
  conversation_id: string;
  sender: 'student' | 'assistant';
  content: string;
  created_at: string;
}

export interface ClassMaterialEntity {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  material_type: 'document' | 'video' | 'link';
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  week_number: number;
  created_at: string;
  updated_at: string;
}

export interface ExamProctoringLogEntity {
  id: string;
  attempt_id: string;
  exam_id: string;
  student_id: string;
  violation_type: string;
  switch_count: number;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AssignmentEntity {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  due_date: string;
  max_score: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmissionEntity {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  note: string | null;
  submitted_at: string;
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthOtpEntity {
  id: string;
  email: string;
  otp_hash: string;
  purpose: 'reset_password' | 'register_verify' | 'login_2fa';
  metadata: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

// ============================================================================
// TypeORM EntitySchemas (tương thích 100% Next.js 16 Turbopack không cần decorator)
// ============================================================================

export const UserSchema = new EntitySchema<UserEntity>({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    email: { type: 'nvarchar', length: 255, unique: true },
    password_hash: { type: 'nvarchar', length: 255 },
    email_confirmed_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    is_blocked: { type: 'bit', default: false },
    banned_until: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const ProfileSchema = new EntitySchema<ProfileEntity>({
  name: 'Profile',
  tableName: 'profiles',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    full_name: { type: 'nvarchar', length: 255 },
    student_code: { type: 'nvarchar', length: 32, nullable: true },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const UserRoleSchema = new EntitySchema<UserRoleEntity>({
  name: 'UserRole',
  tableName: 'user_roles',
  columns: {
    user_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    role: { type: 'nvarchar', length: 20, default: 'student' },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const InvitationTokenSchema = new EntitySchema<InvitationTokenEntity>({
  name: 'InvitationToken',
  tableName: 'invitation_tokens',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    email: { type: 'nvarchar', length: 255 },
    token_hash: { type: 'nvarchar', length: 64, unique: true },
    created_by: { type: 'uniqueidentifier', transformer: uuidTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    expires_at: { type: 'datetimeoffset', transformer: isoDateTransformer },
    used_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    used_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
  },
});

export const TeacherApplicationSchema = new EntitySchema<TeacherApplicationEntity>({
  name: 'TeacherApplication',
  tableName: 'teacher_applications',
  columns: {
    user_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    email: { type: 'nvarchar', length: 255 },
    status: { type: 'nvarchar', length: 20, default: 'pending' },
    requested_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    reviewed_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    reviewed_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    review_note: { type: 'nvarchar', length: 500, nullable: true },
  },
});

export const SubjectSchema = new EntitySchema<SubjectEntity>({
  name: 'Subject',
  tableName: 'subjects',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    code: { type: 'nvarchar', length: 64, unique: true },
    name: { type: 'nvarchar', length: 255 },
    description: { type: 'nvarchar', length: 'MAX', nullable: true },
    created_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    archived_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const ClassSchema = new EntitySchema<ClassEntity>({
  name: 'Class',
  tableName: 'classes',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    subject_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    teacher_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    class_code: { type: 'nvarchar', length: 64 },
    name: { type: 'nvarchar', length: 255 },
    academic_year: { type: 'nvarchar', length: 64 },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
    archived_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const TeacherSubjectAssignmentSchema = new EntitySchema<TeacherSubjectAssignmentEntity>({
  name: 'TeacherSubjectAssignment',
  tableName: 'teacher_subject_assignments',
  columns: {
    teacher_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    subject_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    assigned_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    assigned_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const ClassMembershipSchema = new EntitySchema<ClassMembershipEntity>({
  name: 'ClassMembership',
  tableName: 'class_memberships',
  columns: {
    class_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    student_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    enrolled_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const QuestionBankSchema = new EntitySchema<QuestionBankEntity>({
  name: 'QuestionBank',
  tableName: 'question_bank',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    subject_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    created_by: { type: 'uniqueidentifier', transformer: uuidTransformer },
    question_type: { type: 'nvarchar', length: 32 },
    question_text: { type: 'nvarchar', length: 'MAX' },
    explanation: { type: 'nvarchar', length: 'MAX', nullable: true },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
    archived_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const QuestionOptionSchema = new EntitySchema<QuestionOptionEntity>({
  name: 'QuestionOption',
  tableName: 'question_options',
  columns: {
    question_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    option_key: { type: 'nvarchar', length: 1, primary: true },
    option_text: { type: 'nvarchar', length: 'MAX' },
    position: { type: 'smallint' },
  },
});

export const QuestionAnswerKeySchema = new EntitySchema<QuestionAnswerKeyEntity>({
  name: 'QuestionAnswerKey',
  tableName: 'question_answer_keys',
  columns: {
    question_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    correct_option_key: { type: 'nvarchar', length: 1, nullable: true },
    model_answer: { type: 'nvarchar', length: 'MAX', nullable: true },
    grading_rubric: { type: 'nvarchar', length: 'MAX', nullable: true },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const ExamSchema = new EntitySchema<ExamEntity>({
  name: 'Exam',
  tableName: 'exams',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    subject_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    created_by: { type: 'uniqueidentifier', transformer: uuidTransformer },
    title: { type: 'nvarchar', length: 500 },
    instructions: { type: 'nvarchar', length: 'MAX', nullable: true },
    duration_minutes: { type: 'int', default: 45 },
    max_attempts: { type: 'int', default: 1 },
    available_from: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    available_until: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    status: { type: 'nvarchar', length: 20, default: 'draft' },
    require_camera: { type: 'bit', default: false },
    auto_grade_essay: { type: 'bit', default: false },
    show_answers_after_submit: { type: 'bit', default: true },
    published_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const ExamClassSchema = new EntitySchema<ExamClassEntity>({
  name: 'ExamClass',
  tableName: 'exam_classes',
  columns: {
    exam_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    class_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
  },
});

export const ExamQuestionSchema = new EntitySchema<ExamQuestionEntity>({
  name: 'ExamQuestion',
  tableName: 'exam_questions',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    exam_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    source_question_id: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    position: { type: 'int' },
    question_type: { type: 'nvarchar', length: 32 },
    question_text: { type: 'nvarchar', length: 'MAX' },
    options: {
      type: 'nvarchar',
      length: 'MAX',
      default: '[]',
      transformer: createJsonTransformer<ExamQuestionOptionJson[]>([]),
    },
    points: { type: 'decimal', precision: 7, scale: 2, default: 1, transformer: decimalTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const ExamAnswerKeySchema = new EntitySchema<ExamAnswerKeyEntity>({
  name: 'ExamAnswerKey',
  tableName: 'exam_answer_keys',
  columns: {
    exam_question_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    correct_option_key: { type: 'nvarchar', length: 1, nullable: true },
    model_answer: { type: 'nvarchar', length: 'MAX', nullable: true },
    grading_rubric: { type: 'nvarchar', length: 'MAX', nullable: true },
    explanation: { type: 'nvarchar', length: 'MAX', nullable: true },
  },
});

export const ExamAttemptSchema = new EntitySchema<ExamAttemptEntity>({
  name: 'ExamAttempt',
  tableName: 'exam_attempts',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    exam_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    student_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    attempt_no: { type: 'int' },
    started_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    ends_at: { type: 'datetimeoffset', transformer: isoDateTransformer },
    submitted_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    status: { type: 'nvarchar', length: 32, default: 'in_progress' },
  },
});

export const StudentAnswerSchema = new EntitySchema<StudentAnswerEntity>({
  name: 'StudentAnswer',
  tableName: 'student_answers',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    attempt_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    exam_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    exam_question_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    selected_option: { type: 'nvarchar', length: 1, nullable: true },
    answer_text: { type: 'nvarchar', length: 'MAX', nullable: true },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const StudentAnswerGradeSchema = new EntitySchema<StudentAnswerGradeEntity>({
  name: 'StudentAnswerGrade',
  tableName: 'student_answer_grades',
  columns: {
    attempt_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    exam_question_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    awarded_points: { type: 'decimal', precision: 7, scale: 2, default: 0, transformer: decimalTransformer },
    feedback: { type: 'nvarchar', length: 'MAX', nullable: true },
    graded_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    graded_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const AttemptResultSchema = new EntitySchema<AttemptResultEntity>({
  name: 'AttemptResult',
  tableName: 'attempt_results',
  columns: {
    attempt_id: { type: 'uniqueidentifier', primary: true, transformer: uuidTransformer },
    total_score: { type: 'decimal', precision: 8, scale: 2, transformer: decimalTransformer },
    released_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    graded_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const NotificationSchema = new EntitySchema<NotificationEntity>({
  name: 'Notification',
  tableName: 'notifications',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    user_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    title: { type: 'nvarchar', length: 500 },
    message: { type: 'nvarchar', length: 'MAX' },
    data: {
      type: 'nvarchar',
      length: 'MAX',
      default: '{}',
      transformer: createJsonTransformer<Record<string, unknown>>({}),
    },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    read_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const AiGenerationJobSchema = new EntitySchema<AiGenerationJobEntity>({
  name: 'AiGenerationJob',
  tableName: 'ai_generation_jobs',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    teacher_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    subject_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    status: { type: 'nvarchar', length: 32, default: 'queued' },
    source_file_name: { type: 'nvarchar', length: 500, nullable: true },
    generated_questions: {
      type: 'nvarchar',
      length: 'MAX',
      nullable: true,
      transformer: createJsonTransformer<unknown[] | null>(null),
    },
    error_message: { type: 'nvarchar', length: 'MAX', nullable: true },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
    completed_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
  },
});

export const AiTutorConversationSchema = new EntitySchema<AiTutorConversationEntity>({
  name: 'AiTutorConversation',
  tableName: 'ai_tutor_conversations',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    attempt_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    student_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    title: { type: 'nvarchar', length: 500, nullable: true },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const AiTutorMessageSchema = new EntitySchema<AiTutorMessageEntity>({
  name: 'AiTutorMessage',
  tableName: 'ai_tutor_messages',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    conversation_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    sender: { type: 'nvarchar', length: 20 },
    content: { type: 'nvarchar', length: 'MAX' },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const ClassMaterialSchema = new EntitySchema<ClassMaterialEntity>({
  name: 'ClassMaterial',
  tableName: 'class_materials',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    class_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    teacher_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    title: { type: 'nvarchar', length: 500 },
    description: { type: 'nvarchar', length: 'MAX', nullable: true },
    material_type: { type: 'nvarchar', length: 20 },
    file_url: { type: 'nvarchar', length: 1000 },
    file_name: { type: 'nvarchar', length: 500, nullable: true },
    file_size_bytes: { type: 'bigint', nullable: true, transformer: bigintTransformer },
    mime_type: { type: 'nvarchar', length: 255, nullable: true },
    week_number: { type: 'int', default: 1 },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const ExamProctoringLogSchema = new EntitySchema<ExamProctoringLogEntity>({
  name: 'ExamProctoringLog',
  tableName: 'exam_proctoring_logs',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    attempt_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    exam_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    student_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    violation_type: { type: 'nvarchar', length: 64, default: 'tab_switch' },
    switch_count: { type: 'int', default: 1 },
    details: {
      type: 'nvarchar',
      length: 'MAX',
      default: '{}',
      transformer: createJsonTransformer<Record<string, unknown>>({}),
    },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const AssignmentSchema = new EntitySchema<AssignmentEntity>({
  name: 'Assignment',
  tableName: 'assignments',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    class_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    teacher_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    title: { type: 'nvarchar', length: 500 },
    description: { type: 'nvarchar', length: 'MAX', nullable: true },
    attachment_url: { type: 'nvarchar', length: 1000, nullable: true },
    attachment_name: { type: 'nvarchar', length: 500, nullable: true },
    due_date: { type: 'datetimeoffset', transformer: isoDateTransformer },
    max_score: { type: 'decimal', precision: 5, scale: 2, default: 10, transformer: decimalTransformer },
    status: { type: 'nvarchar', length: 20, default: 'published' },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const AssignmentSubmissionSchema = new EntitySchema<AssignmentSubmissionEntity>({
  name: 'AssignmentSubmission',
  tableName: 'assignment_submissions',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    assignment_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    student_id: { type: 'uniqueidentifier', transformer: uuidTransformer },
    file_url: { type: 'nvarchar', length: 1000 },
    file_name: { type: 'nvarchar', length: 500 },
    file_size_bytes: { type: 'bigint', nullable: true, transformer: bigintTransformer },
    note: { type: 'nvarchar', length: 'MAX', nullable: true },
    submitted_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    is_late: { type: 'bit', default: false },
    score: { type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer },
    feedback: { type: 'nvarchar', length: 'MAX', nullable: true },
    graded_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    graded_by: { type: 'uniqueidentifier', nullable: true, transformer: uuidTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
    updated_at: { type: 'datetimeoffset', updateDate: true, transformer: isoDateTransformer },
  },
});

export const AuthOtpSchema = new EntitySchema<AuthOtpEntity>({
  name: 'AuthOtp',
  tableName: 'auth_otps',
  columns: {
    id: { type: 'uniqueidentifier', primary: true, generated: 'uuid', transformer: uuidTransformer },
    email: { type: 'nvarchar', length: 255 },
    otp_hash: { type: 'nvarchar', length: 64 },
    purpose: { type: 'nvarchar', length: 32 },
    metadata: {
      type: 'nvarchar',
      length: 'MAX',
      default: '{}',
      transformer: createJsonTransformer<Record<string, unknown>>({}),
    },
    attempts: { type: 'int', default: 0 },
    max_attempts: { type: 'int', default: 5 },
    expires_at: { type: 'datetimeoffset', transformer: isoDateTransformer },
    consumed_at: { type: 'datetimeoffset', nullable: true, transformer: isoDateTransformer },
    created_at: { type: 'datetimeoffset', createDate: true, transformer: isoDateTransformer },
  },
});

export const ALL_ENTITY_SCHEMAS = [
  UserSchema,
  ProfileSchema,
  UserRoleSchema,
  InvitationTokenSchema,
  TeacherApplicationSchema,
  SubjectSchema,
  ClassSchema,
  TeacherSubjectAssignmentSchema,
  ClassMembershipSchema,
  QuestionBankSchema,
  QuestionOptionSchema,
  QuestionAnswerKeySchema,
  ExamSchema,
  ExamClassSchema,
  ExamQuestionSchema,
  ExamAnswerKeySchema,
  ExamAttemptSchema,
  StudentAnswerSchema,
  StudentAnswerGradeSchema,
  AttemptResultSchema,
  NotificationSchema,
  AiGenerationJobSchema,
  AiTutorConversationSchema,
  AiTutorMessageSchema,
  ClassMaterialSchema,
  ExamProctoringLogSchema,
  AssignmentSchema,
  AssignmentSubmissionSchema,
  AuthOtpSchema,
];
