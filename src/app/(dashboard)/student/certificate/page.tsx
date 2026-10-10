import { Award, Download, ExternalLink, FileBadge, Lock } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CertificateStatusBadge } from "@/components/ui/status-badge";
import { requireStudent } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getStudentFinance } from "@/lib/queries";
import { cacheSettings } from "@/lib/settings-cache";
import { createClient } from "@/lib/supabase/server";
import { settingBool } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StudentCertificatePage() {
  const session = await requireStudent();
  const supabase = await createClient();

  const [finance, settings, certRes, submission] = await Promise.all([
    getStudentFinance(supabase, session.user.id),
    cacheSettings(),
    supabase
      .from("certificates")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("examination_submissions")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const evalRes = submission.data
    ? await supabase
        .from("examination_evaluations")
        .select("result, published")
        .eq("submission_id", submission.data.id)
        .eq("published", true)
        .maybeSingle()
    : { data: null };

  const certificate = certRes.data;
  const qualified = evalRes.data?.result === "qualified";
  const requiresPayment = settingBool(
    { require_payment_before_certificate: settings.requirePaymentBeforeCertificate },
    "require_payment_before_certificate",
  );
  const settled =
    finance?.payment_status === "paid" ||
    finance?.payment_status === "waived" ||
    finance?.payment_status === "overpaid";
  const paymentBlocked = requiresPayment && !settled;

  return (
    <div>
      <PageHeader
        title="My Certificate"
        description="Your course completion certificate and its public verification link."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!certificate ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                    <FileBadge className="h-7 w-7" />
                  </span>
                  <p className="mt-4 font-semibold text-stone-700">Certificate not yet issued</p>
                  <p className="mt-1 max-w-md text-sm text-stone-500">
                    {qualified
                      ? "You have qualified in the examination. The administrator will issue your certificate shortly."
                      : "Your certificate becomes available after you qualify in the examination and the administrator issues it."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="bg-hero p-8 text-center">
                <Award className="mx-auto h-12 w-12 text-gold-300" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                  Certificate of Completion
                </p>
                <p className="mt-1 text-2xl font-bold text-white">ISKCON Disciples Course</p>
                <p className="mt-2 text-sm text-stone-300">
                  Issued on {formatDate(certificate.issue_date)}
                </p>
              </div>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-stone-400">Certificate number</p>
                    <p className="font-mono text-lg font-semibold text-maroon-900">
                      {certificate.certificate_number}
                    </p>
                  </div>
                  <CertificateStatusBadge status={certificate.status} />
                </div>

                {certificate.status === "revoked" && (
                  <Alert variant="error" title="Certificate revoked">
                    {certificate.revoke_reason || "This certificate has been revoked."}
                  </Alert>
                )}

                {certificate.status === "published" ? (
                  paymentBlocked ? (
                    <Alert variant="warning" title="Payment required">
                      Your certificate is ready but is withheld until the course fee is
                      settled. Outstanding: see the payments section.
                    </Alert>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`/api/certificates/${certificate.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-saffron-700"
                      >
                        <Download className="h-4 w-4" /> Download certificate
                      </a>
                      <a
                        href={`/verify?serial=${certificate.certificate_number}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                      >
                        <ExternalLink className="h-4 w-4" /> Verify
                      </a>
                    </div>
                  )
                ) : (
                  <Alert variant="info" title="Not yet published">
                    The administrator is finalising your certificate. It will appear here
                    once published.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Examination" value={qualified ? "Qualified" : "Pending"} />
              <Row
                label="Payment"
                value={finance ? finance.payment_status.replace(/_/g, " ") : "—"}
              />
              <Row
                label="Certificate"
                value={certificate ? certificate.status : "Not issued"}
              />
            </CardContent>
          </Card>
          {paymentBlocked && (
            <Alert variant="warning">
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4" /> Settle the course fee to unlock your certificate.
              </span>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium capitalize text-stone-800">{value}</span>
    </div>
  );
}