CREATE OR REPLACE FUNCTION public.bulk_enroll_students_in_class(
  p_class_id uuid,
  p_student_ids uuid[]
)
RETURNS TABLE (
  student_id uuid,
  result text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id uuid;
  v_inserted integer;
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can enroll students' USING ERRCODE = '42501';
  END IF;

  IF cardinality(COALESCE(p_student_ids, ARRAY[]::uuid[])) > 500 THEN
    RAISE EXCEPTION 'CSV import is limited to 500 students' USING ERRCODE = '22023';
  END IF;

  FOR v_student_id IN
    SELECT DISTINCT imported.student_id
    FROM unnest(COALESCE(p_student_ids, ARRAY[]::uuid[])) AS imported(student_id)
    WHERE imported.student_id IS NOT NULL
    ORDER BY imported.student_id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles AS role_record
      WHERE role_record.user_id = v_student_id
        AND role_record.role = 'student'
        AND NOT EXISTS (
          SELECT 1
          FROM public.teacher_applications AS application
          WHERE application.user_id = role_record.user_id
        )
    ) THEN
      student_id := v_student_id;
      result := 'not_student';
      RETURN NEXT;
      CONTINUE;
    END IF;

    INSERT INTO public.class_memberships (class_id, student_id)
    VALUES (p_class_id, v_student_id)
    ON CONFLICT ON CONSTRAINT class_memberships_pkey DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    student_id := v_student_id;
    result := CASE WHEN v_inserted = 1 THEN 'added' ELSE 'already_enrolled' END;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_enroll_students_in_class(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_enroll_students_in_class(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';