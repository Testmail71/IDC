# ISKCON Disciples Course (IDC) Management Portal

A complete, secure portal for running the ISKCON Disciples Course: student
registration and admission, teacher assignment and course progress, examination
submission and evaluation, certificate issuance and public verification, and
full fee/payment management (manual cash/UPI/bank, partials, dues, PDF receipts,
refunds, adjustments and reports).

Built with **Next.js 16 (App Router)** + **Supabase** (Postgres, Auth, Storage)
with **Row Level Security** enforced at the database layer.

---

## Features

- **Public site** – home, about, contact, register, login, certificate
  verification, and password reset.
- **Student dashboard** – profile, course progress, exam submission, payments &
  receipts, certificate download, and notifications.
- **Teacher dashboard** – assigned students, progress updates, exam exception
  controls (admin-only), and optional finance visibility per teacher.
- **Admin console** – registration decisions, student management, teacher
  management, fee settings, payment recording/verification, dues reminders
  (in-portal + WhatsApp), refunds, examination evaluation, certificates,
  financial reports with CSV export, broadcast notifications, audit logs, and
  portal settings (including logo upload).
- **Role-based access** – `student`, `teacher`, `admin`, `super_admin`, enforced
  by RLS policies and security-definer workflow functions, not just the UI.
- **Money is server-authoritative** – all balances are derived from the
  `v_student_finance` view; client code never computes what a student owes.

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | Next.js 16.2 (App Router, Turbopack, React 19)     |
| Database  | Supabase Postgres with RLS                         |
| Auth      | Supabase Auth (email + password)                   |
| Storage   | Supabase Storage (private buckets + signed URLs)   |
| Styling   | Tailwind CSS v4 (custom saffron/maroon/gold theme) |
| Validation| Zod v4                                             |
| PDFs      | pdf-lib (payment receipts)                         |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) and note the project
URL, anon key and service-role key (Project Settings → API).

### 3. Configure environment

Copy the example file and fill in your values:

```bash
copy .env.example .env.local    # Windows
# cp .env.example .env.local    # macOS/Linux
```

Required variables:

| Variable                        | Where to find it                       |
| ------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Your app URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Project Settings → API (**secret**) |

> Never expose the service-role key to the browser or commit it to git.

### 4. Apply database migrations

Run every file in `supabase/migrations` **in order** using the Supabase SQL
Editor, the Supabase CLI, or any Postgres client connected to your project.

```
00001_schema_tables.sql        tables, indexes, triggers
00002_functions_views.sql       role helpers, guards, v_student_finance
00003_rls.sql                   row level security policies
00004_storage.sql               storage buckets + policies
00005_seed_defaults.sql         IDC course, classes, fee, settings
00006_workflow_functions.sql    approve/reject/payment/certificate RPCs
```

With the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### 5. Create the first Super Admin

```bash
npm run create-admin
```

This creates the account described by `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` in `.env.local` and sets its role to
`super_admin`. Change the password after your first sign-in.

### 6. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

### 7. (Optional) Load demo data

For a quick tour with sample teachers, students, payments and progress:

```bash
npm run seed-demo
```

The password for all generated demo accounts defaults to `Demo!12345`
(override with `DEMO_PASSWORD`). **Do not run this against a production
database containing real students.**

---

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the development server                 |
| `npm run build`       | Production build                             |
| `npm run start`       | Start the production server                  |
| `npm run lint`        | Run ESLint                                   |
| `npm run typecheck`   | Type-check with `tsc --noEmit`               |
| `npm run create-admin`| Bootstrap the Super Admin account            |
| `npm run seed-demo`   | Insert demo teachers/students/payments       |

---

## Project structure

```
src/
  app/
    (public)/            Public pages (home, about, contact, register, verify…)
    (dashboard)/         Authenticated areas: student/, teacher/, admin/
    api/                 Route handlers (registration, verification, downloads)
    auth/callback/       Supabase auth callback
  actions/               Server actions (auth, payments, certificates, …)
  components/
    ui/                  Reusable UI kit (buttons, inputs, tables, badges…)
    admin/ teacher/ layout/ auth/ charts/
  lib/
    supabase/            Browser, server, admin and middleware clients
    types.ts constants.ts validations.ts utils.ts
    auth.ts finance.ts storage.ts settings.ts audit.ts notifications.ts
    pdf.ts whatsapp.ts csv.ts queries.ts
supabase/
  migrations/            Ordered SQL migrations
scripts/
  create-admin.mjs       Super Admin bootstrap
  seed-demo.mjs          Demo data seeder
```

## Security model

- **RLS everywhere.** Students only ever see their own records; teachers only
  their assigned students; finance data only for teachers granted
  `can_view_finance`; admins get full read/write; `super_admin` has extra
  privileges (e.g. changing roles).
- **Guards as triggers.** Role changes, payment edits, fee adjustments, progress
  edits and exam submissions are constrained by database triggers, so even a
  compromised client cannot bypass the rules.
- **Numbering is concurrency-safe** via `id_sequences` row locks
  (`IDC-YYYY-0001`, `IDC-R-YYYY-0001`, `IDC-C-YYYY-0001`).
- **Fee snapshots.** A student's fees are snapshotted at approval, so later
  changes to global fee settings never retroactively change an existing balance.
- **Private files** are served through short-lived signed URLs; only the owner
  (or an admin) can obtain them.
- **Audit trail.** Important actions are written to `audit_logs` with actor and
  metadata.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a step-by-step Vercel + Supabase
production guide.
