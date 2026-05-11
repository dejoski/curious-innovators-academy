# Deployment notes — Curious Innovators Academy

Concise ops reference for this Next.js dashboard (App Router under `src/app`).

## Local build & run

| Command | Purpose |
|--------|---------|
| `npm install` | Dependencies |
| `npm run dev` | Dev server (default **http://localhost:3000**) |
| `npm run build` | Production build |
| `npm start` | Serve after `build` |
| `npm run lint` | ESLint |
| `npm run check:routes` | Validates internal links vs `src/app` routes (`scripts/check-routes.mjs`) |
| `npm run test:e2e` | Playwright (`e2e/`); installs browsers with `npx playwright install` on first machine |

Playwright uses **port 3150** (`PORT=3150 npm run dev` or auto-started server in `playwright.config.ts`). Use 3150 when reproducing E2E locally.

## Environment variables

Keep `.env*` out of git (see `.gitignore`). Supabase URLs and anon keys are **public-by-design** in the browser; never expose `SERVICE_ROLE`/server secrets via `NEXT_PUBLIC_*`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key (client-safe) |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Set `"false"` to hide the `/login` “Continue in demo mode” bypass |
| `NEXT_PUBLIC_SIGNUP_INVITE_CODE` | Invite string required on `/signup` (defaults to **`CIA-DEMO-2026`** when unset — **set a deployment-specific value in production**) |

Signing up uses Supabase `auth.signUp` when URL + anon key are set; otherwise the app treats signup like local/demo navigation (same pattern as login without backend).

### Signup invite code (production)

The invite gate is enforced in client code (`src/lib/signup-invite.ts`): users must enter the exact string returned by `getExpectedSignupInviteCode()`. Configure `NEXT_PUBLIC_SIGNUP_INVITE_CODE` per environment — it is readable in the bundle, so treat it like a casual gate rather than cryptographic security (pair with Supabase Auth settings and Row Level Security for real isolation).

## Demo login & credentials

Login (`/login`) validates email/password; with Supabase configured it calls **`signInWithPassword`**; otherwise it navigates without a backend session (**demo**). **`/signup`** validates password length ≥ 6, confirm match, invite code; with Supabase it calls **`signUp`**; otherwise it navigates to `/dashboard` like demo login — **no Supabase password or email can be read from this app.** If a third party needs access to an existing account they must reset the password via Supabase/email or be invited by an admin.

|E2E / smoke pairing (`e2e/smoke.spec.ts`) — **local demo navigation** when Supabase env is unset||
|---|---|
| Email | `name.example@gmail.com` |
| Password | `secret12` |

These values are **not** a guarantee of a live Supabase user; with `NEXT_PUBLIC_SUPABASE_*` set, login only succeeds if Auth has a matching user and password (or use the signup / reset flows below).

### Admin API, CLI, and service role (passwords and user creation)

| Approach | Creates or sets a password without exposing `service_role` in app code? |
|----------|---------------------------------------------------------------------------|
| **`anon` / publishable key** (browser, this app) | **No.** Only public Auth flows: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, OAuth, etc. You cannot call Admin REST endpoints or override another user’s password. |
| **Auth Admin REST** (`/auth/v1/admin/*`) | **Requires the service role key** (or equivalent privileged JWT). There is no supported way to administer users with the anon key alone. **Blocker for headless “set password” without a privileged key:** the Admin API refuses unprivileged credentials. |
| **Supabase CLI** | Manages projects, migrations, linking, and Postgres — **does not replace** privileged Auth Admin for creating users with arbitrary passwords without credentials. Commands like `supabase login` authenticate **you** to Supabase tooling, not End-user Auth admin operations without a linked service role secret. |
| **Supabase Dashboard** (Authentication → Users) while logged into [supabase.com](https://supabase.com) | **Yes**, as a human operator: invite a user, send recovery email, or use dashboard actions that do not embed `service_role` in this repository. |
| **Password reset email** | **Yes** for existing emails: user completes the link and picks a new password — no app secret required in the repo. |

**Conclusion:** Programmatic “set this user’s password to X” from this codebase **requires** the service role (or dashboard). There is **no** safe substitute using only the publishable key. To avoid ever storing `service_role` in the app, use **Dashboard**, **email recovery**, or **sign up on `/signup`** with the invite code.

### Real login path: signup with invite code (no service role)

1. Deploy or run locally with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (see `.env.example`).
2. Open **`/signup`**. Enter full name, email, password (≥ 6 characters), confirm password, and the invite code from `NEXT_PUBLIC_SIGNUP_INVITE_CODE`, or the default **`CIA-DEMO-2026`** if unset.
3. If the project has **Confirm email** enabled (Auth → Providers → Email), sign-in is blocked until the user clicks the confirmation link; the UI shows a “check your email” style message from `auth-bridge.ts`. Disable confirmation for internal dev projects if you need immediate login, or check the inbox/spam folder.
4. After confirmation (if required), open **`/login`** and sign in with the same email and password.

Invalid invite codes are rejected before `signUp` runs (`src/lib/supabase/auth-bridge.ts`).

### Promote `profiles.role` (admin / parent / student / teacher)

New users get **`parent`** by default via the `handle_new_user` trigger on `auth.users`. To change role, run SQL in the **Supabase SQL Editor** (runs with privileges that bypass normal RLS for maintenance). See commented examples in `supabase/ops/promote_profile_by_email.sql`. Only **admins** can change `role` or `email` through the Data API (`profiles_guard_role_and_email`); direct SQL in the Dashboard is for operators.

### Verify login locally (anon key only — no tokens printed)

With `.env.local` containing the public URL and anon key:

```bash
npm run verify:supabase-login -- you@example.com 'your-password'
```

Outputs **`OK`** or **`FAIL`** and an error message only; it does **not** print JWTs or access tokens (then signs out immediately after success).

## Persona switch (demo UX)

- **Where:** Dashboard header (“Test persona”): **Admin \| Parent \| Student**.
- **Storage:** `localStorage` key `cia-dashboard-persona` (`dashboard-persona.tsx`).
- **Default:** Renders as **admin** until the client reads storage (SSR stays deterministic).
- **Student persona:** Sidebar links use **`DEMO_STUDENT_ID = "1"`** → e.g. `/dashboard/students/1`, `/dashboard/students/1/schedule`, `/dashboard/students/1/roster`.

## Route map (high level)

| Area | Paths |
|------|--------|
| Entry | `/` → redirect to **`/login`** |
| Auth | `/login`, `/signup`, `/forgot-password` |
| Admin dashboard | `/dashboard`, `/dashboard/classes`, `/dashboard/classes/core`, `/dashboard/classes/enrichment`, `/dashboard/classes/approvals`, `/dashboard/classes/requests`, `/dashboard/students`, `/dashboard/parents`, `/dashboard/teachers`, `/dashboard/schedule`, `/dashboard/settings` |
| Parent | `/dashboard/parents/home`, `.../classes/core`, `.../classes/enrichment`, `.../catalog`, `.../students`, `.../feedback` |
| Student (demo id `1`) | `/dashboard/students/1`, `.../schedule`, `.../roster` |

Dynamic segments (e.g. class/student ids) exist under `src/app/dashboard/...`; `check:routes` covers static literals in TS/TSX.

## API

- **`GET /api/version`** — JSON `{ "version": "<from package.json>" }`.

## Vercel

- Preset **Next.js**, install `npm install`, build `npm run build`, output default unless you add config.
- No repo-specific **`vercel.json`** requirement identified for current static/UI phase; add env vars in the Vercel project when integrations land.
