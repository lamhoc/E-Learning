CREATE OR REPLACE FUNCTION public.preview_class_enrollment_csv(
  p_class_id uuid,
  p_identifiers text[]
)
RETURNS TABLE (
  row_number bigint,
  identifier text,
  result text,
  student_id uuid,
  full_name text,
  student_email text,
  student_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_class_staff(p_class_id) THEN
    RAISE EXCEPTION 'Only class staff can preview enrollment' USING ERRCODE = '42501';
  END IF;

  IF cardinality(COALESCE(p_identifiers, ARRAY[]::text[])) > 500 THEN
    RAISE EXCEPTION 'CSV import is limited to 500 rows' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH source_rows AS (
    SELECT source.identifier,
           source.ordinality AS source_row,
           lower(trim(COALESCE(source.identifier, ''))) AS normalized,
           row_number() OVER (
             PARTITION BY lower(trim(COALESCE(source.identifier, '')))
             ORDER BY source.ordinality
           ) AS duplicate_identifier_number
    FROM unnest(COALESCE(p_identifiers, ARRAY[]::text[])) WITH ORDINALITY
      AS source(identifier, ordinality)
  ), matched_rows AS (
    SELECT source_rows.*,
           student.student_id AS matched_student_id,
           student.full_name AS matched_full_name,
           student.student_email AS matched_email,
           student.student_code AS matched_code,
           student.already_enrolled
    FROM source_rows
    LEFT JOIN LATERAL (
      SELECT auth_user.id AS student_id,
             COALESCE(NULLIF(profile.full_name, ''), auth_user.email::text) AS full_name,
             auth_user.email::text AS student_email,
             profile.student_code,
             EXISTS (
               SELECT 1
               FROM public.class_memberships AS membership
               WHERE membership.class_id = p_class_id
                 AND membership.student_id = auth_user.id
             ) AS already_enrolled
      FROM auth.users AS auth_user
      JOIN public.profiles AS profile ON profile.id = auth_user.id
      JOIN public.user_roles AS role_record ON role_record.user_id = auth_user.id
      WHERE role_record.role = 'student'
        AND (lower(auth_user.email) = source_rows.normalized
          OR lower(profile.student_code) = source_rows.normalized)
        AND NOT EXISTS (
          SELECT 1
          FROM public.teacher_applications AS application
          WHERE application.user_id = auth_user.id
        )
      LIMIT 1
    ) AS student ON true
  ), deduplicated_rows AS (
    SELECT matched_rows.*,
           row_number() OVER (
             PARTITION BY matched_rows.matched_student_id
             ORDER BY matched_rows.source_row
           ) AS duplicate_student_number
    FROM matched_rows
  )
  SELECT deduplicated_rows.source_row,
         deduplicated_rows.identifier,
         CASE
           WHEN deduplicated_rows.normalized = '' THEN 'invalid'
           WHEN deduplicated_rows.normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
             AND deduplicated_rows.normalized !~ '^sv[0-9]{6,}$' THEN 'invalid'
           WHEN deduplicated_rows.duplicate_identifier_number > 1
             OR (deduplicated_rows.matched_student_id IS NOT NULL
               AND deduplicated_rows.duplicate_student_number > 1) THEN 'duplicate'
           WHEN deduplicated_rows.matched_student_id IS NULL THEN 'not_found'
           WHEN deduplicated_rows.already_enrolled THEN 'already_enrolled'
           ELSE 'ready'
         END,
         deduplicated_rows.matched_student_id,
         deduplicated_rows.matched_full_name,
         deduplicated_rows.matched_email,
         deduplicated_rows.matched_code
  FROM deduplicated_rows
  ORDER BY deduplicated_rows.source_row;
END;
$$;

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

REVOKE ALL ON FUNCTION public.preview_class_enrollment_csv(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bulk_enroll_students_in_class(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_class_enrollment_csv(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_enroll_students_in_class(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';