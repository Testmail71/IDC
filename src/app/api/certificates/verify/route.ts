import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, settingBool, settingString } from "@/lib/settings";

const schema = z.object({
  serial: z.string().trim().min(3).max(64),
});

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part, i) =>
      i === parts.length - 1 ? part : part.charAt(0).toUpperCase() + ".".repeat(Math.max(1, Math.min(3, part.length - 1))),
    )
    .join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid certificate number." },
        { status: 400 },
      );
    }

    const serial = parsed.data.serial.toUpperCase();
    const admin = createAdminClient();

    const { data: cert } = await admin
      .from("certificates")
      .select(
        "certificate_number, status, issue_date, published_at, revoked_at, revoke_reason, student:students(full_name, registration_number)",
      )
      .eq("certificate_number", serial)
      .maybeSingle();

    if (!cert) {
      return NextResponse.json({ ok: true, found: false });
    }

    const settings = await getSettings(admin);
    const disclose = settingBool(settings, "public_disclose_student_name");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = (cert as any).student as
      | { full_name: string; registration_number: string }
      | null;

    const valid = cert.status === "published";

    return NextResponse.json({
      ok: true,
      found: true,
      valid,
      status: cert.status,
      certificateNumber: cert.certificate_number,
      issueDate: cert.issue_date,
      studentName: student
        ? disclose
          ? student.full_name
          : maskName(student.full_name)
        : null,
      registrationNumber: student ? student.registration_number : null,
      courseName: "ISKCON Disciples Course",
      templeName: settingString(settings, "temple_name"),
      revokedReason: valid ? null : cert.revoke_reason,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}