#!/usr/bin/env node
// Add a fictional school to an already-migrated, dedicated demo database.
const fs = require('node:fs');
const { parseEnv } = require('node:util');
const { createClient } = require('@supabase/supabase-js');
if (fs.existsSync('.env.local')) {
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync('.env.local', 'utf8')))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
const env = process.env;
if (env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true on a dedicated fictional-data database first.');
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set the Supabase URL and server-only service-role key.');
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function checked(query, step) {
  const result = await query;
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
  return result.data;
}
async function account(role, name) {
  const email = env[`DEMO_${role.toUpperCase()}_EMAIL`] || `demo.${role}@example.com`;
  let user;
  for (let page = 1; ; page++) {
    const data = await checked(db.auth.admin.listUsers({ page, perPage: 100 }), 'Read demo accounts');
    user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 100) break;
  }
  if (user && user.app_metadata?.demo !== true) throw new Error(`Refusing to adopt an existing non-demo ${role} account. Choose a new DEMO_${role.toUpperCase()}_EMAIL.`);
  if (!user) {
    const data = await checked(db.auth.admin.createUser({ email, email_confirm: true, app_metadata: { demo: true }, user_metadata: { full_name: name } }), `Create demo ${role}`);
    user = data.user;
  }
  await checked(db.from('profiles').upsert({ id: user.id, email, display_name: name, role }), `Set ${role} profile`);
  return user.id;
}
async function main() {
  await account('admin', 'Alex Morgan · Demo Admin');
  const parentProfile = await account('parent', 'Jordan Rivera · Demo Parent');
  const teacherProfile = await account('teacher', 'Sam Chen · Demo Teacher');
  await checked(db.from('parents').upsert({ profile_id: parentProfile }, { onConflict: 'profile_id' }), 'Create parent');
  await checked(db.from('teachers').upsert({ profile_id: teacherProfile, subjects: 'Science, design, and creative learning', program: 'core' }, { onConflict: 'profile_id' }), 'Create teacher');
  const parent = await checked(db.from('parents').select('id').eq('profile_id', parentProfile).single(), 'Find parent');
  const teacher = await checked(db.from('teachers').select('id').eq('profile_id', teacherProfile).single(), 'Find teacher');
  const term = 'd3000000-0000-4000-8000-000000000001';
  const now = new Date();
  const year = now.getUTCFullYear() - (now.getUTCMonth() < 7 ? 1 : 0);
  await checked(db.from('semesters').update({ is_current: false }).eq('is_current', true).neq('id', term), 'Select demo term');
  await checked(db.from('semesters').upsert({ id: term, name: 'Demo school year', starts_on: `${year}-08-01`, ends_on: `${year + 1}-07-31`, is_current: true }), 'Create term');
  const students = [
    { id: 'd1000000-0000-4000-8000-000000000001', display_name: 'Avery Rivera', age_years: 10, level: 'Level 3', track: 'core', avatar_url: '/images/avatars/student-1.png' },
    { id: 'd1000000-0000-4000-8000-000000000002', display_name: 'Riley Rivera', age_years: 8, level: 'Level 2', track: 'core', avatar_url: '/images/avatars/student-2.png' },
  ];
  await checked(db.from('students').upsert(students), 'Create fictional students');
  await checked(db.from('parent_students').upsert(students.map((s) => ({ parent_id: parent.id, student_id: s.id }))), 'Link family');
  const classes = [
    { id: 'd2000000-0000-4000-8000-000000000001', name: 'Science in the Garden', program: 'core', block: 'Block 1', schedule_days: ['Monday', 'Wednesday'], schedule_summary: 'Mon & Wed · 9:00–10:00', location: 'Learning Garden', description: 'Explore ecosystems through observation, experiments, and growing things.' },
    { id: 'd2000000-0000-4000-8000-000000000002', name: 'Creative Mathematics', program: 'core', block: 'Block 2', schedule_days: ['Tuesday', 'Thursday'], schedule_summary: 'Tue & Thu · 10:15–11:15', location: 'Studio 2', description: 'Discover patterns, solve problems, and explain your thinking.' },
    { id: 'd2000000-0000-4000-8000-000000000003', name: 'Build a Better World', program: 'enrichment', block: 'Block 3', schedule_days: ['Friday'], schedule_summary: 'Fri · 13:00–14:00', location: 'Maker Studio', description: 'A hands-on design club for curious builders and thoughtful inventors.' },
  ].map((c) => ({ ...c, teacher_id: teacher.id, semester_id: term, capacity: 16, status: 'active', is_active: true }));
  await checked(db.from('classes').upsert(classes), 'Create classes');
  await checked(db.from('enrollments').upsert(students.map((s, i) => ({ id: `d4000000-0000-4000-8000-00000000000${i + 1}`, student_id: s.id, class_id: classes[i].id, status: 'approved' }))), 'Enroll students');
  console.log('Demo setup finished: 3 role accounts, 2 fictional students, 3 classes. Open /login to explore.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
