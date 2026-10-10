// ------------------------------------------------------------------
// IDC Portal - demo data seeder
//
// Creates a handful of teachers and students, approves them, assigns
// teachers and records some payments so the dashboards have content.
//
// PREREQUISITES
//   1. Migrations applied to your Supabase project.
//   2. The Super Admin account created (run scripts/create-admin.mjs).
//   3. .env.local contains:
//        NEXT_PUBLIC_SUPABASE_URL
//        NEXT_PUBLIC_SUPABASE_ANON_KEY
//        SUPABASE_SERVICE_ROLE_KEY
//        SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (the account above)
//
// Usage:
//   node --env-file-if-exists=.env.local scripts/seed-demo.mjs
//
// This script is idempotent: re-running it skips users that already
// exist. It is for DEVELOPMENT / DEMONSTRATION only - never run it
// against a production database that holds real student data.
// ------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo!12345";

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}
if (!anonKey) fail("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
if (!adminEmail || !adminPassword) {
  fail("Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Run scripts/create-admin.mjs first.");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// A separate client that authenticates AS the super admin, so the
// workflow RPCs (which check is_admin()) and guard triggers pass.
const adminUser = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser({ email, fullName, role }) {
  let user = await findByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  created ${role}: ${email}`);
  } else {
    console.log(`  exists  ${role}: ${email}`);
  }
  return user.id;
}

async function main() {
  console.log("\n  IDC Portal - demo data seeder");
  console.log("  -----------------------------");
  console.log("  Signing in as super admin...");

  const { data: signInData, error: signInError } = await adminUser.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (signInError) {
    fail(
      `Could not sign in as ${adminEmail}: ${signInError.message}\n` +
        "  Ensure the account exists (scripts/create-admin.mjs) and the password matches.",
    );
  }
  const adminId = signInData.user.id;
  console.log("  Signed in.\n");

  // --- Teachers ---------------------------------------------------
  console.log("  Teachers:");
  const teacherAId = await ensureUser({
    email: "teacher.ananda@example.com",
    fullName: "Ananda Krsna Das",
    role: "teacher",
  });
  const teacherBId = await ensureUser({
    email: "teacher.bhakti@example.com",
    fullName: "Bhakti Lata Devi Dasi",
    role: "teacher",
  });

  const teachers = [
    { id: teacherAId, full_name: "Ananda Krsna Das", email: "teacher.ananda@example.com", phone: "+91 90000 00001", can_view_finance: true, can_publish_results: true, can_issue_certificates: false },
    { id: teacherBId, full_name: "Bhakti Lata Devi Dasi", email: "teacher.bhakti@example.com", phone: "+91 90000 00002", can_view_finance: false, can_publish_results: false, can_issue_certificates: false },
  ];
  for (const t of teachers) {
    const { error } = await admin.from("teachers").upsert(t, { onConflict: "id" });
    if (error) fail(`teacher upsert: ${error.message}`);
  }

  // --- Students ---------------------------------------------------
  console.log("\n  Students:");
  const studentSeeds = [
    { email: "student.radha@example.com", fullName: "Radha Priya Devi Dasi", phone: "+91 91111 00001", gender: "Female", city: "Mumbai", state: "Maharashtra", teacherId: teacherAId, plan: "paid" },
    { email: "student.govinda@example.com", fullName: "Govinda Charan Das", phone: "+91 91111 00002", gender: "Male", city: "Pune", state: "Maharashtra", teacherId: teacherAId, plan: "partial" },
    { email: "student.yamuna@example.com", fullName: "Yamuna Devi Dasi", phone: "+91 91111 00003", gender: "Female", city: "Thane", state: "Maharashtra", teacherId: teacherBId, plan: "unpaid" },
    { email: "student.nityananda@example.com", fullName: "Nityananda Ram Das", phone: "+91 91111 00004", gender: "Male", city: "Navi Mumbai", state: "Maharashtra", teacherId: null, plan: "pending" },
  ];

  const studentIds = {};
  for (const s of studentSeeds) {
    const id = await ensureUser({ email: s.email, fullName: s.fullName, role: "student" });
    studentIds[s.email] = id;

    // Insert-only: skip students that already exist (the update guard blocks
    // service-role updates to student rows that aren't "owned" by the caller).
    const { data: existing } = await admin
      .from("students")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existing) {
      console.log(`  student row exists: ${s.email}`);
      continue;
    }

    const { error } = await admin.from("students").insert({
      id,
      registration_number: `IDC-DEMO-${id.slice(0, 4).toUpperCase()}`,
      full_name: s.fullName,
      email: s.email,
      phone: s.phone,
      whatsapp: s.phone,
      gender: s.gender,
      city: s.city,
      state: s.state,
      status: "pending",
    });
    if (error) fail(`student insert (${s.email}): ${error.message}`);
  }

  // --- Approve + assign teachers via RPC --------------------------
  console.log("\n  Approving students...");
  for (const s of studentSeeds) {
    if (s.plan === "pending") continue;
    const id = studentIds[s.email];
    const { error } = await adminUser.rpc("approve_student", {
      p_student_id: id,
      p_teacher_id: s.teacherId,
    });
    if (error && !/approvable state/.test(error.message)) {
      console.log(`  (skip ${s.email}: ${error.message})`);
    }
  }

  // --- Payments ---------------------------------------------------
  console.log("\n  Recording payments...");
  async function pay(email, amount, method) {
    const id = studentIds[email];
    const { data, error } = await adminUser.rpc("record_payment", {
      p_student_id: id,
      p_amount: amount,
      p_payment_date: new Date().toISOString().slice(0, 10),
      p_method: method,
      p_reference: `DEMO-${email}`,
      p_received_by: adminId,
      p_idempotency_key: `demo-${email}`,
    });
    if (error) {
      console.log(`  (payment skip ${email}: ${error.message})`);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.p_payment_id) {
      const { error: vError } = await adminUser.rpc("verify_payment", {
        p_payment_id: row.p_payment_id,
        p_verified_by: adminId,
      });
      if (vError && !/verifiable state/.test(vError.message)) {
        console.log(`  (verify skip ${email}: ${vError.message})`);
      }
    }
    return row;
  }

  await pay("student.radha@example.com", 1500, "upi");
  await pay("student.govinda@example.com", 750, "cash");

  // --- Course progress --------------------------------------------
  console.log("\n  Updating course progress...");
  async function setProgress(email, classes) {
    const id = studentIds[email];
    const status = classes >= 12 ? "completed" : classes > 0 ? "in_progress" : "not_started";
    const { data: enr } = await adminUser
      .from("course_enrollments")
      .select("id")
      .eq("student_id", id)
      .limit(1)
      .maybeSingle();
    if (!enr?.id) {
      console.log(`  (progress skip ${email}: no enrollment)`);
      return;
    }
    const { error } = await adminUser
      .from("course_progress")
      .update({
        classes_completed: classes,
        status,
        completion_date: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("enrollment_id", enr.id);
    if (error) console.log(`  (progress skip ${email}: ${error.message})`);
  }

  await setProgress("student.radha@example.com", 8);
  await setProgress("student.govinda@example.com", 3);

  console.log("\n  Demo data ready.");
  console.log(`  Password for all demo accounts: ${DEMO_PASSWORD}`);
  console.log("  Teachers: teacher.ananda@example.com, teacher.bhakti@example.com");
  console.log("  Students: student.radha@example.com, student.govinda@example.com, etc.\n");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
