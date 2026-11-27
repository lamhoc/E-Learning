-- ==============================================================================
-- AutoBank E-Learning (LHU) - SQL Server 2019 Schema Initialization
-- Idempotent T-SQL DDL: tạo đầy đủ 29 bảng, SEQUENCE, ràng buộc FK & Indexes
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'student_code_seq' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE SEQUENCE dbo.student_code_seq AS BIGINT START WITH 1 INCREMENT BY 1;
END;
GO

-- 1. users (Thay thế auth.users của Supabase)
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL CONSTRAINT UQ_users_email UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    email_confirmed_at DATETIMEOFFSET NULL,
    is_blocked BIT NOT NULL CONSTRAINT DF_users_is_blocked DEFAULT 0,
    banned_until DATETIMEOFFSET NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSDATETIMEOFFSET()
  );
END;
GO

-- 2. profiles
IF OBJECT_ID('dbo.profiles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.profiles (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_profiles PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    student_code NVARCHAR(32) NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_profiles_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_profiles_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_profiles_users FOREIGN KEY (id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'profiles_student_code_unique_idx' AND object_id = OBJECT_ID('dbo.profiles'))
BEGIN
  CREATE UNIQUE INDEX profiles_student_code_unique_idx
    ON dbo.profiles (student_code)
    WHERE student_code IS NOT NULL;
END;
GO

-- 3. user_roles
IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_roles (
    user_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_user_roles PRIMARY KEY,
    role NVARCHAR(20) NOT NULL CONSTRAINT DF_user_roles_role DEFAULT N'student'
      CONSTRAINT CK_user_roles_role CHECK (role IN (N'admin', N'teacher', N'student')),
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_user_roles_created_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_user_roles_profiles FOREIGN KEY (user_id) REFERENCES dbo.profiles(id) ON DELETE CASCADE
  );
END;
GO

-- 4. invitation_tokens
IF OBJECT_ID('dbo.invitation_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.invitation_tokens (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_invitation_tokens PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    token_hash NVARCHAR(64) NOT NULL CONSTRAINT UQ_invitation_tokens_hash UNIQUE,
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_invitation_tokens_created_at DEFAULT SYSDATETIMEOFFSET(),
    expires_at DATETIMEOFFSET NOT NULL,
    used_at DATETIMEOFFSET NULL,
    used_by UNIQUEIDENTIFIER NULL,
    CONSTRAINT FK_invitation_tokens_creator FOREIGN KEY (created_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION,
    CONSTRAINT FK_invitation_tokens_used_by FOREIGN KEY (used_by) REFERENCES dbo.users(id) ON DELETE NO ACTION
  );
END;
GO

-- 5. teacher_applications
IF OBJECT_ID('dbo.teacher_applications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.teacher_applications (
    user_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_teacher_applications PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_teacher_applications_status DEFAULT N'pending'
      CONSTRAINT CK_teacher_applications_status CHECK (status IN (N'pending', N'approved', N'rejected')),
    requested_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_teacher_applications_requested_at DEFAULT SYSDATETIMEOFFSET(),
    reviewed_by UNIQUEIDENTIFIER NULL,
    reviewed_at DATETIMEOFFSET NULL,
    review_note NVARCHAR(500) NULL,
    CONSTRAINT FK_teacher_applications_user FOREIGN KEY (user_id) REFERENCES dbo.profiles(id) ON DELETE CASCADE,
    CONSTRAINT FK_teacher_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 6. subjects
IF OBJECT_ID('dbo.subjects', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.subjects (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_subjects PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(64) NOT NULL CONSTRAINT UQ_subjects_code UNIQUE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_subjects_created_at DEFAULT SYSDATETIMEOFFSET(),
    archived_at DATETIMEOFFSET NULL,
    CONSTRAINT FK_subjects_creator FOREIGN KEY (created_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 7. classes
IF OBJECT_ID('dbo.classes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.classes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_classes PRIMARY KEY DEFAULT NEWID(),
    subject_id UNIQUEIDENTIFIER NOT NULL,
    teacher_id UNIQUEIDENTIFIER NOT NULL,
    class_code NVARCHAR(64) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    academic_year NVARCHAR(64) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_classes_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_classes_updated_at DEFAULT SYSDATETIMEOFFSET(),
    archived_at DATETIMEOFFSET NULL,
    CONSTRAINT UQ_classes_code_year UNIQUE (class_code, academic_year),
    CONSTRAINT FK_classes_subject FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id) ON DELETE NO ACTION,
    CONSTRAINT FK_classes_teacher FOREIGN KEY (teacher_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 8. teacher_subject_assignments
IF OBJECT_ID('dbo.teacher_subject_assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.teacher_subject_assignments (
    teacher_id UNIQUEIDENTIFIER NOT NULL,
    subject_id UNIQUEIDENTIFIER NOT NULL,
    assigned_by UNIQUEIDENTIFIER NULL,
    assigned_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_tsa_assigned_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_teacher_subject_assignments PRIMARY KEY (teacher_id, subject_id),
    CONSTRAINT FK_tsa_teacher FOREIGN KEY (teacher_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION,
    CONSTRAINT FK_tsa_subject FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id) ON DELETE CASCADE,
    CONSTRAINT FK_tsa_assigned_by FOREIGN KEY (assigned_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 9. class_memberships
IF OBJECT_ID('dbo.class_memberships', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.class_memberships (
    class_id UNIQUEIDENTIFIER NOT NULL,
    student_id UNIQUEIDENTIFIER NOT NULL,
    enrolled_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_class_memberships_enrolled_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_class_memberships PRIMARY KEY (class_id, student_id),
    CONSTRAINT FK_cm_class FOREIGN KEY (class_id) REFERENCES dbo.classes(id) ON DELETE CASCADE,
    CONSTRAINT FK_cm_student FOREIGN KEY (student_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 10. question_bank
IF OBJECT_ID('dbo.question_bank', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.question_bank (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_question_bank PRIMARY KEY DEFAULT NEWID(),
    subject_id UNIQUEIDENTIFIER NOT NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    question_type NVARCHAR(32) NOT NULL
      CONSTRAINT CK_question_bank_type CHECK (question_type IN (N'multiple_choice', N'essay')),
    question_text NVARCHAR(MAX) NOT NULL,
    explanation NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_question_bank_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_question_bank_updated_at DEFAULT SYSDATETIMEOFFSET(),
    archived_at DATETIMEOFFSET NULL,
    CONSTRAINT FK_qb_subject FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id) ON DELETE NO ACTION,
    CONSTRAINT FK_qb_creator FOREIGN KEY (created_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 11. question_options
IF OBJECT_ID('dbo.question_options', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.question_options (
    question_id UNIQUEIDENTIFIER NOT NULL,
    option_key NVARCHAR(1) NOT NULL CONSTRAINT CK_question_options_key CHECK (option_key IN (N'A', N'B', N'C', N'D')),
    option_text NVARCHAR(MAX) NOT NULL,
    position SMALLINT NOT NULL CONSTRAINT CK_question_options_pos CHECK (position > 0),
    CONSTRAINT PK_question_options PRIMARY KEY (question_id, option_key),
    CONSTRAINT UQ_question_options_pos UNIQUE (question_id, position),
    CONSTRAINT FK_qo_question FOREIGN KEY (question_id) REFERENCES dbo.question_bank(id) ON DELETE CASCADE
  );
END;
GO

-- 12. question_answer_keys
IF OBJECT_ID('dbo.question_answer_keys', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.question_answer_keys (
    question_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_question_answer_keys PRIMARY KEY,
    correct_option_key NVARCHAR(1) NULL
      CONSTRAINT CK_qak_option_key CHECK (correct_option_key IS NULL OR correct_option_key IN (N'A', N'B', N'C', N'D')),
    model_answer NVARCHAR(MAX) NULL,
    grading_rubric NVARCHAR(MAX) NULL,
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_qak_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_qak_question FOREIGN KEY (question_id) REFERENCES dbo.question_bank(id) ON DELETE CASCADE
  );
END;
GO

-- 13. exams
IF OBJECT_ID('dbo.exams', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exams (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_exams PRIMARY KEY DEFAULT NEWID(),
    subject_id UNIQUEIDENTIFIER NOT NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(500) NOT NULL,
    instructions NVARCHAR(MAX) NULL,
    duration_minutes INT NOT NULL CONSTRAINT DF_exams_duration DEFAULT 45 CONSTRAINT CK_exams_duration CHECK (duration_minutes > 0),
    max_attempts INT NOT NULL CONSTRAINT DF_exams_max_attempts DEFAULT 1 CONSTRAINT CK_exams_max_attempts CHECK (max_attempts > 0),
    available_from DATETIMEOFFSET NULL,
    available_until DATETIMEOFFSET NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_exams_status DEFAULT N'draft'
      CONSTRAINT CK_exams_status CHECK (status IN (N'draft', N'published', N'closed', N'archived')),
    require_camera BIT NOT NULL CONSTRAINT DF_exams_require_camera DEFAULT 0,
    auto_grade_essay BIT NOT NULL CONSTRAINT DF_exams_auto_grade_essay DEFAULT 0,
    show_answers_after_submit BIT NOT NULL CONSTRAINT DF_exams_show_answers DEFAULT 1,
    published_at DATETIMEOFFSET NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_exams_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_exams_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_exams_subject FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id) ON DELETE NO ACTION,
    CONSTRAINT FK_exams_creator FOREIGN KEY (created_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 14. exam_classes
IF OBJECT_ID('dbo.exam_classes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exam_classes (
    exam_id UNIQUEIDENTIFIER NOT NULL,
    class_id UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_exam_classes PRIMARY KEY (exam_id, class_id),
    CONSTRAINT FK_ec_exam FOREIGN KEY (exam_id) REFERENCES dbo.exams(id) ON DELETE CASCADE,
    CONSTRAINT FK_ec_class FOREIGN KEY (class_id) REFERENCES dbo.classes(id) ON DELETE CASCADE
  );
END;
GO

-- 15. exam_questions
IF OBJECT_ID('dbo.exam_questions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exam_questions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_exam_questions PRIMARY KEY DEFAULT NEWID(),
    exam_id UNIQUEIDENTIFIER NOT NULL,
    source_question_id UNIQUEIDENTIFIER NULL,
    position INT NOT NULL CONSTRAINT CK_eq_position CHECK (position > 0),
    question_type NVARCHAR(32) NOT NULL
      CONSTRAINT CK_eq_type CHECK (question_type IN (N'multiple_choice', N'essay')),
    question_text NVARCHAR(MAX) NOT NULL,
    options NVARCHAR(MAX) NOT NULL CONSTRAINT DF_eq_options DEFAULT N'[]',
    points DECIMAL(7, 2) NOT NULL CONSTRAINT DF_eq_points DEFAULT 1 CONSTRAINT CK_eq_points CHECK (points > 0),
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_eq_created_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_eq_exam_pos UNIQUE (exam_id, position),
    CONSTRAINT UQ_eq_id_exam UNIQUE (id, exam_id),
    CONSTRAINT FK_eq_exam FOREIGN KEY (exam_id) REFERENCES dbo.exams(id) ON DELETE CASCADE,
    CONSTRAINT FK_eq_source FOREIGN KEY (source_question_id) REFERENCES dbo.question_bank(id) ON DELETE SET NULL
  );
END;
GO

-- 16. exam_answer_keys
IF OBJECT_ID('dbo.exam_answer_keys', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exam_answer_keys (
    exam_question_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_exam_answer_keys PRIMARY KEY,
    correct_option_key NVARCHAR(1) NULL
      CONSTRAINT CK_eak_option_key CHECK (correct_option_key IS NULL OR correct_option_key IN (N'A', N'B', N'C', N'D')),
    model_answer NVARCHAR(MAX) NULL,
    grading_rubric NVARCHAR(MAX) NULL,
    explanation NVARCHAR(MAX) NULL,
    CONSTRAINT FK_eak_exam_question FOREIGN KEY (exam_question_id) REFERENCES dbo.exam_questions(id) ON DELETE CASCADE
  );
END;
GO

-- 17. exam_attempts
IF OBJECT_ID('dbo.exam_attempts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exam_attempts (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_exam_attempts PRIMARY KEY DEFAULT NEWID(),
    exam_id UNIQUEIDENTIFIER NOT NULL,
    student_id UNIQUEIDENTIFIER NOT NULL,
    attempt_no INT NOT NULL CONSTRAINT CK_ea_attempt_no CHECK (attempt_no > 0),
    started_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ea_started_at DEFAULT SYSDATETIMEOFFSET(),
    ends_at DATETIMEOFFSET NOT NULL,
    submitted_at DATETIMEOFFSET NULL,
    status NVARCHAR(32) NOT NULL CONSTRAINT DF_ea_status DEFAULT N'in_progress'
      CONSTRAINT CK_ea_status CHECK (status IN (N'in_progress', N'pending_grading', N'completed', N'voided')),
    CONSTRAINT UQ_ea_exam_student_no UNIQUE (exam_id, student_id, attempt_no),
    CONSTRAINT UQ_ea_id_exam UNIQUE (id, exam_id),
    CONSTRAINT UQ_ea_id_student UNIQUE (id, student_id),
    CONSTRAINT FK_ea_exam FOREIGN KEY (exam_id) REFERENCES dbo.exams(id) ON DELETE NO ACTION,
    CONSTRAINT FK_ea_student FOREIGN KEY (student_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'exam_attempts_one_active_uidx' AND object_id = OBJECT_ID('dbo.exam_attempts'))
BEGIN
  CREATE UNIQUE INDEX exam_attempts_one_active_uidx
    ON dbo.exam_attempts (exam_id, student_id)
    WHERE status = N'in_progress';
END;
GO

-- 18. student_answers
IF OBJECT_ID('dbo.student_answers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.student_answers (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_student_answers PRIMARY KEY DEFAULT NEWID(),
    attempt_id UNIQUEIDENTIFIER NOT NULL,
    exam_id UNIQUEIDENTIFIER NOT NULL,
    exam_question_id UNIQUEIDENTIFIER NOT NULL,
    selected_option NVARCHAR(1) NULL
      CONSTRAINT CK_sa_selected_option CHECK (selected_option IS NULL OR selected_option IN (N'A', N'B', N'C', N'D')),
    answer_text NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_sa_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_sa_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_sa_attempt_question UNIQUE (attempt_id, exam_question_id),
    CONSTRAINT FK_sa_attempt_exam FOREIGN KEY (attempt_id, exam_id) REFERENCES dbo.exam_attempts(id, exam_id) ON DELETE CASCADE,
    CONSTRAINT FK_sa_question_exam FOREIGN KEY (exam_question_id, exam_id) REFERENCES dbo.exam_questions(id, exam_id) ON DELETE NO ACTION
  );
END;
GO

-- 19. student_answer_grades
IF OBJECT_ID('dbo.student_answer_grades', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.student_answer_grades (
    attempt_id UNIQUEIDENTIFIER NOT NULL,
    exam_question_id UNIQUEIDENTIFIER NOT NULL,
    awarded_points DECIMAL(7, 2) NOT NULL CONSTRAINT DF_sag_points DEFAULT 0 CONSTRAINT CK_sag_points CHECK (awarded_points >= 0),
    feedback NVARCHAR(MAX) NULL,
    graded_by UNIQUEIDENTIFIER NULL,
    graded_at DATETIMEOFFSET NULL,
    CONSTRAINT PK_student_answer_grades PRIMARY KEY (attempt_id, exam_question_id),
    CONSTRAINT FK_sag_answer FOREIGN KEY (attempt_id, exam_question_id) REFERENCES dbo.student_answers(attempt_id, exam_question_id) ON DELETE CASCADE,
    CONSTRAINT FK_sag_grader FOREIGN KEY (graded_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 20. attempt_results
IF OBJECT_ID('dbo.attempt_results', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.attempt_results (
    attempt_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_attempt_results PRIMARY KEY,
    total_score DECIMAL(8, 2) NOT NULL CONSTRAINT CK_ar_score CHECK (total_score >= 0),
    released_at DATETIMEOFFSET NULL,
    graded_by UNIQUEIDENTIFIER NULL,
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ar_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_ar_attempt FOREIGN KEY (attempt_id) REFERENCES dbo.exam_attempts(id) ON DELETE CASCADE,
    CONSTRAINT FK_ar_grader FOREIGN KEY (graded_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 21. notifications
IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.notifications (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_notifications PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(500) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    data NVARCHAR(MAX) NOT NULL CONSTRAINT DF_notifications_data DEFAULT N'{}',
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT SYSDATETIMEOFFSET(),
    read_at DATETIMEOFFSET NULL,
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.profiles(id) ON DELETE CASCADE
  );
END;
GO

-- 22. ai_generation_jobs
IF OBJECT_ID('dbo.ai_generation_jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ai_generation_jobs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ai_generation_jobs PRIMARY KEY DEFAULT NEWID(),
    teacher_id UNIQUEIDENTIFIER NOT NULL,
    subject_id UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(32) NOT NULL CONSTRAINT DF_agj_status DEFAULT N'queued'
      CONSTRAINT CK_agj_status CHECK (status IN (N'queued', N'processing', N'needs_review', N'completed', N'failed')),
    source_file_name NVARCHAR(500) NULL,
    generated_questions NVARCHAR(MAX) NULL,
    error_message NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_agj_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_agj_updated_at DEFAULT SYSDATETIMEOFFSET(),
    completed_at DATETIMEOFFSET NULL,
    CONSTRAINT FK_agj_teacher FOREIGN KEY (teacher_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION,
    CONSTRAINT FK_agj_subject FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id) ON DELETE NO ACTION
  );
END;
GO

-- 23. ai_tutor_conversations
IF OBJECT_ID('dbo.ai_tutor_conversations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ai_tutor_conversations (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ai_tutor_conversations PRIMARY KEY DEFAULT NEWID(),
    attempt_id UNIQUEIDENTIFIER NOT NULL,
    student_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(500) NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_atc_created_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_atc_attempt_student UNIQUE (attempt_id, student_id),
    CONSTRAINT FK_atc_attempt_student FOREIGN KEY (attempt_id, student_id) REFERENCES dbo.exam_attempts(id, student_id) ON DELETE CASCADE
  );
END;
GO

-- 24. ai_tutor_messages
IF OBJECT_ID('dbo.ai_tutor_messages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ai_tutor_messages (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ai_tutor_messages PRIMARY KEY DEFAULT NEWID(),
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    sender NVARCHAR(20) NOT NULL CONSTRAINT CK_atm_sender CHECK (sender IN (N'student', N'assistant')),
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_atm_created_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_atm_conversation FOREIGN KEY (conversation_id) REFERENCES dbo.ai_tutor_conversations(id) ON DELETE CASCADE
  );
END;
GO

-- 25. class_materials
IF OBJECT_ID('dbo.class_materials', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.class_materials (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_class_materials PRIMARY KEY DEFAULT NEWID(),
    class_id UNIQUEIDENTIFIER NOT NULL,
    teacher_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX) NULL,
    material_type NVARCHAR(20) NOT NULL CONSTRAINT CK_cm_type CHECK (material_type IN (N'document', N'video', N'link')),
    file_url NVARCHAR(1000) NOT NULL,
    file_name NVARCHAR(500) NULL,
    file_size_bytes BIGINT NULL,
    mime_type NVARCHAR(255) NULL,
    week_number INT NOT NULL CONSTRAINT DF_cm_week DEFAULT 1 CONSTRAINT CK_cm_week CHECK (week_number > 0),
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_cm_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_cm_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_cmat_class FOREIGN KEY (class_id) REFERENCES dbo.classes(id) ON DELETE CASCADE,
    CONSTRAINT FK_cmat_teacher FOREIGN KEY (teacher_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 26. exam_proctoring_logs
IF OBJECT_ID('dbo.exam_proctoring_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.exam_proctoring_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_exam_proctoring_logs PRIMARY KEY DEFAULT NEWID(),
    attempt_id UNIQUEIDENTIFIER NOT NULL,
    exam_id UNIQUEIDENTIFIER NOT NULL,
    student_id UNIQUEIDENTIFIER NOT NULL,
    violation_type NVARCHAR(64) NOT NULL CONSTRAINT DF_epl_type DEFAULT N'tab_switch',
    switch_count INT NOT NULL CONSTRAINT DF_epl_count DEFAULT 1 CONSTRAINT CK_epl_count CHECK (switch_count > 0),
    details NVARCHAR(MAX) NOT NULL CONSTRAINT DF_epl_details DEFAULT N'{}',
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_epl_created_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_epl_attempt FOREIGN KEY (attempt_id) REFERENCES dbo.exam_attempts(id) ON DELETE CASCADE,
    CONSTRAINT FK_epl_exam FOREIGN KEY (exam_id) REFERENCES dbo.exams(id) ON DELETE NO ACTION,
    CONSTRAINT FK_epl_student FOREIGN KEY (student_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 27. assignments
IF OBJECT_ID('dbo.assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.assignments (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_assignments PRIMARY KEY DEFAULT NEWID(),
    class_id UNIQUEIDENTIFIER NOT NULL,
    teacher_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX) NULL,
    attachment_url NVARCHAR(1000) NULL,
    attachment_name NVARCHAR(500) NULL,
    due_date DATETIMEOFFSET NOT NULL,
    max_score DECIMAL(5, 2) NOT NULL CONSTRAINT DF_assignments_max_score DEFAULT 10.00 CONSTRAINT CK_assignments_max_score CHECK (max_score > 0),
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_assignments_status DEFAULT N'published'
      CONSTRAINT CK_assignments_status CHECK (status IN (N'draft', N'published', N'closed')),
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_assignments_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_assignments_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_assignments_class FOREIGN KEY (class_id) REFERENCES dbo.classes(id) ON DELETE CASCADE,
    CONSTRAINT FK_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 28. assignment_submissions
IF OBJECT_ID('dbo.assignment_submissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.assignment_submissions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_assignment_submissions PRIMARY KEY DEFAULT NEWID(),
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    student_id UNIQUEIDENTIFIER NOT NULL,
    file_url NVARCHAR(1000) NOT NULL,
    file_name NVARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NULL,
    note NVARCHAR(MAX) NULL,
    submitted_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_asub_submitted_at DEFAULT SYSDATETIMEOFFSET(),
    is_late BIT NOT NULL CONSTRAINT DF_asub_is_late DEFAULT 0,
    score DECIMAL(5, 2) NULL CONSTRAINT CK_asub_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    feedback NVARCHAR(MAX) NULL,
    graded_at DATETIMEOFFSET NULL,
    graded_by UNIQUEIDENTIFIER NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_asub_created_at DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_asub_updated_at DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_asub_assignment_student UNIQUE (assignment_id, student_id),
    CONSTRAINT FK_asub_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.assignments(id) ON DELETE CASCADE,
    CONSTRAINT FK_asub_student FOREIGN KEY (student_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION,
    CONSTRAINT FK_asub_grader FOREIGN KEY (graded_by) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
  );
END;
GO

-- 29. auth_otps
IF OBJECT_ID('dbo.auth_otps', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_otps (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_auth_otps PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    otp_hash NVARCHAR(64) NOT NULL,
    purpose NVARCHAR(32) NOT NULL
      CONSTRAINT CK_auth_otps_purpose CHECK (purpose IN (N'reset_password', N'register_verify', N'login_2fa')),
    metadata NVARCHAR(MAX) NOT NULL CONSTRAINT DF_auth_otps_metadata DEFAULT N'{}',
    attempts INT NOT NULL CONSTRAINT DF_auth_otps_attempts DEFAULT 0,
    max_attempts INT NOT NULL CONSTRAINT DF_auth_otps_max_attempts DEFAULT 5,
    expires_at DATETIMEOFFSET NOT NULL,
    consumed_at DATETIMEOFFSET NULL,
    created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_auth_otps_created_at DEFAULT SYSDATETIMEOFFSET()
  );
END;
GO

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_roles_user_role' AND object_id = OBJECT_ID('dbo.user_roles'))
  CREATE INDEX idx_user_roles_user_role ON dbo.user_roles(user_id, role);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_classes_teacher_archived_created' AND object_id = OBJECT_ID('dbo.classes'))
  CREATE INDEX idx_classes_teacher_archived_created ON dbo.classes(teacher_id, archived_at, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_classes_subject_archived' AND object_id = OBJECT_ID('dbo.classes'))
  CREATE INDEX idx_classes_subject_archived ON dbo.classes(subject_id, archived_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_class_memberships_student_enrolled' AND object_id = OBJECT_ID('dbo.class_memberships'))
  CREATE INDEX idx_class_memberships_student_enrolled ON dbo.class_memberships(student_id, enrolled_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_class_materials_class_week' AND object_id = OBJECT_ID('dbo.class_materials'))
  CREATE INDEX idx_class_materials_class_week ON dbo.class_materials(class_id, week_number, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_class_materials_teacher' AND object_id = OBJECT_ID('dbo.class_materials'))
  CREATE INDEX idx_class_materials_teacher ON dbo.class_materials(teacher_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exams_creator_status_created' AND object_id = OBJECT_ID('dbo.exams'))
  CREATE INDEX idx_exams_creator_status_created ON dbo.exams(created_by, status, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exams_status_availability' AND object_id = OBJECT_ID('dbo.exams'))
  CREATE INDEX idx_exams_status_availability ON dbo.exams(status, available_from, available_until);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exams_subject_status' AND object_id = OBJECT_ID('dbo.exams'))
  CREATE INDEX idx_exams_subject_status ON dbo.exams(subject_id, status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exam_classes_class_exam' AND object_id = OBJECT_ID('dbo.exam_classes'))
  CREATE INDEX idx_exam_classes_class_exam ON dbo.exam_classes(class_id, exam_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exam_questions_source' AND object_id = OBJECT_ID('dbo.exam_questions'))
  CREATE INDEX idx_exam_questions_source ON dbo.exam_questions(source_question_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exam_attempts_student_status_started' AND object_id = OBJECT_ID('dbo.exam_attempts'))
  CREATE INDEX idx_exam_attempts_student_status_started ON dbo.exam_attempts(student_id, status, started_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_exam_attempts_exam_status_submitted' AND object_id = OBJECT_ID('dbo.exam_attempts'))
  CREATE INDEX idx_exam_attempts_exam_status_submitted ON dbo.exam_attempts(exam_id, status, submitted_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_student_answers_exam_question' AND object_id = OBJECT_ID('dbo.student_answers'))
  CREATE INDEX idx_student_answers_exam_question ON dbo.student_answers(exam_question_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_user_read_created' AND object_id = OBJECT_ID('dbo.notifications'))
  CREATE INDEX idx_notifications_user_read_created ON dbo.notifications(user_id, read_at, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_question_bank_owner_subject' AND object_id = OBJECT_ID('dbo.question_bank'))
  CREATE INDEX idx_question_bank_owner_subject ON dbo.question_bank(created_by, subject_id, archived_at, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_question_bank_subject_type' AND object_id = OBJECT_ID('dbo.question_bank'))
  CREATE INDEX idx_question_bank_subject_type ON dbo.question_bank(subject_id, question_type, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_assignments_class_due' AND object_id = OBJECT_ID('dbo.assignments'))
  CREATE INDEX idx_assignments_class_due ON dbo.assignments(class_id, due_date DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_assignments_teacher_created' AND object_id = OBJECT_ID('dbo.assignments'))
  CREATE INDEX idx_assignments_teacher_created ON dbo.assignments(teacher_id, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_submissions_student' AND object_id = OBJECT_ID('dbo.assignment_submissions'))
  CREATE INDEX idx_submissions_student ON dbo.assignment_submissions(student_id, submitted_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proctoring_attempt' AND object_id = OBJECT_ID('dbo.exam_proctoring_logs'))
  CREATE INDEX idx_proctoring_attempt ON dbo.exam_proctoring_logs(attempt_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proctoring_student' AND object_id = OBJECT_ID('dbo.exam_proctoring_logs'))
  CREATE INDEX idx_proctoring_student ON dbo.exam_proctoring_logs(student_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_auth_otps_lookup' AND object_id = OBJECT_ID('dbo.auth_otps'))
  CREATE INDEX idx_auth_otps_lookup ON dbo.auth_otps(email, purpose, created_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ai_tutor_messages_conv' AND object_id = OBJECT_ID('dbo.ai_tutor_messages'))
  CREATE INDEX idx_ai_tutor_messages_conv ON dbo.ai_tutor_messages(conversation_id, created_at);
GO
