# Deployment Guide — IDC Portal

This guide deploys the portal to **Vercel** with a **Supabase** backend.

---

## 1. Prepare Supabase (production)

You may reuse the development project or create a dedicated production project.

1. **Create the project** and record:
   - Project URL
   - `anon` public key
   - `service_role` key (secret)
2. **Apply migrations.** Run every file in `supabase/migrations` in numeric
   order via the SQL Editor or `supabase db push`. Do **not** run
   `scripts/seed-demo.mjs` against production.
3. **Storage buckets** are created by `00004_storage.sql`. Confirm the buckets
   `student-photos`, `exam-sheets`, `certificates`, `payment-proofs`
   (private) and `public-assets` (public) exist and that the policies applied.
4. **Auth → URL Configuration**
   - **Site URL:** `https://your-domain.com`
   - **Redirect URLs:** add
     - `https://your-domain.com/auth/callback`
     - `https://your-domain.com/reset-password`
     - (and the `http://localhost:3000/...` equivalents for staging/dev)
5. **Auth → Providers → Email:** enable Email. If you want registrations to
   require email confirmation, keep "Confirm email" on; the app handles both
   flows. For low-friction onboarding you may turn it off.
6. **(Optional) SMTP:** configure a custom SMTP provider under
   Auth → Emails so password-reset and confirmation emails are delivered
   reliably (the built-in sender is heavily rate-limited).

## 2. Deploy to Vercel

1. Push this repository to GitHub/GitLab.
2. In Vercel, **Import Project** and select the repo. The framework is detected
   automatically (Next.js).
3. **Environment Variables** (Production, Preview, Development):

   | Name                            | Value                                   |
   | ------------------------------- | --------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`          | `https://your-domain.com`               |
   | `NEXT_PUBLIC_SUPABASE_URL`      | your Supabase project URL               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key                           |
   | `SUPABASE_SERVICE_ROLE_KEY`     | your service-role key (**mark secret**) |

   `SEED_ADMIN_*` variables are only used by the local bootstrap script and are
   not required on Vercel.

4. **Deploy.** Every push to the production branch redeploys.

## 3. Create the first Super Admin

Run the bootstrap script locally against the production project (keep the
service-role key out of CI):

```bash
# .env.local should point at the PRODUCTION Supabase project
npm run create-admin
```

Then sign in at `/login` and immediately change the password.

## 4. Post-deploy checklist

- [ ] Sign in as Super Admin and open **Admin → Settings** to set the temple
      name, contact details, homepage content, registration open/closed and file
      size limits. Upload your logo.
- [ ] Open **Admin → Fee Settings** and confirm the active course fee.
- [ ] Register a test student end-to-end: register → approve → assign teacher →
      record and verify a payment → submit exam → evaluate & publish → issue &
      publish certificate → verify it on `/verify`.
- [ ] Confirm password-reset emails arrive (test the `/forgot-password` flow).

## 5. Notes & hardening

- **Service-role key** must only ever be set as a server-side env var. It
  bypasses RLS; leaking it compromises the whole database.
- **`dynamic = "force-dynamic"`** is set on data pages so builds never require a
  live database and always render fresh, permission-scoped data.
- **`vercel.json`** is not required; default Next.js build settings work.
- **Backups:** enable Supabase daily backups (available on paid plans) or
  schedule `pg_dump` snapshots.
- **Storage limits:** file-size caps are configurable in Admin → Settings; keep
  them below your Vercel/route body limits for server-uploaded photos.
- **Scaling:** the app is stateless; scale by Vercel functions and a larger
  Postgres compute tier. Read-heavy pages benefit from the security-invoker
  view and existing indexes.
- **Custom domain:** add it in Vercel → Domains, update `NEXT_PUBLIC_SITE_URL`
  and the Supabase redirect URLs, then redeploy.
