-- E-Learning + online exams + AI baseline for a new Supabase project.
-- Run once in the Supabase SQL editor. Do not run against an existing production schema without review.

CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'essay');
CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'closed', 'archived');
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'pending_grading', 'completed', 'voided');
CREATE TYPE public.ai_job_status AS ENUM ('queued', 'processing', 'needs_review', 'completed', 'failed');

-- User identity and authorization. Role is kept separate from editable profile data.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_role(p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ur.role
  FROM public.user_roles AS ur
  WHERE ur.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Student'
  );

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill users that existed before this schema was installed.
INSERT INTO public.profiles (id, full_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'Student'
  )
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'student'
FROM public.profiles AS p
ON CONFLICT (user_id) DO NOTHING;

-- Academic organization.
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CHECK (length(trim(code)) > 0),
  CHECK (length(trim(name)) > 0)
);

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  class_code text NOT NULL,
  name text NOT NULL,
  academic_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (class_code, academic_year),
  CHECK (length(trim(class_code)) > 0),
  CHECK (length(trim(name)) > 0),
  CHECK (length(trim(academic_year)) > 0)
);

CREATE TABLE public.teacher_subject_assignments (
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE public.class_memberships (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- Question bank. Correct answers and rubrics are deliberately stored separately.
CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  question_type public.question_type NOT NULL,
  question_text text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CHECK (length(trim(question_text)) > 0)
);

CREATE TABLE public.question_options (
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  option_key char(1) NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D')),
  option_text text NOT NULL,
  position smallint NOT NULL CHECK (position > 0),
  PRIMARY KEY (question_id, option_key),
  UNIQUE (question_id, position),
  CHECK (length(trim(option_text)) > 0)
);

CREATE TABLE public.question_answer_keys (
  question_id uuid PRIMARY KEY REFERENCES public.question_bank(id) ON DELETE CASCADE,
  correct_option_key char(1),
  model_answer text,
  grading_rubric text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (question_id, correct_option_key)
    REFERENCES public.question_options(question_id, option_key)
    ON DELETE RESTRICT,
  CHECK (correct_option_key IS NULL OR correct_option_key IN ('A', 'B', 'C', 'D'))
);

-- An exam is assigned to one or more classes. Publishing and creating snapshots
-- should be done by a server-side transaction, not by a browser-side table update.
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  instructions text,
  duration_minutes integer NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  max_attempts integer NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
  available_from timestamptz,
  available_until timestamptz,
  status public.exam_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from),
  CHECK (length(trim(title)) > 0)
);

CREATE TABLE public.exam_classes (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, class_id)
);

-- Snapshot prompt/options so editing the source bank cannot silently change a published exam.
CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  source_question_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position > 0),
  question_type public.question_type NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  points numeric(7, 2) NOT NULL DEFAULT 1 CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, position),
  UNIQUE (id, exam_id),
  CHECK (length(trim(question_text)) > 0),
  CHECK (
    CASE
      WHEN jsonb_typeof(options) <> 'array' THEN false
      WHEN question_type = 'multiple_choice' THEN jsonb_array_length(options) BETWEEN 2 AND 4
      ELSE jsonb_array_length(options) = 0
    END
  )
);

-- Private per-exam answer key/rubric snapshot. Never grant this table to students.
CREATE TABLE public.exam_answer_keys (
  exam_question_id uuid PRIMARY KEY REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  correct_option_key char(1),
  model_answer text,
  grading_rubric text,
  explanation text,
  CHECK (correct_option_key IS NULL OR correct_option_key IN ('A', 'B', 'C', 'D'))
);

-- Attempt timing/state is server controlled. Results and grading are kept separately.
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  submitted_at timestamptz,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  UNIQUE (exam_id, student_id, attempt_no),
  UNIQUE (id, exam_id),
  UNIQUE (id, student_id),
  CHECK (ends_at > started_at),
  CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);

CREATE UNIQUE INDEX exam_attempts_one_active_uidx
  ON public.exam_attempts (exam_id, student_id)
  WHERE status = 'in_progress';

CREATE TABLE public.student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  exam_question_id uuid NOT NULL,
  selected_option char(1) CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
  answer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, exam_question_id),
  FOREIGN KEY (attempt_id, exam_id)
    REFERENCES public.exam_attempts(id, exam_id) ON DELETE CASCADE,
  FOREIGN KEY (exam_question_id, exam_id)
    REFERENCES public.exam_questions(id, exam_id) ON DELETE CASCADE
);

CREATE TABLE public.student_answer_grades (
  attempt_id uuid NOT NULL,
  exam_question_id uuid NOT NULL,
  awarded_points numeric(7, 2) NOT NULL DEFAULT 0 CHECK (awarded_points >= 0),
  feedback text,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at timestamptz,
  PRIMARY KEY (attempt_id, exam_question_id),
  FOREIGN KEY (attempt_id, exam_question_id)
    REFERENCES public.student_answers(attempt_id, exam_question_id) ON DELETE CASCADE
);

CREATE TABLE public.attempt_results (
  attempt_id uuid PRIMARY KEY REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  total_score numeric(8, 2) NOT NULL CHECK (total_score >= 0),
  released_at timestamptz,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications are durable rows; Realtime is only a delivery mechanism.
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- AI generation stores job state/output for teacher review, not auto-published questions.
CREATE TABLE public.ai_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  status public.ai_job_status NOT NULL DEFAULT 'queued',
  source_file_name text,
  generated_questions jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (generated_questions IS NULL OR jsonb_typeof(generated_questions) = 'array')
);

CREATE TABLE public.ai_tutor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, student_id),
  FOREIGN KEY (attempt_id, student_id)
    REFERENCES public.exam_attempts(id, student_id) ON DELETE CASCADE
);

CREATE TABLE public.ai_tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_tutor_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('student', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(content)) > 0)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER question_bank_set_updated_at
BEFORE UPDATE ON public.question_bank
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER question_answer_keys_set_updated_at
BEFORE UPDATE ON public.question_answer_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER exams_set_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER student_answers_set_updated_at
BEFORE UPDATE ON public.student_answers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER attempt_results_set_updated_at
BEFORE UPDATE ON public.attempt_results
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ai_generation_jobs_set_updated_at
BEFORE UPDATE ON public.ai_generation_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index foreign-key/query paths not already covered by PK/UNIQUE indexes.
CREATE INDEX classes_teacher_subject_idx
  ON public.classes (teacher_id, subject_id);
CREATE INDEX teacher_subject_assignments_subject_idx
  ON public.teacher_subject_assignments (subject_id, teacher_id);
CREATE INDEX class_memberships_student_idx
  ON public.class_memberships (student_id, class_id);
CREATE INDEX question_bank_owner_subject_idx
  ON public.question_bank (created_by, subject_id, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX question_bank_subject_idx
  ON public.question_bank (subject_id)
  WHERE archived_at IS NULL;
CREATE INDEX exams_creator_created_idx
  ON public.exams (created_by, created_at DESC);
CREATE INDEX exams_subject_status_idx
  ON public.exams (subject_id, status, created_at DESC);
CREATE INDEX exam_classes_class_idx
  ON public.exam_classes (class_id, exam_id);
CREATE INDEX exam_questions_source_idx
  ON public.exam_questions (source_question_id)
  WHERE source_question_id IS NOT NULL;
CREATE INDEX exam_attempts_student_recent_idx
  ON public.exam_attempts (student_id, started_at DESC);
CREATE INDEX exam_attempts_expiring_idx
  ON public.exam_attempts (ends_at)
  WHERE status = 'in_progress';
CREATE INDEX exam_attempts_exam_status_idx
  ON public.exam_attempts (exam_id, status, submitted_at DESC);
CREATE INDEX student_answers_exam_idx
  ON public.student_answers (exam_id, exam_question_id);
CREATE INDEX notifications_user_recent_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX ai_generation_jobs_teacher_recent_idx
  ON public.ai_generation_jobs (teacher_id, created_at DESC);
CREATE INDEX ai_generation_jobs_queue_idx
  ON public.ai_generation_jobs (created_at)
  WHERE status IN ('queued', 'processing');
CREATE INDEX ai_tutor_messages_conversation_recent_idx
  ON public.ai_tutor_messages (conversation_id, created_at);

-- Helpers are SECURITY DEFINER to avoid recursive RLS policy evaluation.
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_subject(
  p_subject_id uuid,
  p_teacher_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (p_teacher_id = (SELECT auth.uid()) OR public.has_role('admin'))
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS role_record
      WHERE role_record.user_id = p_teacher_id
        AND role_record.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1
      FROM public.teacher_subject_assignments AS assignment
      WHERE assignment.teacher_id = p_teacher_id
        AND assignment.subject_id = p_subject_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_class_staff(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1
    FROM public.classes AS c
    WHERE c.id = p_class_id
      AND c.teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(c.subject_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(p_class_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_memberships AS cm
    WHERE cm.class_id = p_class_id AND cm.student_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exam_manager(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR (
    public.has_role('teacher') AND EXISTS (
    SELECT 1 FROM public.exams AS e
    WHERE e.id = p_exam_id AND e.created_by = (SELECT auth.uid())
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_exam_manager(p_exam_id) OR EXISTS (
    SELECT 1
    FROM public.exams AS e
    JOIN public.exam_classes AS ec ON ec.exam_id = e.id
    JOIN public.class_memberships AS cm ON cm.class_id = ec.class_id
    WHERE e.id = p_exam_id
      AND e.status = 'published'
      AND cm.student_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_subject(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1
    FROM public.subjects AS s
    WHERE s.id = p_subject_id
      AND s.archived_at IS NULL
      AND (
        public.is_teacher_assigned_to_subject(s.id)
        OR (
          public.has_role('student')
          AND EXISTS (
            SELECT 1
            FROM public.classes AS c
            JOIN public.class_memberships AS cm ON cm.class_id = c.id
            WHERE c.subject_id = s.id
              AND c.archived_at IS NULL
              AND cm.student_id = (SELECT auth.uid())
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.question_bank AS qb
    WHERE qb.id = p_question_id
      AND qb.created_by = (SELECT auth.uid())
      AND public.has_role('teacher')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.exams AS e
    WHERE e.id = p_exam_id
      AND e.created_by = (SELECT auth.uid())
      AND e.status = 'draft'
      AND public.has_role('teacher')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_assign_exam_to_class(p_exam_id uuid, p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.can_edit_exam(p_exam_id)
    AND public.is_class_staff(p_class_id)
    AND EXISTS (
      SELECT 1
      FROM public.exams AS e
      JOIN public.classes AS c ON c.id = p_class_id
      WHERE e.id = p_exam_id AND e.subject_id = c.subject_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_write_answer(p_attempt_id uuid, p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exam_attempts AS ea
    WHERE ea.id = p_attempt_id
      AND ea.exam_id = p_exam_id
      AND ea.student_id = (SELECT auth.uid())
      AND ea.status = 'in_progress'
      AND ea.ends_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.publish_exam(p_exam_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status public.exam_status;
BEGIN
  IF NOT public.can_edit_exam(p_exam_id) THEN
    RAISE EXCEPTION 'Not authorized to publish this exam' USING ERRCODE = '42501';
  END IF;

  SELECT e.status INTO v_status
  FROM public.exams AS e
  WHERE e.id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft exams can be published' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_classes AS ec WHERE ec.exam_id = p_exam_id
  ) THEN
    RAISE EXCEPTION 'Assign the exam to at least one class before publishing' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_questions AS eq WHERE eq.exam_id = p_exam_id
  ) THEN
    RAISE EXCEPTION 'An exam must contain at least one question' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.exam_classes AS ec
    JOIN public.classes AS c ON c.id = ec.class_id
    JOIN public.exams AS e ON e.id = ec.exam_id
    WHERE ec.exam_id = p_exam_id AND c.subject_id <> e.subject_id
  ) OR EXISTS (
    SELECT 1
    FROM public.exam_questions AS eq
    JOIN public.question_bank AS qb ON qb.id = eq.source_question_id
    JOIN public.exams AS e ON e.id = eq.exam_id
    WHERE eq.exam_id = p_exam_id AND qb.subject_id <> e.subject_id
  ) THEN
    RAISE EXCEPTION 'Exam, assigned classes, and source questions must use the same subject' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.exam_questions AS eq
    LEFT JOIN public.exam_answer_keys AS ak ON ak.exam_question_id = eq.id
    WHERE eq.exam_id = p_exam_id
      AND (
        (
          eq.question_type = 'multiple_choice'
          AND (
            ak.correct_option_key IS NULL
            OR NOT (eq.options @> jsonb_build_array(
              jsonb_build_object('key', ak.correct_option_key::text)
            ))
            OR (
              SELECT count(DISTINCT option_item.value ->> 'key')
              FROM jsonb_array_elements(eq.options) AS option_item(value)
            ) <> jsonb_array_length(eq.options)
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(eq.options) AS option_item(value)
              WHERE jsonb_typeof(option_item.value) <> 'object'
                OR option_item.value ->> 'key' NOT IN ('A', 'B', 'C', 'D')
                OR NULLIF(trim(option_item.value ->> 'text'), '') IS NULL
            )
          )
        )
        OR (
          eq.question_type = 'essay'
          AND COALESCE(
            NULLIF(trim(ak.model_answer), ''),
            NULLIF(trim(ak.grading_rubric), '')
          ) IS NULL
        )
      )
  ) THEN
    RAISE EXCEPTION 'Every question needs a valid answer key or grading rubric' USING ERRCODE = '22023';
  END IF;

  UPDATE public.exams
  SET status = 'published', published_at = now()
  WHERE id = p_exam_id;

  RETURN p_exam_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_class_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_teacher_assigned_to_subject(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_class_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_exam_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_exam(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_subject(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_question(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_exam(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_assign_exam_to_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_answer(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_assigned_to_subject(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_exam_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_subject(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_question(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_exam_to_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_answer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_exam(uuid) TO authenticated;

-- Enable row-level security on every exposed table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answer_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Profiles and role lookup. Users cannot update their own role.
CREATE POLICY profiles_read_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_role('admin'));
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY user_roles_read_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role('admin'));

REVOKE ALL ON TABLE public.teacher_subject_assignments FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.teacher_subject_assignments TO authenticated;
CREATE POLICY teacher_subject_assignments_read ON public.teacher_subject_assignments
  FOR SELECT TO authenticated
  USING (public.has_role('admin') OR teacher_id = (SELECT auth.uid()));
CREATE POLICY teacher_subject_assignments_admin_insert ON public.teacher_subject_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS ur
      WHERE ur.user_id = teacher_id AND ur.role = 'teacher'
    )
  );
CREATE POLICY teacher_subject_assignments_admin_delete ON public.teacher_subject_assignments
  FOR DELETE TO authenticated
  USING (public.has_role('admin'));

CREATE POLICY subjects_read_role_scoped ON public.subjects
  FOR SELECT TO authenticated USING (public.can_view_subject(id));
CREATE POLICY subjects_insert_admin ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'));
CREATE POLICY subjects_update_admin ON public.subjects
  FOR UPDATE TO authenticated USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));
CREATE POLICY subjects_delete_admin ON public.subjects
  FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY classes_read_staff_or_member ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_class_staff(id) OR public.is_class_member(id));
CREATE POLICY classes_insert_teacher ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin') OR
    (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  );
CREATE POLICY classes_update_staff ON public.classes
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin') OR (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  )
  WITH CHECK (
    public.has_role('admin') OR (
      public.has_role('teacher')
      AND teacher_id = (SELECT auth.uid())
      AND public.is_teacher_assigned_to_subject(subject_id)
    )
  );
CREATE POLICY classes_delete_admin ON public.classes
  FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY memberships_read_self_or_staff ON public.class_memberships
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR public.is_class_staff(class_id));
CREATE POLICY memberships_insert_staff ON public.class_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_class_staff(class_id));
CREATE POLICY memberships_delete_staff ON public.class_memberships
  FOR DELETE TO authenticated USING (public.is_class_staff(class_id));

-- Teachers manage their own bank; students receive only frozen exam snapshots.
CREATE POLICY question_bank_teacher_read ON public.question_bank
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.has_role('admin'));
CREATE POLICY question_bank_teacher_insert ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin') OR
    (public.has_role('teacher') AND created_by = (SELECT auth.uid()))
  );
CREATE POLICY question_bank_teacher_update ON public.question_bank
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin') OR
    (public.has_role('teacher') AND created_by = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.has_role('admin') OR
    (public.has_role('teacher') AND created_by = (SELECT auth.uid()))
  );
CREATE POLICY question_bank_teacher_delete ON public.question_bank
  FOR DELETE TO authenticated
  USING (
    public.has_role('admin') OR
    (public.has_role('teacher') AND created_by = (SELECT auth.uid()))
  );

CREATE POLICY question_options_teacher_all ON public.question_options
  FOR ALL TO authenticated
  USING (public.can_manage_question(question_id))
  WITH CHECK (public.can_manage_question(question_id));
CREATE POLICY question_keys_teacher_all ON public.question_answer_keys
  FOR ALL TO authenticated
  USING (public.can_manage_question(question_id))
  WITH CHECK (public.can_manage_question(question_id));

CREATE POLICY exams_read_assigned ON public.exams
  FOR SELECT TO authenticated USING (public.can_view_exam(id));
CREATE POLICY exams_insert_teacher ON public.exams
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'draft' AND (
      public.has_role('admin') OR
      (public.has_role('teacher') AND created_by = (SELECT auth.uid()))
    )
  );
CREATE POLICY exams_update_draft ON public.exams
  FOR UPDATE TO authenticated
  USING (public.is_exam_manager(id) AND status = 'draft')
  WITH CHECK (public.is_exam_manager(id) AND status = 'draft');
CREATE POLICY exams_delete_draft ON public.exams
  FOR DELETE TO authenticated
  USING (public.is_exam_manager(id) AND status = 'draft');

CREATE POLICY exam_classes_staff_all ON public.exam_classes
  FOR ALL TO authenticated
  USING (public.can_assign_exam_to_class(exam_id, class_id))
  WITH CHECK (public.can_assign_exam_to_class(exam_id, class_id));
CREATE POLICY exam_classes_staff_read ON public.exam_classes
  FOR SELECT TO authenticated
  USING (public.is_exam_manager(exam_id));

CREATE POLICY exam_questions_read_assigned ON public.exam_questions
  FOR SELECT TO authenticated USING (public.can_view_exam(exam_id));
CREATE POLICY exam_questions_staff_write ON public.exam_questions
  FOR ALL TO authenticated
  USING (public.can_edit_exam(exam_id))
  WITH CHECK (public.can_edit_exam(exam_id));

CREATE POLICY exam_keys_staff_read ON public.exam_answer_keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_questions AS eq
      WHERE eq.id = exam_question_id AND public.is_exam_manager(eq.exam_id)
    )
  );
CREATE POLICY exam_keys_staff_only ON public.exam_answer_keys
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_questions AS eq
      WHERE eq.id = exam_question_id AND public.can_edit_exam(eq.exam_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_questions AS eq
      WHERE eq.id = exam_question_id AND public.can_edit_exam(eq.exam_id)
    )
  );

CREATE POLICY attempts_read_owner_or_exam_staff ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR public.is_exam_manager(exam_id));
-- No direct INSERT/UPDATE/DELETE policy: start, submit, and grade through server-side
-- transactions/RPCs so clients cannot forge ends_at, status, or scores.

CREATE POLICY answers_read_owner_or_exam_staff ON public.student_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id
        AND (ea.student_id = (SELECT auth.uid()) OR public.is_exam_manager(ea.exam_id))
    )
  );
CREATE POLICY answers_insert_during_attempt ON public.student_answers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_answer(attempt_id, exam_id));
CREATE POLICY answers_update_during_attempt ON public.student_answers
  FOR UPDATE TO authenticated
  USING (public.can_write_answer(attempt_id, exam_id))
  WITH CHECK (public.can_write_answer(attempt_id, exam_id));

CREATE POLICY answer_grades_staff_read ON public.student_answer_grades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );
CREATE POLICY answer_grades_student_released_read ON public.student_answer_grades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attempt_results AS ar
      JOIN public.exam_attempts AS ea ON ea.id = ar.attempt_id
      WHERE ea.id = attempt_id
        AND ea.student_id = (SELECT auth.uid())
        AND ar.released_at IS NOT NULL
    )
  );
CREATE POLICY results_staff_read ON public.attempt_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );
CREATE POLICY results_student_released_read ON public.attempt_results
  FOR SELECT TO authenticated
  USING (
    released_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND ea.student_id = (SELECT auth.uid())
    )
  );

CREATE POLICY notifications_read_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_mark_read_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY generation_jobs_teacher_read ON public.ai_generation_jobs
  FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR public.has_role('admin'));

CREATE POLICY tutor_conversations_owner ON public.ai_tutor_conversations
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY tutor_conversations_insert_owner ON public.ai_tutor_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id
        AND ea.student_id = (SELECT auth.uid())
        AND ea.status IN ('pending_grading', 'completed')
    )
  );
CREATE POLICY tutor_messages_read_owner ON public.ai_tutor_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutor_conversations AS c
      WHERE c.id = conversation_id AND c.student_id = (SELECT auth.uid())
    )
  );
CREATE POLICY tutor_messages_student_insert ON public.ai_tutor_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'student' AND EXISTS (
      SELECT 1 FROM public.ai_tutor_conversations AS c
      WHERE c.id = conversation_id AND c.student_id = (SELECT auth.uid())
    )
  );

-- Explicit grants: RLS controls rows; column grants protect roles and score fields.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles, public.user_roles, public.subjects, public.classes,
  public.class_memberships, public.question_bank, public.question_options,
  public.question_answer_keys, public.exams, public.exam_classes,
  public.exam_questions, public.exam_answer_keys, public.exam_attempts,
  public.student_answers, public.student_answer_grades, public.attempt_results,
  public.notifications, public.ai_generation_jobs, public.ai_tutor_conversations,
  public.ai_tutor_messages TO authenticated;

GRANT UPDATE (full_name) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT INSERT, DELETE ON public.class_memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.question_bank, public.question_options,
  public.question_answer_keys TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams, public.exam_classes,
  public.exam_questions, public.exam_answer_keys TO authenticated;
GRANT INSERT (attempt_id, exam_id, exam_question_id, selected_option, answer_text),
  UPDATE (selected_option, answer_text)
  ON public.student_answers TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT INSERT (attempt_id, student_id, title)
  ON public.ai_tutor_conversations TO authenticated;
GRANT INSERT (conversation_id, sender, content)
  ON public.ai_tutor_messages TO authenticated;

-- Intentionally no client write grants for user_roles, attempts, grades, results,
-- AI generation jobs, answer keys for published exams, or assistant chat messages.
-- Use trusted server code/RPCs for role assignment, publishing, attempt lifecycle,
-- grading, result release, AI job updates, and assistant message insertion.
