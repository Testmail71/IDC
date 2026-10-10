import Link from "next/link";
import { Download, FileText, Lock } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireStudent } from "@/lib/auth";
import { getStudentFinance } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { CourseMaterial } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function StudentMaterialsPage() {
  const session = await requireStudent();
  const supabase = await createClient();

  const finance = await getStudentFinance(supabase, session.user.id);
  const settled =
    finance?.payment_status === "paid" ||
    finance?.payment_status === "waived" ||
    finance?.payment_status === "overpaid";

  const { data: materials } = settled
    ? await supabase
        .from("course_materials")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    : { data: [] as CourseMaterial[] };

  const rows = (materials ?? []) as CourseMaterial[];

  return (
    <div>
      <PageHeader
        title="Course Material"
        description="Study material shared by the IDC administration."
      />

      {!settled ? (
        <Alert variant="warning" title="Payment required">
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" /> Course material is available to students whose course
            fee is fully settled. Please clear your outstanding dues from the{" "}
            <Link href="/student/payments" className="font-semibold underline">
              My Payments
            </Link>{" "}
            section.
          </span>
        </Alert>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No material available yet"
              description="The administration has not published any course material. Please check back later."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((m) => {
            const size = formatSize(m.file_size);
            return (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-50 text-maroon-700">
                      <FileText className="h-5 w-5" />
                    </span>
                    {m.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {m.description && (
                    <p className="text-sm text-stone-600">{m.description}</p>
                  )}
                  <p className="text-xs text-stone-400">
                    {[size, `Added ${formatDate(m.created_at)}`].filter(Boolean).join(" · ")}
                  </p>
                  <a
                    href={`/api/materials/${m.id}/download`}
                    className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-saffron-700"
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
