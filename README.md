# Curious Innovators Academy

**An open-source student information system and school scheduling starter.**

Build a school workspace that connects student records, classes, teachers, and families. Fork this project to explore a school idea, build a tool for your learning community, or contribute improvements other schools can use.

[Explore the Vercel demo](https://curious-innovators-academy.vercel.app) · [Getting started](#run-your-own-copy) · [Contribute](CONTRIBUTING.md) · [MIT license](LICENSE)

## What you can build with it

Curious Innovators Academy is a working application foundation for school operations. It combines an SIS, a student information system, with class scheduling and a family portal. It is especially suited to experimenting with core classes, enrichment programs, and flexible learning communities.

| Workspace | What it covers |
| --- | --- |
| Parent | Student profiles, family schedules, class catalog, enrichment requests, feedback, notifications, and invoices |
| Teacher | Assigned classes, teaching schedule, and student rosters |
| Admin | Student and teacher directories, class planning, enrollment approvals, capacity, semesters, and schedule history |

Other building blocks include support tickets, audit events, competency mappings, avatar uploads, and role-based database access.

This is a customizable starter, with the operational decisions left to your school. It does not claim regulatory certification, payment processing, a full learning management system, or a complete attendance and grading product.

## Try the demo

**Hosting status:** the landing page is available. Demo sign-in is awaiting reactivation of the hosted Supabase database. You can run your own copy with the setup below.

Open **[curious-innovators-academy.vercel.app](https://curious-innovators-academy.vercel.app)** and choose **Demo Parent**, **Demo Teacher**, or **Demo Admin**. Visitors do not enter an email or password.

The demo uses shared accounts. Treat anything entered there as public and use fictional information. To build a real school, fork the repository and connect your own database.

## Run your own copy

You need Node.js 22 or later, npm, and a Supabase project. Use an empty project for the first setup.

```bash
git clone https://github.com/dejoski/curious-innovators-academy.git
cd curious-innovators-academy
npm ci
cp .env.example .env.local
```

1. In your Supabase dashboard, open the SQL Editor. Apply the files in `supabase/migrations/` in filename order, starting with `20260429120000_track2_rls_schema.sql`. The initial migration creates the tables; later migrations evolve them. `SUPABASE_SCHEMA.sql` is a reference, not an additional migration.
2. Set the project URL, publishable/anon key, and server-only service-role key in `.env.local`. Keep this file private.
3. Set `DEMO_MODE=true` for a database containing fictional records. Run `npm run setup:demo` to create the demo accounts and sample school.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

```bash
npm run setup:demo
npm run dev
```

The setup command adds its own fictional records and selects the demo school year as the active term. It does not reset a database. Keep demo and real-school deployments separate.

### Deploy your fork to Vercel

Import your fork into Vercel, select the Next.js preset, and copy the environment variables from your private `.env.local` into the project's environment settings. Deploy after the Supabase migrations and demo setup finish. Each fork uses its own Supabase project and hosting account.

For a real-school deployment, set `DEMO_MODE=false` and implement your school's invitation or identity-provider sign-in before admitting users. Public demo access is deliberately unsuitable for private student records.

## Make it your school

- Change the name, metadata, and landing page in `src/app/layout.tsx` and `src/app/login/`.
- Replace the artwork in `public/images/` with your school's assets.
- Adapt the class model and scheduling rules through versioned Supabase migrations.
- Build on the parent, teacher, and admin workspaces in `src/app/dashboard/`.
- Add attendance, grading, admissions, or integrations where your community needs them.

Keep the MIT license and copyright notice when redistributing the project. You can modify it, self-host it, and use it commercially.

## How it fits together

```text
Next.js pages and React components
              |
       Next.js API routes
              |
  Supabase Auth + PostgreSQL + RLS
```

The application uses TypeScript, Next.js App Router, React, Tailwind CSS, and Supabase. Database row-level security, or RLS, limits which records each signed-in role can access. School-facing dates use `America/New_York`.

| Directory | Purpose |
| --- | --- |
| `src/app/dashboard/` | School workspaces and screens |
| `src/app/api/` | Authentication and school-data endpoints |
| `src/lib/data/repositories/` | Database reads and row mapping |
| `supabase/migrations/` | Ordered schema and access-control changes |
| `scripts/` | Setup and verification tools |
| `e2e/` | Browser regression checks |

Demo login creates a real Supabase session for a server-selected account marked as a demo account. A visitor cannot submit an arbitrary email or role elevation. School data continues through the normal authenticated database paths.

## Check your changes

```bash
npm run lint
npm run typecheck
npm run check:api-auth-guards
npm run check:sql-security
npm run build
npm run test:e2e
```

The additional `npm run check:data-boundaries` audit currently flags a pre-existing service-role read in competency mapping lookup. That path needs a scoped-access review before adapting this starter for private school records.

Browser tests require Playwright Chromium. Install it with `npx playwright install chromium` before the first run. For deployment verification, check each demo role against your deployed URL; a successful build alone does not establish that the database is configured.

## Contribute

Useful contributions include clearer setup instructions, accessibility improvements, scheduling edge cases, localization, and tests for parent/teacher access boundaries. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

Built and maintained by [Dejan Stajic](https://github.com/dejoski). Contributions are welcome from educators and developers alike.

## License and third-party software

The project's original code and included original artwork are available under the [MIT license](LICENSE). Dependencies retain their own licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
