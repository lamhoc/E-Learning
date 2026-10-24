-- Migration: Cấp quyền và chính sách RLS cho giảng viên (exam manager) chấm bài thi tự luận
GRANT INSERT, UPDATE, DELETE ON public.student_answer_grades TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.attempt_results TO authenticated;
GRANT UPDATE ON public.exam_attempts TO authenticated;
GRANT INSERT, UPDATE ON public.student_answers TO authenticated;

-- Policies cho student_answers (cho phép giảng viên tạo bản ghi câu trả lời nếu thí sinh chưa tạo nhằm đáp ứng foreign key student_answer_grades)
DROP POLICY IF EXISTS answers_staff_manage ON public.student_answers;
CREATE POLICY answers_staff_manage ON public.student_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );

-- Policies cho student_answer_grades
DROP POLICY IF EXISTS answer_grades_staff_insert ON public.student_answer_grades;
CREATE POLICY answer_grades_staff_insert ON public.student_answer_grades
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );

DROP POLICY IF EXISTS answer_grades_staff_update ON public.student_answer_grades;
CREATE POLICY answer_grades_staff_update ON public.student_answer_grades
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );

-- Policies cho attempt_results
DROP POLICY IF EXISTS results_staff_insert ON public.attempt_results;
CREATE POLICY results_staff_insert ON public.attempt_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );

DROP POLICY IF EXISTS results_staff_update ON public.attempt_results;
CREATE POLICY results_staff_update ON public.attempt_results
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts AS ea
      WHERE ea.id = attempt_id AND public.is_exam_manager(ea.exam_id)
    )
  );

-- Policies cho exam_attempts (cho phép giáo viên update trạng thái bài thi thành completed khi chốt điểm)
DROP POLICY IF EXISTS attempts_staff_update ON public.exam_attempts;
CREATE POLICY attempts_staff_update ON public.exam_attempts
  FOR UPDATE TO authenticated
  USING (public.is_exam_manager(exam_id))
  WITH CHECK (public.is_exam_manager(exam_id));
