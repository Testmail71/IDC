import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { CertificateStatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { CertificateStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: certificates } = await supabase
    .from("certificates")
    .select("*")
    .order("created_at", { ascending: false });

  const studentIds = Array.from(new Set((certificates ?? []).map((c) => c.student_id)));
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, full_name, registration_number")
        .in("id", studentIds)
    : { data: [] as { id: string; full_name: string; registration_number: string }[] };

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]));

  const draftCount = (certificates ?? []).filter((c) => c.status === "draft").length;
  const publishedCount = (certificates ?? []).filter((c) => c.status === "published").length;

  return (
    <div>
      <PageHeader
        title="Certificates"
        description={`${draftCount} draft · ${publishedCount} published. Upload and manage certificates from each student's record.`}
      />

      <Card>
        <CardContent className="p-5">
          {(certificates ?? []).length === 0 ? (
            <EmptyState
              title="No certificates issued"
              description="Open a qualified student's record to upload and publish their certificate."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Certificate No.</TH>
                  <TH>Student</TH>
                  <TH>Version</TH>
                  <TH>Issued</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Manage</TH>
                </TR>
              </THead>
              <TBody>
                {(certificates ?? []).map((c) => {
                  const student = studentMap.get(c.student_id);
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium text-stone-900">{c.certificate_number}</TD>
                      <TD>
                        <span className="block text-stone-800">{student?.full_name ?? "Unknown"}</span>
                        <span className="text-xs text-stone-400">{student?.registration_number}</span>
                      </TD>
                      <TD>v{c.version}</TD>
                      <TD>{formatDate(c.issue_date)}</TD>
                      <TD>
                        <CertificateStatusBadge status={c.status as CertificateStatus} />
                      </TD>
                      <TD className="text-right">
                        <Link
                          href={`/admin/students/${c.student_id}`}
                          className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                        >
                          Open record
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}