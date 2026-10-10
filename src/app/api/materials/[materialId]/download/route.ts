import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSession, isAdminRole } from "@/lib/auth";
import { BUCKETS } from "@/lib/constants";
import { getStudentFinance } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const { materialId } = await params;
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("course_materials")
    .select("*")
    .eq("id", materialId)
    .maybeSingle();

  const role = session.profile?.role ?? "student";
  const isAdmin = isAdminRole(role);

  if (!material) {
    if (!isAdmin && role === "student") {
      const finance = await getStudentFinance(supabase, session.user.id);
      const settled =
        finance?.payment_status === "paid" ||
        finance?.payment_status === "waived" ||
        finance?.payment_status === "overpaid";
      if (!settled) {
        return NextResponse.json(
          { error: "Course material becomes available once the course fee is settled." },
          { status: 402 },
        );
      }
    }
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from(BUCKETS.materials)
    .createSignedUrl(material.file_path, 300);

  if (error || !signed) {
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
