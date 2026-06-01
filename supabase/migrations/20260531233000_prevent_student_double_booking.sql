-- One approved enrollment per student, semester, block, and day.
-- Pending requests may still hold alternate choices, but they cannot target a slot
-- that already has an approved placement for the same student.

CREATE OR REPLACE FUNCTION private.class_schedule_block(p_block text, p_schedule_summary text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  WITH source AS (
    SELECT lower(COALESCE(p_block, '') || ' ' || COALESCE(p_schedule_summary, '')) AS value
  ),
  parsed AS (
    SELECT COALESCE(
      (regexp_match(value, '(^|[^a-z0-9])block[[:space:]]*([1-4])([^0-9]|$)'))[2],
      (regexp_match(value, '(^|[^a-z0-9])b([1-4])([^0-9]|$)'))[2]
    ) AS value
    FROM source
  )
  SELECT CASE WHEN value IS NULL THEN NULL ELSE value::integer END
  FROM parsed;
$$;

CREATE OR REPLACE FUNCTION private.class_schedule_day(p_block text, p_schedule_summary text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  WITH source AS (
    SELECT lower(COALESCE(p_block, '') || ' ' || COALESCE(p_schedule_summary, '')) AS value
  ),
  parsed AS (
    SELECT (regexp_match(value, '(^|[^a-z0-9])day[[:space:]]*([1-3])([^0-9]|$)'))[2] AS value
    FROM source
  )
  SELECT CASE WHEN value IS NULL THEN NULL ELSE value::integer END
  FROM parsed;
$$;

DELETE FROM public.enrollments doomed
USING (
  SELECT id
  FROM (
    SELECT
      e.id,
      row_number() OVER (
        PARTITION BY
          e.student_id,
          c.semester_id,
          private.class_schedule_block(c.block, c.schedule_summary),
          private.class_schedule_day(c.block, c.schedule_summary)
        ORDER BY e.created_at ASC, e.id ASC
      ) AS slot_rank
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.status = 'approved'
      AND private.class_schedule_block(c.block, c.schedule_summary) IS NOT NULL
  ) ranked
  WHERE ranked.slot_rank > 1
) duplicates
WHERE doomed.id = duplicates.id;

DELETE FROM public.class_requests request
USING public.classes request_class
WHERE request_class.id = request.class_id
  AND request.status = 'pending'
  AND private.class_schedule_block(request_class.block, request_class.schedule_summary) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classes enrolled_class ON enrolled_class.id = e.class_id
    WHERE e.student_id = request.student_id
      AND e.status = 'approved'
      AND enrolled_class.semester_id IS NOT DISTINCT FROM request_class.semester_id
      AND private.class_schedule_block(enrolled_class.block, enrolled_class.schedule_summary) =
        private.class_schedule_block(request_class.block, request_class.schedule_summary)
      AND (
        private.class_schedule_day(enrolled_class.block, enrolled_class.schedule_summary) IS NULL
        OR private.class_schedule_day(request_class.block, request_class.schedule_summary) IS NULL
        OR private.class_schedule_day(enrolled_class.block, enrolled_class.schedule_summary) =
          private.class_schedule_day(request_class.block, request_class.schedule_summary)
      )
  );

CREATE OR REPLACE FUNCTION private.assert_no_student_schedule_double_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
SET row_security = off
AS $$
DECLARE
  target_class record;
  target_block integer;
  target_day integer;
  conflict record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, semester_id, block, schedule_summary
  INTO target_class
  FROM public.classes
  WHERE id = NEW.class_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  target_block := private.class_schedule_block(target_class.block, target_class.schedule_summary);
  target_day := private.class_schedule_day(target_class.block, target_class.schedule_summary);

  IF target_block IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id, c.name
  INTO conflict
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  WHERE e.student_id = NEW.student_id
    AND e.status = 'approved'
    AND e.id <> NEW.id
    AND c.semester_id IS NOT DISTINCT FROM target_class.semester_id
    AND private.class_schedule_block(c.block, c.schedule_summary) = target_block
    AND (
      private.class_schedule_day(c.block, c.schedule_summary) IS NULL
      OR target_day IS NULL
      OR private.class_schedule_day(c.block, c.schedule_summary) = target_day
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Student already has % in this schedule slot.', conflict.name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_no_student_schedule_double_booking ON public.enrollments;
CREATE TRIGGER enrollments_no_student_schedule_double_booking
  BEFORE INSERT OR UPDATE OF student_id, class_id, status ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION private.assert_no_student_schedule_double_booking();

CREATE OR REPLACE FUNCTION private.assert_no_student_schedule_request_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
SET row_security = off
AS $$
DECLARE
  target_class record;
  target_block integer;
  target_day integer;
  conflict record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, semester_id, block, schedule_summary
  INTO target_class
  FROM public.classes
  WHERE id = NEW.class_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  target_block := private.class_schedule_block(target_class.block, target_class.schedule_summary);
  target_day := private.class_schedule_day(target_class.block, target_class.schedule_summary);

  IF target_block IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id, c.name
  INTO conflict
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  WHERE e.student_id = NEW.student_id
    AND e.status = 'approved'
    AND c.semester_id IS NOT DISTINCT FROM target_class.semester_id
    AND private.class_schedule_block(c.block, c.schedule_summary) = target_block
    AND (
      private.class_schedule_day(c.block, c.schedule_summary) IS NULL
      OR target_day IS NULL
      OR private.class_schedule_day(c.block, c.schedule_summary) = target_day
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Student already has % in this schedule slot.', conflict.name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_requests_no_approved_slot_conflict ON public.class_requests;
CREATE TRIGGER class_requests_no_approved_slot_conflict
  BEFORE INSERT OR UPDATE OF student_id, class_id, status ON public.class_requests
  FOR EACH ROW
  EXECUTE FUNCTION private.assert_no_student_schedule_request_conflict();

CREATE OR REPLACE FUNCTION private.assert_class_schedule_update_has_no_double_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
SET row_security = off
AS $$
DECLARE
  target_block integer;
  target_day integer;
  conflict record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  target_block := private.class_schedule_block(NEW.block, NEW.schedule_summary);
  target_day := private.class_schedule_day(NEW.block, NEW.schedule_summary);

  IF target_block IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT current_enrollment.student_id, other_class.name
  INTO conflict
  FROM public.enrollments current_enrollment
  JOIN public.enrollments other_enrollment
    ON other_enrollment.student_id = current_enrollment.student_id
   AND other_enrollment.status = 'approved'
   AND other_enrollment.class_id <> NEW.id
  JOIN public.classes other_class ON other_class.id = other_enrollment.class_id
  WHERE current_enrollment.class_id = NEW.id
    AND current_enrollment.status = 'approved'
    AND other_class.semester_id IS NOT DISTINCT FROM NEW.semester_id
    AND private.class_schedule_block(other_class.block, other_class.schedule_summary) = target_block
    AND (
      private.class_schedule_day(other_class.block, other_class.schedule_summary) IS NULL
      OR target_day IS NULL
      OR private.class_schedule_day(other_class.block, other_class.schedule_summary) = target_day
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Class schedule change would double-book a student with %.', conflict.name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_no_student_schedule_double_booking ON public.classes;
CREATE TRIGGER classes_no_student_schedule_double_booking
  BEFORE UPDATE OF block, schedule_summary, semester_id ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION private.assert_class_schedule_update_has_no_double_bookings();
