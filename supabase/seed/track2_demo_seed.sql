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

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(required.email, ', ' ORDER BY required.email)
  INTO missing
  FROM (VALUES
    ('name.example@gmail.com'),
    ('parent.lee@cia.demo'),
    ('parent.collins@cia.demo'),
    ('teacher.emily@cia.demo'),
    ('student.anna@cia.demo')
  ) AS required(email)
  LEFT JOIN public.profiles p ON lower(p.email) = lower(required.email)
  WHERE p.id IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Missing required Supabase Auth/profile rows: %. Run npm run provision:supabase-users after migrations, then rerun this seed.',
      missing;
  END IF;
END;
$$;

DELETE FROM public.notifications;
DELETE FROM public.feedback;
DELETE FROM public.student_records;
DELETE FROM public.schedule_events;
DELETE FROM public.class_requests;
DELETE FROM public.enrollments;
DELETE FROM public.classes;
DELETE FROM public.parent_students;
DELETE FROM public.invoices;
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

INSERT INTO public.classes (
  name,
  teacher_id,
  program,
  capacity,
  schedule_summary,
  status,
  level,
  block,
  location,
  description,
  prerequisites
)
SELECT
  c.name,
  t.id,
  c.program,
  c.capacity,
  c.schedule_summary,
  c.status,
  c.level,
  c.block,
  c.location,
  c.description,
  c.prerequisites
FROM public.teachers t
JOIN public.profiles p ON p.id = t.profile_id AND lower(p.email) = lower('teacher.emily@cia.demo')
CROSS JOIN (VALUES
  (
    'Math',
    'core'::public.program_track,
    30,
    'Day 1/2/3 · Block 1 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 1',
    'Room 101',
    'Core mathematics block assigned by the school.',
    'None'
  ),
  (
    'ELA - Core',
    'core'::public.program_track,
    30,
    'Day 1/2/3 · Block 2 · 8:40 - 10:10 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 2',
    'Room 102',
    'English language arts core block assigned by the school.',
    'None'
  ),
  (
    'Economics & Financial Literacy',
    'enrichment'::public.program_track,
    25,
    'Day 1 · Block 3 · 10:20 - 11:50 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 3 Day 1',
    'Innovation Lab',
    'Students learn budgeting, markets, entrepreneurship, and practical financial decision-making.',
    'None'
  ),
  (
    'Ocean Explorers',
    'enrichment'::public.program_track,
    24,
    'Day 2 · Block 3 · 10:20 - 11:50 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 3 Day 2',
    'Science Lab',
    'Marine science, ocean habitats, and environmental exploration through hands-on labs.',
    'None'
  ),
  (
    'Music Theory',
    'enrichment'::public.program_track,
    15,
    'Day 3 · Block 3 · 10:20 - 11:50 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 3 Day 3',
    'Music Room',
    'Music Theory gives students a structured enrichment option with placement managed by the school team.',
    'None'
  ),
  (
    'Digital Storytelling & Animation',
    'enrichment'::public.program_track,
    20,
    'Day 1 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 1',
    'Media Lab',
    'Students create digital stories, animations, scripts, and visual narratives.',
    'None'
  ),
  (
    'Force & Motion',
    'enrichment'::public.program_track,
    24,
    'Day 1 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 1',
    'Science Lab',
    'Physics investigations into motion, force, energy, and applied experiments.',
    'None'
  ),
  (
    'Health Sciences Lab',
    'enrichment'::public.program_track,
    22,
    'Day 2 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 2',
    'Health Lab',
    'Explore human health, medicine, anatomy, and scientific discovery.',
    'None'
  ),
  (
    'Art & Design',
    'enrichment'::public.program_track,
    28,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Studio A',
    'Art & Design gives students a structured enrichment option with placement managed by the school team.',
    'None'
  ),
  (
    'Creative Arts',
    'enrichment'::public.program_track,
    22,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Studio B',
    'Studio course for drawing, mixed media, critique, and portfolio development.',
    'None'
  ),
  (
    'Creative Writing',
    'enrichment'::public.program_track,
    18,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Writing Studio',
    'Develop storytelling skills through imagination, character creation, and expressive writing.',
    'None'
  ),
  (
    'Health Sciences',
    'enrichment'::public.program_track,
    22,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Health Lab',
    'Explore the basics of human health, medicine, and scientific discovery.',
    'None'
  ),
  (
    'Journalism & Media Writing',
    'enrichment'::public.program_track,
    18,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Media Lab',
    'Reporting, interviews, editing, and media literacy through student publications.',
    'None'
  ),
  (
    'Robotics Lab',
    'enrichment'::public.program_track,
    20,
    'Day 3 · Block 4 · 7:00 - 8:30 AM',
    'active'::public.class_status,
    'Level 3',
    'Block 4 Day 3',
    'Robotics Lab',
    'Hands-on robotics and basic programming concepts.',
    'None'
  )
) AS c(name, program, capacity, schedule_summary, status, level, block, location, description, prerequisites);

UPDATE public.students
SET
  learning_profile = 'Curious and engaged learner who enjoys collaborative activities',
  strengths = 'Strong communication and creativity',
  support_notes = 'Benefits from structured guidance on long tasks',
  attendance_rate = 98.00
WHERE display_name = 'Anna Lee';

UPDATE public.students
SET
  learning_profile = 'Prefers hands-on projects and pair work',
  strengths = 'Quick problem solver in STEM activities',
  support_notes = 'Check in before major assessments',
  attendance_rate = 96.00
WHERE display_name = 'George Lee';

INSERT INTO public.invoices (
  student_id,
  family_label,
  invoice_number,
  amount_cents,
  currency,
  status,
  issued_date,
  due_date,
  line_items,
  payment_url
)
SELECT st.id, v.family_label, v.invoice_number, v.amount_cents, 'USD', v.status, v.issued_date::date, v.due_date::date, v.line_items::jsonb, NULL
FROM (VALUES
  (
    'Anna Lee',
    'Lee Family',
    'CIA-2026-001',
    22500,
    'open',
    '2026-05-01',
    '2026-05-31',
    '[{"description":"Enrichment class materials"},{"description":"Lab kit"}]'
  ),
  (
    'George Lee',
    'Lee Family',
    'CIA-2026-002',
    15000,
    'paid',
    '2026-04-01',
    '2026-04-30',
    '[{"description":"Journalism & Media Writing tuition"}]'
  ),
  (
    'Maria Collins',
    'Collins Family',
    'CIA-2026-003',
    17500,
    'past_due',
    '2026-03-01',
    '2026-03-31',
    '[{"description":"Creative Arts studio fee"},{"description":"Supplies"}]'
  )
) AS v(student_name, family_label, invoice_number, amount_cents, status, issued_date, due_date, line_items)
JOIN public.students st ON st.display_name = v.student_name;

INSERT INTO public.enrollments (class_id, student_id, status)
SELECT cl.id, st.id, v.status::public.workflow_status
FROM (VALUES
  ('Math', 'Anna Lee', 'approved'),
  ('ELA - Core', 'Anna Lee', 'approved'),
  ('Economics & Financial Literacy', 'Anna Lee', 'approved'),
  ('Ocean Explorers', 'Anna Lee', 'approved'),
  ('Force & Motion', 'Anna Lee', 'pending'),
  ('Digital Storytelling & Animation', 'Anna Lee', 'pending'),
  ('Health Sciences Lab', 'Anna Lee', 'approved'),
  ('Robotics Lab', 'George Lee', 'pending'),
  ('Robotics Lab', 'Bruna Lee', 'approved'),
  ('Ocean Explorers', 'James Smith', 'rejected')
) AS v(class_name, student_name, status)
JOIN public.classes cl ON cl.name = v.class_name
JOIN public.students st ON st.display_name = v.student_name;

INSERT INTO public.class_requests (
  student_id, class_id, requested_by_profile_id, status, block, level, option_label
)
SELECT st.id, cl.id, pr.id, v.status::public.workflow_status, v.block, v.level, v.option_label
FROM (VALUES
  ('Anna Lee', 'Force & Motion', 'parent.lee@cia.demo', 'pending', 'B4', '3', '1st'),
  ('Anna Lee', 'Digital Storytelling & Animation', 'parent.lee@cia.demo', 'pending', 'B4', '3', '2nd'),
  ('George Lee', 'Journalism & Media Writing', 'parent.lee@cia.demo', 'pending', 'B4', '3', '2nd'),
  ('Bruna Lee', 'Creative Arts', 'parent.lee@cia.demo', 'pending', 'B4', '3', '2nd'),
  ('James Smith', 'Ocean Explorers', 'parent.lee@cia.demo', 'rejected', 'B3', '3', '1st'),
  ('Bruce Collins', 'Robotics Lab', 'parent.collins@cia.demo', 'pending', 'B4', '3', '1st'),
  ('Maria Collins', 'Journalism & Media Writing', 'parent.collins@cia.demo', 'approved', 'B4', '3', '2nd')
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
JOIN public.classes cl ON cl.name = 'Economics & Financial Literacy'
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
    'Anna Lee requested Force & Motion — review prerequisites.',
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
