// ------------------------------------------------------------------
// IDC Portal - Super Admin bootstrap
//
// Creates (or repairs) a Super Admin account using the Supabase
// service-role key. Safe to run multiple times.
//
// Usage:
//   node --env-file-if-exists=.env.local scripts/create-admin.mjs
//
// Requires in the environment:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optional)
// ------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!12345";
const fullName = process.env.SEED_ADMIN_NAME || "IDC Administrator";

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Copy .env.example to .env.local and fill in the Supabase values first.",
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || "").toLowerCase() === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log("\n  IDC Portal - Super Admin bootstrap");
  console.log("  ----------------------------------");

  let userId;
  const existing = await findUserByEmail(email);

  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { role: "super_admin", full_name: fullName },
    });
    if (error) fail(`Could not update existing user: ${error.message}`);
    console.log(`  Updated existing account: ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "super_admin", full_name: fullName },
    });
    if (error) fail(`Could not create user: ${error.message}`);
    userId = data.user.id;
    console.log(`  Created account: ${email}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: "super_admin",
        full_name: fullName,
        email,
        is_active: true,
      },
      { onConflict: "id" },
    );
  if (profileError) fail(`Could not set profile role: ${profileError.message}`);

  console.log("  Profile role set to: super_admin");
  console.log("\n  Done. Sign in at /login with the credentials above.");
  console.log("  Change the password immediately after first sign-in.\n");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
