import { NextResponse, type NextRequest } from "next/server";

import {
  ALLOWED_IMAGE_TYPES,
  BUCKETS,
} from "@/lib/constants";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { getTypedSettings } from "@/lib/settings";
import { registrationSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoPath, uploadBuffer } from "@/lib/storage";

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const get = (key: string) => (form.get(key) ?? "").toString().trim();

  const parsed = registrationSchema.safeParse({
    full_name: get("full_name"),
    email: get("email"),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    gender: get("gender"),
    address: get("address"),
    city: get("city"),
    district: get("district"),
    state: get("state"),
    pincode: get("pincode"),
    teacher_id: get("teacher_id"),
    password: (form.get("password") ?? "").toString(),
    confirm_password: (form.get("confirm_password") ?? "").toString(),
    consent: get("consent") === "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();
  const settings = await getTypedSettings(admin);

  // Phone photo validation (server-side, independent of the browser).
  const photo = form.get("photo");
  let photoBuffer: ArrayBuffer | null = null;
  let photoType = "";
  let photoName = "";
  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { ok: false, fieldErrors: { photo: "Upload a JPG or PNG image." } },
        { status: 400 },
      );
    }
    if (photo.size > settings.studentPhotoLimitMb * 1024 * 1024) {
      return NextResponse.json(
        {
          ok: false,
          fieldErrors: {
            photo: `Photo must be smaller than ${settings.studentPhotoLimitMb} MB.`,
          },
        },
        { status: 400 },
      );
    }
    photoBuffer = await photo.arrayBuffer();
    photoType = photo.type;
    photoName = photo.name;
  } else {
    return NextResponse.json(
      { ok: false, fieldErrors: { photo: "A passport-style photo is required." } },
      { status: 400 },
    );
  }

  if (!settings.registrationOpen) {
    return NextResponse.json(
      { ok: false, error: "Registration is currently closed. Please contact the IDC department." },
      { status: 403 },
    );
  }

  // Duplicate email check (auth-level identity).
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { email: "An account with this email already exists. Please log in instead." },
      },
      { status: 409 },
    );
  }

  // Duplicate phone is a soft warning - legitimate family members may share one.
  const warnings: string[] = [];
  const { data: existingPhone } = await admin
    .from("students")
    .select("registration_number")
    .eq("phone", input.phone)
    .maybeSingle();
  if (existingPhone) {
    warnings.push(
      "Another registration already uses this phone number. If this is not you, please verify the number.",
    );
  }

  // Create the auth user. The profiles row is created by a DB trigger.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      phone: input.phone,
      role: "student",
    },
  });

  if (createError || !created.user) {
    const alreadyExists = /already|exists|registered/i.test(createError?.message ?? "");
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: alreadyExists
          ? { email: "An account with this email already exists. Please log in instead." }
          : undefined,
        error: alreadyExists ? undefined : "Could not create your account. Please try again.",
      },
      { status: alreadyExists ? 409 : 500 },
    );
  }

  const userId = created.user.id;

  try {
    const { data: regNumber, error: regError } = await admin.rpc(
      "next_registration_number",
      { p_year: new Date().getFullYear() },
    );
    if (regError || !regNumber) {
      throw new Error(regError?.message ?? "Could not allocate a registration number.");
    }

    const path = photoPath(userId, photoName);
    await uploadBuffer(admin, BUCKETS.photos, path, photoBuffer!, photoType);

    const { error: studentError } = await admin.from("students").insert({
      id: userId,
      registration_number: regNumber,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp || null,
      gender: input.gender,
      address: input.address,
      city: input.city,
      district: input.district,
      state: input.state,
      pincode: input.pincode,
      teacher_id: input.teacher_id || null,
      photo_path: path,
      status: "pending",
    });

    if (studentError) throw new Error(studentError.message);

    await recordAudit(admin, {
      action: AUDIT_ACTIONS.REGISTERED,
      entityType: "student",
      entityId: userId,
      description: `New student registration (${regNumber})`,
      metadata: { email: input.email, phone: input.phone, registration_number: regNumber },
    });

    return NextResponse.json({
      ok: true,
      registrationNumber: regNumber,
      warnings,
    });
  } catch (error) {
    // Roll back the auth user so the email is not left in a half-created state.
    await admin.auth.admin.deleteUser(userId);
    console.error("Registration failed:", error);
    return NextResponse.json(
      { ok: false, error: "Registration could not be completed. Please try again." },
      { status: 500 },
    );
  }
}