-- Centralize parent catalog seat math in the database.
-- The app should not independently recalculate enrolled/pending/reserved seats
-- from enrollments and class_requests on every class-list read.

CREATE INDEX IF NOT EXISTS enrollments_class_status_student_idx
  ON public.enrollments (class_id, status, student_id);

CREATE INDEX IF NOT EXISTS class_requests_class_status_student_idx
  ON public.class_requests (class_id, status, student_id);

CREATE OR REPLACE VIEW public.class_catalog_availability
WITH (security_invoker = true)
AS
WITH enrollment_facts AS (
  SELECT
    class_id,
    student_id,
    lower(coalesce(status::text, 'approved')) AS status
  FROM public.enrollments
),
request_facts AS (
  SELECT
    class_id,
    student_id,
    lower(coalesce(status::text, 'pending')) AS status
  FROM public.class_requests
),
class_holds AS (
  SELECT class_id, student_id, 'reserved' AS hold_kind
  FROM enrollment_facts
  WHERE status IN ('approved', 'pending')
  UNION
  SELECT class_id, student_id, 'reserved' AS hold_kind
  FROM request_facts
  WHERE status IN ('approved', 'pending')
  UNION
  SELECT class_id, student_id, 'pending' AS hold_kind
  FROM enrollment_facts
  WHERE status = 'pending'
  UNION
  SELECT class_id, student_id, 'pending' AS hold_kind
  FROM request_facts
  WHERE status = 'pending'
  UNION
  SELECT class_id, student_id, 'waitlisted' AS hold_kind
  FROM enrollment_facts
  WHERE status IN ('waitlist', 'waitlisted')
  UNION
  SELECT class_id, student_id, 'waitlisted' AS hold_kind
  FROM request_facts
  WHERE status IN ('waitlist', 'waitlisted')
),
class_counts AS (
  SELECT
    c.id AS class_id,
    greatest(coalesce(c.capacity, 0), 0)::integer AS capacity,
    count(DISTINCT ef.student_id) FILTER (WHERE ef.status = 'approved')::integer AS enrolled_count,
    count(DISTINCT h.student_id) FILTER (WHERE h.hold_kind = 'pending')::integer AS pending_count,
    count(DISTINCT h.student_id) FILTER (WHERE h.hold_kind = 'waitlisted')::integer AS waitlist_count,
    count(DISTINCT h.student_id) FILTER (WHERE h.hold_kind = 'reserved')::integer AS reserved_count
  FROM public.classes c
  LEFT JOIN enrollment_facts ef ON ef.class_id = c.id
  LEFT JOIN class_holds h ON h.class_id = c.id
  GROUP BY c.id, c.capacity
)
SELECT
  class_id,
  enrolled_count,
  pending_count,
  waitlist_count,
  reserved_count,
  greatest(capacity - reserved_count, 0)::integer AS seats_remaining,
  CASE
    WHEN capacity <= 0 OR greatest(capacity - reserved_count, 0) <= 0 THEN 'Full'
    WHEN greatest(capacity - reserved_count, 0) = 1 THEN '1 seat left'
    ELSE greatest(capacity - reserved_count, 0)::text || ' seats left'
  END AS availability_label
FROM class_counts;

GRANT SELECT ON public.class_catalog_availability TO authenticated, service_role;
