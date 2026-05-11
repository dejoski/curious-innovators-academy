-- Track 2 demo seed — run AFTER migration `20260429120000_track2_rls_schema.sql`
--
-- Prerequisites (Authentication → Users): create accounts with at least these emails
-- (passwords are yours). The handle_new_user trigger inserts profiles as role = parent;
-- this script promotes roles and loads roster-style demo rows.
--
--   - name.example@gmail.com     — admin (matches Playwright smoke test email)
--   - parent.lee@cia.demo        — parent (“Mr. Lee” mocks)
--   - parent.collins@cia.demo    — parent (“Ms. Collins” mocks)
--   - teacher.emily@cia.demo     — teacher (Emily Carter from teachers mock)
--   - student.anna@cia.demo      — optional student login (Anna Lee)
--
-- Run in the SQL Editor as postgres / dashboard owner (bypasses RLS). Never ship
-- service_role keys to browsers — anon + RLS only on clients.

BEGIN;

UPDATE public.profiles
SET role = 'admin'::public.app_role, display_name = 'Demo Admin'
WHERE lower(email) = lower('name.example@gmail.com');

UPDATE public.profiles
SET role = 'parent'::public.app_role, display_name = 'Mr. Lee'
WHERE lower(email) = lower('parent.lee@cia.demo');

UPDATE public.profiles
SET role = 'parent'::public.app_role, display_name = 'Ms. Collins'
WHERE lower(email) = lower('parent.collins@cia.demo');

UPDATE public.profiles
SET role = 'teacher'::public.app_role, display_name = 'Emily Carter'
WHERE lower(email) = lower('teacher.emily@cia.demo');

UPDATE public.profiles
SET role = 'student'::public.app_role, display_name = 'Anna Lee'
WHERE lower(email) = lower('student.anna@cia.demo');

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
SELECT id FROM public.profiles WHERE lower(email) = lower('parent.lee@cia.demo') LIMIT 1;

INSERT INTO public.parents (profile_id)
SELECT id FROM public.profiles WHERE lower(email) = lower('parent.collins@cia.demo') LIMIT 1;

INSERT INTO public.teachers (profile_id, subjects, phone, program)
SELECT id, 'Math, Algebra', '(555) 123-4567', 'core'::public.program_track
FROM public.profiles WHERE lower(email) = lower('teacher.emily@cia.demo') LIMIT 1;

INSERT INTO public.students (profile_id, display_name, guardian_label, age_years, level, track)
SELECT id, 'Anna Lee', 'Mr. Lee', 14, '2', 'core'::public.program_track
FROM public.profiles WHERE lower(email) = lower('student.anna@cia.demo') LIMIT 1;

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
WHERE lower(pr.email) = lower('parent.lee@cia.demo');

INSERT INTO public.parent_students (parent_id, student_id)
SELECT p.id, s.id
FROM public.parents p
JOIN public.profiles pr ON pr.id = p.profile_id
JOIN public.students s ON s.display_name IN ('Bruce Collins', 'Maria Collins')
WHERE lower(pr.email) = lower('parent.collins@cia.demo');

INSERT INTO public.classes (name, teacher_id, program, capacity, schedule_summary, status)
SELECT c.name, t.id, c.program, c.capacity, c.schedule_summary, c.status
FROM public.teachers t
JOIN public.profiles p ON p.id = t.profile_id AND lower(p.email) = lower('teacher.emily@cia.demo')
CROSS JOIN (VALUES
  ('Robotics Lab', 'enrichment'::public.program_track, 20, 'Tue, Thu', 'active'::public.class_status),
  ('Journalism & Media Writing', 'enrichment'::public.program_track, 18, 'Mon, Wed', 'active'::public.class_status),
  ('Creative Arts', 'enrichment'::public.program_track, 22, 'Fri', 'active'::public.class_status),
  ('Ocean Explorers', 'enrichment'::public.program_track, 16, 'B3 block', 'active'::public.class_status),
  ('Mathematics 101', 'core'::public.program_track, 30, 'Mon, Wed, Fri', 'active'::public.class_status)
) AS c(name, program, capacity, schedule_summary, status);

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
  ('Anna Lee', 'Robotics Lab', 'parent.lee@cia.demo', 'pending', 'B2', '3', '1st'),
  ('George Lee', 'Journalism & Media Writing', 'parent.lee@cia.demo', 'pending', 'B4', '4', '2nd'),
  ('Bruna Lee', 'Creative Arts', 'parent.lee@cia.demo', 'pending', 'B3', '2', '2nd'),
  ('James Smith', 'Ocean Explorers', 'parent.lee@cia.demo', 'rejected', 'B3', '2', '1st'),
  ('Bruce Collins', 'Robotics Lab', 'parent.collins@cia.demo', 'pending', 'B2', '3', '1st'),
  ('Maria Collins', 'Journalism & Media Writing', 'parent.collins@cia.demo', 'approved', 'B4', '1', '2nd')
) AS v(student_name, class_name, requester_email, status, block, level, option_label)
JOIN public.students st ON st.display_name = v.student_name
JOIN public.classes cl ON cl.name = v.class_name
JOIN public.profiles pr ON lower(pr.email) = lower(v.requester_email);

INSERT INTO public.schedule_events (class_id, title, starts_at, ends_at, location)
SELECT cl.id,
  'Robotics Lab — build session',
  now() + interval '2 days',
  now() + interval '2 days' + interval '90 minutes',
  'Lab 2'
FROM public.classes cl WHERE cl.name = 'Robotics Lab' LIMIT 1;

INSERT INTO public.student_records (student_id, author_profile_id, body)
SELECT st.id, pr.id, 'Focused and participative in group activities (seed).'
FROM public.students st
JOIN public.profiles pr ON lower(pr.email) = lower('teacher.emily@cia.demo')
WHERE st.display_name = 'Anna Lee';

INSERT INTO public.feedback (student_id, author_profile_id, class_id, body, rating)
SELECT st.id, pr.id, cl.id, 'Strong engagement this week.', 5
FROM public.students st
JOIN public.profiles pr ON lower(pr.email) = lower('parent.lee@cia.demo')
JOIN public.classes cl ON cl.name = 'Robotics Lab'
WHERE st.display_name = 'Anna Lee';

INSERT INTO public.notifications (recipient_profile_id, title, body, href, read_at)
SELECT pr.id,
  n.title,
  n.body,
  n.href,
  n.read_at
FROM public.profiles pr
CROSS JOIN (VALUES
  (
    'New enrichment class request',
    'Anna Lee requested Robotics Lab — review prerequisites.',
    '/dashboard/classes/requests',
    NULL::timestamptz
  ),
  (
    'Teacher schedule updated',
    'Emily Carter updated her availability for next term.',
    '/dashboard/schedule',
    NULL::timestamptz
  ),
  (
    'System maintenance',
    'Scheduled backup tonight at 2:00 AM local time.',
    '/dashboard',
    now() - interval '5 hours'
  )
) AS n(title, body, href, read_at)
WHERE lower(pr.email) = lower('name.example@gmail.com');

COMMIT;
