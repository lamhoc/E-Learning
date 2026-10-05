-- Allow exam owners/admins to read class assignments after publishing.
-- Keep writes restricted to draft exams and classes they manage.

DROP POLICY IF EXISTS exam_classes_staff_read ON public.exam_classes;
CREATE POLICY exam_classes_staff_read ON public.exam_classes
  FOR SELECT TO authenticated
  USING (public.is_exam_manager(exam_id));
