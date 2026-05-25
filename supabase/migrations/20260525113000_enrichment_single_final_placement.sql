-- Keep enrichment placement state canonical:
-- - pending first/second choices may coexist in one student/block/day slot
-- - once a class is approved for that slot, same-slot alternatives are removed
-- - rejected rows do not remain in enrollments, because enrollments represent active placement state

CREATE OR REPLACE FUNCTION private.enrichment_class_slot_key(p_class_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH source AS (
    SELECT lower(coalesce(c.block, '') || ' ' || coalesce(c.schedule_summary, '')) AS text_value
    FROM public.classes c
    WHERE c.id = p_class_id
      AND c.program = 'enrichment'
  ),
  parsed AS (
    SELECT
      regexp_match(text_value, '\m(?:block|b)\s*([1-4])\M') AS block_match,
      regexp_match(text_value, '\mday\s*([1-3])\M') AS day_match
    FROM source
  )
  SELECT CASE
    WHEN block_match IS NULL THEN NULL
    ELSE 'block' || block_match[1] || ':day' || coalesce(day_match[1], 'all')
  END
  FROM parsed;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_enrichment_slot_after_approval(
  p_student_id uuid,
  p_class_id uuid,
  p_request_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  target_slot text;
BEGIN
  target_slot := private.enrichment_class_slot_key(p_class_id);
  IF target_slot IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.enrollments e
  USING public.classes c
  WHERE e.class_id = c.id
    AND e.student_id = p_student_id
    AND e.class_id <> p_class_id
    AND c.program = 'enrichment'
    AND private.enrichment_class_slot_key(c.id) = target_slot;

  DELETE FROM public.class_requests cr
  USING public.classes c
  WHERE cr.class_id = c.id
    AND cr.student_id = p_student_id
    AND (p_request_id IS NULL OR cr.id <> p_request_id)
    AND c.program = 'enrichment'
    AND private.enrichment_class_slot_key(c.id) = target_slot;
END;
$$;

CREATE OR REPLACE FUNCTION public.enrollments_cleanup_final_placement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM public.cleanup_enrichment_slot_after_approval(NEW.student_id, NEW.class_id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_cleanup_final_placement_trg ON public.enrollments;
CREATE TRIGGER enrollments_cleanup_final_placement_trg
AFTER INSERT OR UPDATE OF status, class_id, student_id ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.enrollments_cleanup_final_placement();

CREATE OR REPLACE FUNCTION public.class_requests_cleanup_final_placement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.enrollments (class_id, student_id, status)
    VALUES (NEW.class_id, NEW.student_id, 'approved')
    ON CONFLICT (class_id, student_id)
    DO UPDATE SET status = 'approved';

    PERFORM public.cleanup_enrichment_slot_after_approval(NEW.student_id, NEW.class_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_requests_cleanup_final_placement_trg ON public.class_requests;
CREATE TRIGGER class_requests_cleanup_final_placement_trg
AFTER INSERT OR UPDATE OF status, class_id, student_id ON public.class_requests
FOR EACH ROW
EXECUTE FUNCTION public.class_requests_cleanup_final_placement();

DELETE FROM public.enrollments
WHERE status = 'rejected';

WITH approved AS (
  SELECT DISTINCT ON (e.student_id, private.enrichment_class_slot_key(e.class_id))
    e.student_id,
    e.class_id
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  WHERE c.program = 'enrichment'
    AND e.status = 'approved'
    AND private.enrichment_class_slot_key(e.class_id) IS NOT NULL
  ORDER BY e.student_id, private.enrichment_class_slot_key(e.class_id), e.created_at DESC
)
DELETE FROM public.enrollments e
USING public.classes c, approved a
WHERE e.class_id = c.id
  AND e.student_id = a.student_id
  AND e.class_id <> a.class_id
  AND c.program = 'enrichment'
  AND private.enrichment_class_slot_key(c.id) = private.enrichment_class_slot_key(a.class_id);

WITH approved AS (
  SELECT DISTINCT ON (e.student_id, private.enrichment_class_slot_key(e.class_id))
    e.student_id,
    e.class_id
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  WHERE c.program = 'enrichment'
    AND e.status = 'approved'
    AND private.enrichment_class_slot_key(e.class_id) IS NOT NULL
  ORDER BY e.student_id, private.enrichment_class_slot_key(e.class_id), e.created_at DESC
)
DELETE FROM public.class_requests cr
USING public.classes c, approved a
WHERE cr.class_id = c.id
  AND cr.student_id = a.student_id
  AND cr.class_id <> a.class_id
  AND c.program = 'enrichment'
  AND private.enrichment_class_slot_key(c.id) = private.enrichment_class_slot_key(a.class_id);
