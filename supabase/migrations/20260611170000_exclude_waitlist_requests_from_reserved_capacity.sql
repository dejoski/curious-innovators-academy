-- Waitlist-intent parent requests should not reserve seats.
-- Capacity remains enrolled approved placements plus non-waitlist pending requests.

CREATE OR REPLACE VIEW public.class_catalog_availability
WITH (security_invoker = true)
AS
WITH enrollment_counts AS (
  SELECT
    class_id,
    count(*) FILTER (WHERE status = 'approved')::integer AS enrolled_count,
    count(*) FILTER (WHERE status = 'waitlisted')::integer AS enrolled_waitlist_count
  FROM public.enrollments
  GROUP BY class_id
),
request_counts AS (
  SELECT
    class_id,
    count(*) FILTER (
      WHERE status = 'pending'
        AND COALESCE(option_label, '') NOT ILIKE 'waitlist:%'
    )::integer AS pending_count,
    count(*) FILTER (
      WHERE status = 'pending'
        AND COALESCE(option_label, '') ILIKE 'waitlist:%'
    )::integer AS pending_waitlist_count
  FROM public.class_requests
  GROUP BY class_id
)
SELECT
  c.id AS class_id,
  COALESCE(e.enrolled_count, 0)::integer AS enrolled_count,
  COALESCE(r.pending_count, 0)::integer AS pending_count,
  (COALESCE(e.enrolled_waitlist_count, 0) + COALESCE(r.pending_waitlist_count, 0))::integer AS waitlist_count,
  (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0))::integer AS reserved_count,
  GREATEST(c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)), 0)::integer AS seats_remaining,
  CASE
    WHEN c.capacity <= 0 THEN 'Open'
    WHEN c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)) <= 0 THEN 'Full'
    WHEN c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)) = 1 THEN '1 seat left'
    ELSE (c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)))::text || ' seats left'
  END AS availability_label
FROM public.classes c
LEFT JOIN enrollment_counts e ON e.class_id = c.id
LEFT JOIN request_counts r ON r.class_id = c.id;
