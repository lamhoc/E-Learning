-- ==============================================================================
-- Migration: 20261125_performance_indexes_v2.sql
-- Mục tiêu: Bổ sung chỉ mục (index) cho các truy vấn lọc (WHERE) / sắp xếp (ORDER BY) / FK
-- thường xuyên của Admin - Giảng viên - Sinh viên.
--
-- AN TOÀN:
--  * Chỉ dùng CREATE INDEX IF NOT EXISTS: không đổi cấu trúc cột, không đụng RLS, không mất dữ liệu.
--  * Có thể chạy lại nhiều lần (idempotent).
--  * Toàn bộ tên cột đã đối chiếu với supabase/schema.sql và các migration hiện có.
--
-- GHI CHÚ VỀ MIGRATION CŨ 20261102_performance_indexes.sql:
--  File đó tham chiếu cột KHÔNG tồn tại (student_answers.question_id, student_answer_grades.question_id,
--  exam_questions.order_index; thực tế là exam_question_id / position) nên sẽ lỗi nếu chạy trọn gói.
--  File này thay thế phần hợp lệ của nó (dùng cùng tên index nên không sinh index trùng) và bỏ các index
--  trùng với PRIMARY KEY / UNIQUE đã có sẵn:
--    - class_memberships PK (class_id, student_id)
--    - exam_classes PK (exam_id, class_id)
--    - teacher_subject_assignments PK (teacher_id, subject_id)
--    - student_answers UNIQUE (attempt_id, exam_question_id)
--    - student_answer_grades PK (attempt_id, exam_question_id)
--    - exam_questions UNIQUE (exam_id, position)
--    - exam_attempts UNIQUE (exam_id, student_id, attempt_no)
-- ==============================================================================

-- 1. user_roles: truy vấn phân quyền ở mọi request
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles(user_id, role);

-- 2. classes / class_memberships
CREATE INDEX IF NOT EXISTS idx_classes_teacher_archived_created
  ON public.classes(teacher_id, archived_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_classes_subject_archived
  ON public.classes(subject_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_class_memberships_student_enrolled
  ON public.class_memberships(student_id, enrolled_at DESC);

-- 3. class_materials
CREATE INDEX IF NOT EXISTS idx_class_materials_teacher
  ON public.class_materials(teacher_id);

-- 4. exams
CREATE INDEX IF NOT EXISTS idx_exams_creator_status_created
  ON public.exams(created_by, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exams_status_availability
  ON public.exams(status, available_from, available_until);

CREATE INDEX IF NOT EXISTS idx_exams_subject_status
  ON public.exams(subject_id, status);

-- 5. exam_classes: tra ngược từ lớp -> đề thi (PK chỉ phủ chiều exam -> lớp)
CREATE INDEX IF NOT EXISTS idx_exam_classes_class_exam
  ON public.exam_classes(class_id, exam_id);

-- 6. exam_questions: FK source_question_id (ON DELETE SET NULL cần index để không quét toàn bảng)
CREATE INDEX IF NOT EXISTS idx_exam_questions_source_question
  ON public.exam_questions(source_question_id);

-- 7. exam_attempts: lịch sử thi của sinh viên + hàng đợi chấm bài của giảng viên
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_status_started
  ON public.exam_attempts(student_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_status_submitted
  ON public.exam_attempts(exam_id, status, submitted_at DESC);

-- 8. student_answers: FK exam_question_id (cascade khi xóa/sửa đề)
CREATE INDEX IF NOT EXISTS idx_student_answers_exam_question
  ON public.student_answers(exam_question_id);

-- 9. notifications: chuông thông báo (danh sách mới nhất + đếm chưa đọc)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, read_at, created_at DESC);

-- 10. question_bank: bộ lọc ngân hàng câu hỏi theo chủ sở hữu / môn / loại
CREATE INDEX IF NOT EXISTS idx_question_bank_owner_subject_archived
  ON public.question_bank(created_by, subject_id, archived_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_bank_subject_type_created
  ON public.question_bank(subject_id, question_type, created_at DESC);

-- 11. assignments: danh sách bài tập của giảng viên
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_created
  ON public.assignments(teacher_id, created_at DESC);

-- (assignments(class_id, due_date), assignment_submissions(assignment_id, student_id) và
--  assignment_submissions(student_id, submitted_at) đã có từ migration 20261025.)
