-- Canonical linked-parent contact projection. students.guardian_label remains a legacy fallback only.
CREATE OR REPLACE VIEW public.student_parent_contacts AS
SELECT
  s.id AS student_id,
  COALESCE(
    string_agg(DISTINCT p.id::text, ', ' ORDER BY p.id::text) FILTER (WHERE p.id IS NOT NULL),
    ''
  ) AS parent_ids,
  COALESCE(
    string_agg(DISTINCT NULLIF(BTRIM(pr.display_name), ''), ', ' ORDER BY NULLIF(BTRIM(pr.display_name), ''))
      FILTER (WHERE NULLIF(BTRIM(pr.display_name), '') IS NOT NULL),
    ''
  ) AS parent_names,
  COALESCE(
    string_agg(DISTINCT NULLIF(BTRIM(pr.email), ''), ', ' ORDER BY NULLIF(BTRIM(pr.email), ''))
      FILTER (WHERE NULLIF(BTRIM(pr.email), '') IS NOT NULL),
    ''
  ) AS parent_emails,
  COUNT(DISTINCT p.id)::integer AS linked_parent_count,
  NULLIF(BTRIM(s.guardian_label), '') AS legacy_guardian_label
FROM public.students s
LEFT JOIN public.parent_students ps ON ps.student_id = s.id
LEFT JOIN public.parents p ON p.id = ps.parent_id
LEFT JOIN public.profiles pr ON pr.id = p.profile_id
GROUP BY s.id, s.guardian_label;

GRANT SELECT ON public.student_parent_contacts TO authenticated;
