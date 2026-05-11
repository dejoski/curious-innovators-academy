-- One-time remote demo seed + RLS anon read helpers for CIA project cadkwvfybunnxoppqlfc
-- Applied via: npx supabase@2.95.4 db query --linked -f ...
-- Preconditions: Track-2 compat migration applied (uuid PKs, class_requests table, etc.)

BEGIN;

CREATE OR REPLACE FUNCTION public.api_row_int(u uuid)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT (abs(hashtext(u::text)) % 2147483000)::integer + 1;
$$;

DROP VIEW IF EXISTS public.api_classes_list;
DROP VIEW IF EXISTS public.api_students_list;
DROP VIEW IF EXISTS public.api_teachers_list;
DROP VIEW IF EXISTS public.enrichment_requests;

CREATE VIEW public.api_classes_list WITH (security_invoker = true) AS
SELECT
  public.api_row_int(c.id) AS id,
  c.id AS raw_uuid,
  c.name,
  pr.display_name AS teacher_name,
  COALESCE(en.cnt::int, 0) AS enrolled_count,
  c.capacity,
  (c.status::text) AS status,
  COALESCE(NULLIF(trim(c.schedule_summary), ''), 'TBD') AS schedule
FROM public.classes c
JOIN public.teachers t ON t.id = c.teacher_id
JOIN public.profiles pr ON pr.id = t.profile_id
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS cnt FROM public.enrollments e WHERE e.class_id = c.id
) AS en ON true;

CREATE VIEW public.api_students_list WITH (security_invoker = true) AS
SELECT
  public.api_row_int(s.id) AS id,
  s.id AS raw_uuid,
  s.display_name AS full_name,
  COALESCE(ps.parents_agg, '') AS parent_name,
  COALESCE(s.level::text, '') AS grade_level,
  COALESCE(lower(s.track::text), 'core') AS track,
  'Incomplete'::text AS core_status,
  ''::text AS notes,
  ''::text AS avatar_url,
  CASE
    WHEN enr.core_total IS NULL OR enr.core_total = 0 THEN '0/4'
    ELSE format('%s/4', enr.core_done)
  END AS enrichment
FROM public.students s
LEFT JOIN LATERAL (
  SELECT string_agg(pr.display_name, ', ' ORDER BY pr.display_name) AS parents_agg
  FROM public.parent_students ps
  JOIN public.parents pa ON pa.id = ps.parent_id
  JOIN public.profiles pr ON pr.id = pa.profile_id
  WHERE ps.student_id = s.id
) AS ps ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE e.status = 'approved')::int AS core_done,
    count(*)::int AS core_total
  FROM public.enrollments e
  WHERE e.student_id = s.id
) AS enr ON true;

CREATE VIEW public.api_teachers_list WITH (security_invoker = true) AS
SELECT
  public.api_row_int(t.id) AS id,
  t.id AS raw_uuid,
  pr.display_name AS full_name,
  t.subjects,
  pr.email,
  t.phone,
  ''::text AS avatar_url,
  lower(t.program::text) AS program
FROM public.teachers t
JOIN public.profiles pr ON pr.id = t.profile_id;

CREATE VIEW public.enrichment_requests WITH (security_invoker = true) AS
SELECT
  public.api_row_int(cr.id) AS id,
  cr.id AS raw_uuid,
  st.display_name AS student_name,
  pr_req.display_name AS parent_name,
  cl.name AS class_name,
  COALESCE(cr.block, '') AS block,
  COALESCE(cr.level, '') AS level,
  COALESCE(cr.option_label, '') AS option_rank,
  cr.status::text AS status
FROM public.class_requests cr
JOIN public.students st ON st.id = cr.student_id
JOIN public.classes cl ON cl.id = cr.class_id
JOIN public.profiles pr_req ON pr_req.id = cr.requested_by_profile_id;

GRANT SELECT ON public.api_classes_list TO anon, authenticated;
GRANT SELECT ON public.api_students_list TO anon, authenticated;
GRANT SELECT ON public.api_teachers_list TO anon, authenticated;
GRANT SELECT ON public.enrichment_requests TO anon, authenticated;

ALTER TABLE public.profiles DISABLE TRIGGER profiles_guard_trg;

UPDATE public.profiles
SET role = 'admin'::public.app_role, display_name = 'Dejan (Admin)'
WHERE lower(email) = lower('dejanstajic12@gmail.com');

UPDATE public.profiles
SET role = 'teacher'::public.app_role, display_name = 'Emily Carter'
WHERE id = '7e1d1e1f-5ba9-4487-94a2-9354afd4ea8c'::uuid;

UPDATE public.profiles
SET display_name = 'Mr. Lee'
WHERE id = 'e7dc229c-b24c-4a9f-8796-93c929ceae95'::uuid;

UPDATE public.profiles
SET display_name = 'Ms. Collins'
WHERE id = 'b53f4a04-85ea-4b20-9922-865d2cdbfc5d'::uuid;

ALTER TABLE public.profiles ENABLE TRIGGER profiles_guard_trg;

DELETE FROM public.notifications;
DELETE FROM public.feedback;
DELETE FROM public.student_records;
DELETE FROM public.schedule_events;
DELETE FROM public.class_requests;
DELETE FROM public.enrollments;
DELETE FROM public.classes;
DELETE FROM public.parent_students;
DELETE FROM public.students;
DELETE FROM public.parents;
DELETE FROM public.teachers;

INSERT INTO public.parents (profile_id)
SELECT id FROM public.profiles WHERE id = 'e7dc229c-b24c-4a9f-8796-93c929ceae95'::uuid;

INSERT INTO public.parents (profile_id)
SELECT id FROM public.profiles WHERE id = 'b53f4a04-85ea-4b20-9922-865d2cdbfc5d'::uuid;

INSERT INTO public.teachers (profile_id, subjects, phone, program)
SELECT id, 'Math, Algebra', '(555) 123-4567', 'core'::public.program_track
FROM public.profiles WHERE id = '7e1d1e1f-5ba9-4487-94a2-9354afd4ea8c'::uuid;

INSERT INTO public.students (profile_id, display_name, guardian_label, age_years, level, track)
SELECT id, 'Anna Lee', 'Mr. Lee', 14, '2', 'core'::public.program_track
FROM public.profiles WHERE id = 'f7aa1097-c271-4d52-8a5c-9814aba9cb2a'::uuid;

INSERT INTO public.students (display_name, guardian_label, age_years, level, track) VALUES
  ('George Lee', 'Mr. Lee', 12, '2', 'core'::public.program_track),
  ('Bruna Lee', 'Mr. Lee', 14, '2', 'core'::public.program_track),
  ('James Smith', 'Ms. Smith', 13, '3', 'enrichment'::public.program_track),
  ('Bruce Collins', 'Ms. Collins', 14, '3', 'core'::public.program_track),
  ('Maria Collins', 'Ms. Collins', 13, '1', 'enrichment'::public.program_track);

INSERT INTO public.parent_students (parent_id, student_id)
SELECT p.id, s.id
FROM public.parents p
JOIN public.profiles pr ON pr.id = p.profile_id
JOIN public.students s ON s.display_name IN ('Anna Lee', 'George Lee', 'Bruna Lee')
WHERE lower(pr.email) = lower('lstajic@yahoo.com');

INSERT INTO public.parent_students (parent_id, student_id)
SELECT p.id, s.id
FROM public.parents p
JOIN public.profiles pr ON pr.id = p.profile_id
JOIN public.students s ON s.display_name IN ('Bruce Collins', 'Maria Collins')
WHERE lower(pr.email) = lower('alice@gmail.com');

INSERT INTO public.classes (name, teacher_id, program, capacity, schedule_summary, status)
SELECT c.name, te.id, c.program, c.capacity, c.schedule_summary, c.status
FROM (VALUES
  ('Robotics Lab', 'enrichment'::public.program_track, 20, 'Tue, Thu', 'active'::public.class_status),
  ('Journalism & Media Writing', 'enrichment'::public.program_track, 18, 'Mon, Wed', 'active'::public.class_status),
  ('Creative Arts', 'enrichment'::public.program_track, 22, 'Fri', 'active'::public.class_status),
  ('Ocean Explorers', 'enrichment'::public.program_track, 16, 'B3 block', 'active'::public.class_status),
  ('Mathematics 101', 'core'::public.program_track, 30, 'Mon, Wed, Fri', 'active'::public.class_status)
) AS c(name, program, capacity, schedule_summary, status)
CROSS JOIN public.teachers te
JOIN public.profiles pf ON pf.id = te.profile_id AND pf.id = '7e1d1e1f-5ba9-4487-94a2-9354afd4ea8c'::uuid;

INSERT INTO public.enrollments (class_id, student_id, status)
SELECT cl.id, st.id, v.status::public.workflow_status
FROM (VALUES
  ('Robotics Lab', 'Anna Lee', 'approved'),
  ('Robotics Lab', 'George Lee', 'pending'),
  ('Robotics Lab', 'Bruna Lee', 'approved'),
  ('Robotics Lab', 'James Smith', 'rejected'),
  ('Mathematics 101', 'Anna Lee', 'approved')
) AS v(class_name, student_name, status)
JOIN public.classes cl ON cl.name = v.class_name
JOIN public.students st ON st.display_name = v.student_name;

INSERT INTO public.class_requests (
  student_id, class_id, requested_by_profile_id, status, block, level, option_label
)
SELECT st.id, cl.id, pr.id, v.status::public.workflow_status, v.block, v.level, v.option_label
FROM (VALUES
  ('Anna Lee', 'Robotics Lab', 'lstajic@yahoo.com', 'pending', 'B2', '3', '1st'),
  ('George Lee', 'Journalism & Media Writing', 'lstajic@yahoo.com', 'pending', 'B4', '4', '2nd'),
  ('Bruna Lee', 'Creative Arts', 'lstajic@yahoo.com', 'pending', 'B3', '2', '2nd'),
  ('James Smith', 'Ocean Explorers', 'lstajic@yahoo.com', 'rejected', 'B3', '2', '1st'),
  ('Bruce Collins', 'Robotics Lab', 'alice@gmail.com', 'pending', 'B2', '3', '1st'),
  ('Maria Collins', 'Journalism & Media Writing', 'alice@gmail.com', 'approved', 'B4', '1', '2nd')
) AS v(student_name, class_name, requester_email, status, block, level, option_label)
JOIN public.classes cl ON cl.name = v.class_name
JOIN public.students st ON st.display_name = v.student_name
JOIN public.profiles pr ON lower(pr.email) = lower(v.requester_email);

INSERT INTO public.schedule_events (class_id, title, starts_at, ends_at, location)
SELECT c.id,
  COALESCE(NULLIF(trim(c.name), ''), 'Class session'),
  t.starts_at,
  t.starts_at + interval '1 hour',
  'Room ' || left(replace(c.id::text, '-', ''), 8)
FROM public.classes c
CROSS JOIN LATERAL (
  SELECT
    CASE c.name
      WHEN 'Mathematics 101' THEN timestamptz '2026-05-05 09:00:00+00'
      WHEN 'Robotics Lab' THEN timestamptz '2026-05-06 14:00:00+00'
      WHEN 'Journalism & Media Writing' THEN timestamptz '2026-05-07 11:00:00+00'
      WHEN 'Creative Arts' THEN timestamptz '2026-05-09 13:30:00+00'
      WHEN 'Ocean Explorers' THEN timestamptz '2026-05-08 08:45:00+00'
      ELSE now() + interval '7 days'
    END AS starts_at
) AS t;

INSERT INTO public.notifications (recipient_profile_id, title, body, href, read_at)
SELECT '5892f2be-1753-4f03-b371-b9a4a901320b'::uuid,
  'Welcome to Curious Innovators Academy',
  'Your admin dashboard is synced with Supabase demo data.',
  '/dashboard/classes',
  NULL
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = '5892f2be-1753-4f03-b371-b9a4a901320b'::uuid);

INSERT INTO public.notifications (recipient_profile_id, title, body, href, read_at)
VALUES
('5892f2be-1753-4f03-b371-b9a4a901320b'::uuid,
  'New enrichment request pending',
  'Review Robotics Lab seating requests.',
  '/dashboard/classes/requests',
  NULL),
('5892f2be-1753-4f03-b371-b9a4a901320b'::uuid,
  'Schedule updated',
  'May calendar includes robotics and mathematics blocks.',
  '/dashboard/schedule',
  NOW());

COMMIT;

BEGIN;

DROP POLICY IF EXISTS demo_public_read_profiles ON public.profiles;
DROP POLICY IF EXISTS demo_public_read_parents ON public.parents;
DROP POLICY IF EXISTS demo_public_read_teachers ON public.teachers;
DROP POLICY IF EXISTS demo_public_read_students ON public.students;
DROP POLICY IF EXISTS demo_public_read_parent_students ON public.parent_students;
DROP POLICY IF EXISTS demo_public_read_classes ON public.classes;
DROP POLICY IF EXISTS demo_public_read_enrollments ON public.enrollments;
DROP POLICY IF EXISTS demo_public_read_class_requests ON public.class_requests;
DROP POLICY IF EXISTS demo_public_read_schedule_events ON public.schedule_events;
DROP POLICY IF EXISTS demo_public_read_student_records ON public.student_records;
DROP POLICY IF EXISTS demo_public_read_feedback ON public.feedback;
DROP POLICY IF EXISTS demo_public_read_notifications ON public.notifications;

CREATE POLICY demo_public_read_profiles ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_parents ON public.parents FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_teachers ON public.teachers FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_students ON public.students FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_parent_students ON public.parent_students FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_classes ON public.classes FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_enrollments ON public.enrollments FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_class_requests ON public.class_requests FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_schedule_events ON public.schedule_events FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_student_records ON public.student_records FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_feedback ON public.feedback FOR SELECT TO anon USING (true);
CREATE POLICY demo_public_read_notifications ON public.notifications FOR SELECT TO anon USING (true);

COMMIT;
