import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTION_TONES: Record<string, "saffron" | "green" | "red" | "blue" | "amber" | "stone" | "gold" | "maroon"> = {
  "student.registered": "blue",
  "student.admission_decision": "saffron",
  "payment.recorded": "blue",
  "payment.verified": "green",
  "payment.rejected": "red",
  "payment.reverted": "red",
  "refund.recorded": "amber",
  "refund.confirmed": "green",
  "exam.submitted": "blue",
  "exam.evaluated": "amber",
  "exam.result_published": "green",
  "certificate.published": "green",
  "certificate.revoked": "red",
  "setting.updated": "gold",
};

export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const actorIds = Array.from(
    new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id))),
  );
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };

  const actorName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="A chronological record of important actions across the portal."
      />
      <Card>
        <CardContent className="p-5">
          {(logs ?? []).length === 0 ? (
            <EmptyState title="No activity recorded" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Description</TH>
                  <TH>Entity</TH>
                </TR>
              </THead>
              <TBody>
                {(logs ?? []).map((l) => (
                  <TR key={l.id}>
                    <TD className="whitespace-nowrap text-xs text-stone-500">
                      {formatDate(l.created_at, true)}
                    </TD>
                    <TD className="text-sm">
                      {l.actor_id ? actorName.get(l.actor_id) ?? "—" : "System"}
                      {l.actor_role && (
                        <span className="block text-xs text-stone-400">
                          {ROLE_LABELS[l.actor_role as UserRole] ?? l.actor_role}
                        </span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={ACTION_TONES[l.action] ?? "stone"}>{l.action}</Badge>
                    </TD>
                    <TD className="text-sm text-stone-600">{l.description ?? "—"}</TD>
                    <TD className="text-xs text-stone-400">{l.entity_type ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}