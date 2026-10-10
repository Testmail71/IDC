import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession, isAdminRole } from "@/lib/auth";
import { BUCKETS } from "@/lib/constants";
import { getStudentFinance } from "@/lib/queries";
import { getSettings, settingBool } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", certificateId)
    .maybeSingle();

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const role = session.profile?.role ?? "student";
  const isAdmin = isAdminRole(role);

  if (!isAdmin) {
    if (role === "student") {
      if (certificate.student_id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (certificate.status !== "published") {
        return NextResponse.json(
          { error: "Certificate is not yet available for download." },
          { status: 409 },
        );
      }
      const settings = await getSettings(supabase);
      if (settingBool(settings, "require_payment_before_certificate")) {
        const finance = await getStudentFinance(supabase, certificate.student_id);
        const settled =
          finance?.payment_status === "paid" ||
          finance?.payment_status === "waived" ||
          finance?.payment_status === "overpaid";
        if (!settled) {
          return NextResponse.json(
            { error: "The certificate will be available once the course fee is settled." },
            { status: 402 },
          );
        }
      }
    } else if (role === "teacher") {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", session.user.id)
        .eq("student_id", certificate.student_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKETS.certificates)
    .createSignedUrl(certificate.file_path, 300);

  if (error || !signed) {
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}