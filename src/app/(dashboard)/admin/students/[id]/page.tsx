import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ExamStatusBadge,
  PaymentStatusBadge,
  RegistrationStatusBadge,
  TxnStatusBadge,
} from "@/components/ui/status-badge";
import { AssignTeacherControl } from "@/components/admin/assign-teacher-control";
import { AdjustmentForm } from "@/components/admin/adjustment-form";
import { CertificateManager, type CertificateRow } from "@/components/admin/certificate-manager";
import { ExamEvaluationForm } from "@/components/admin/exam-evaluation-form";
import { PaymentRowActions } from "@/components/admin/payment-actions";
import { ProgressForm } from "@/components/teacher/progress-form";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { requireAdmin } from "@/lib/auth";
import { BUCKETS } from "@/lib/constants";
import { getStudentFinance } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type CourseStatus,
  type ExamStatus,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentStatusTxn,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!student) notFound();

  const [
    teachersRes,
    finance,
    enrollmentRes,
    photoUrl,
    paymentsRes,
    adjustmentsRes,
    refundsRes,
    examRes,
    certsRes,
  ] = await Promise.all([
    supabase.from("teachers").select("id, full_name").eq("is_active", true).order("full_name"),
    getStudentFinance(supabase, id),
    supabase
      .from("course_enrollments")
      .select("id, course:courses(total_classes, name), progress:course_progress(*)")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSignedUrl(supabase, BUCKETS.photos, student.photo_path, 3600),
    supabase
      .from("payment_transactions")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_adjustments")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_refunds")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("examination_submissions")
      .select("*, evaluation:examination_evaluations(*)")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("certificates")
      .select("id, certificate_number, status, version, issue_date, is_active, file_path")
      .eq("student_id", id)
      .order("version", { ascending: false }),
  ]);

  const enrollment = enrollmentRes.data as unknown as
    | {
        id: string;
        course: { total_classes: number; name: string } | null;
        progress:
          | {
              classes_completed: number;
              status: CourseStatus;
              completion_date: string | null;
              exam_exception_allowed: boolean;
              admin_remarks: string | null;
            }
          | Array<{
              classes_completed: number;
              status: CourseStatus;
              completion_date: string | null;
              exam_exception_allowed: boolean;
              admin_remarks: string | null;
            }>
          | null;
      }
    | null;

  const progress = Array.isArray(enrollment?.progress) ? enrollment?.progress[0] : enrollment?.progress;
  const totalClasses = enrollment?.course?.total_classes ?? 12;
  const currency = finance?.currency ?? "INR";

  const payments = paymentsRes.data ?? [];
  const activeExam = (examRes.data ?? []).find((e) => e.is_active);
  const examEvaluation = activeExam
    ? Array.isArray(activeExam.evaluation)
      ? activeExam.evaluation[0]
      : activeExam.evaluation
    : null;

  const examSheetUrl = activeExam?.file_path
    ? await getSignedUrl(supabase, BUCKETS.examSheets, activeExam.file_path, 3600)
    : null;

  const certificates = (certsRes.data ?? []) as unknown as (CertificateRow & { file_path: string })[];

  return (
    <div>
      <Link
        href="/admin/students"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <PageHeader
        title={student.full_name}
        description={student.registration_number}
        actions={<RegistrationStatusBadge status={student.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Fee summary</CardTitle>
            </CardHeader>
            <CardContent>
              {finance ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Payable" value={formatCurrency(finance.total_payable, currency)} />
                  <StatCard label="Net paid" value={formatCurrency(finance.net_paid, currency)} tone="green" />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(finance.outstanding_due, currency)}
                    tone={finance.outstanding_due > 0 ? "red" : "green"}
                  />
                  <StatCard
                    label="Status"
                    value={<PaymentStatusBadge status={finance.payment_status as PaymentStatus} />}
                    tone="gold"
                  />
                </div>
              ) : (
                <EmptyState title="No fee assessment" description="Approve the registration to create the fee snapshot." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course progress</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollment ? (
                <ProgressForm
                  enrollmentId={enrollment.id}
                  totalClasses={totalClasses}
                  classesCompleted={progress?.classes_completed ?? 0}
                  status={progress?.status ?? "not_started"}
                  completionDate={progress?.completion_date ?? null}
                  adminRemarks={progress?.admin_remarks ?? null}
                  examExceptionAllowed={progress?.exam_exception_allowed ?? false}
                  isAdmin
                />
              ) : (
                <EmptyState title="Not enrolled" description="Approve the registration to enrol this student." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-5 pt-5">
                <RecordPaymentForm
                  studentId={id}
                  suggestedAmount={Number(finance?.outstanding_due ?? 0)}
                />
              </div>
              <div className="p-5">
                {payments.length === 0 ? (
                  <EmptyState title="No payments recorded" />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Receipt</TH>
                        <TH>Date</TH>
                        <TH>Method</TH>
                        <TH className="text-right">Amount</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {payments.map((p) => (
                        <TR key={p.id}>
                          <TD className="font-medium text-stone-900">{p.receipt_number}</TD>
                          <TD>{formatDate(p.payment_date)}</TD>
                          <TD>{PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}</TD>
                          <TD className="text-right">{formatCurrency(p.amount, currency)}</TD>
                          <TD>
                            <TxnStatusBadge status={p.status as PaymentStatusTxn} />
                          </TD>
                          <TD>
                            <PaymentRowActions
                              paymentId={p.id}
                              status={p.status as PaymentStatusTxn}
                              amount={Number(p.amount)}
                              currency={currency}
                              refundable
                            />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fee adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <AdjustmentForm studentId={id} />
              {adjustmentsRes.data && adjustmentsRes.data.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full border-collapse text-left">
                    <thead className="border-b border-stone-200 bg-stone-50">
                      <tr>
                        {["Date", "Type", "Amount", "Previous", "New", "Reason"].map((h) => (
                          <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {adjustmentsRes.data.map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2 text-sm">{formatDate(a.created_at)}</td>
                          <td className="px-3 py-2 text-sm">{a.adjustment_type}</td>
                          <td className="px-3 py-2 text-sm">{formatCurrency(a.amount, currency)}</td>
                          <td className="px-3 py-2 text-sm">{formatCurrency(a.previous_payable, currency)}</td>
                          <td className="px-3 py-2 text-sm">{formatCurrency(a.new_payable, currency)}</td>
                          <td className="px-3 py-2 text-sm text-stone-500">{a.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Examination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeExam ? (
                <EmptyState title="No examination submitted" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                    <ExamStatusBadge status={activeExam.status as ExamStatus} />
                    <span>Exam date: {formatDate(activeExam.examination_date)}</span>
                    {examSheetUrl && (
                      <a
                        href={examSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-saffron-700 hover:text-saffron-800"
                      >
                        <Download className="h-4 w-4" /> View sheet
                      </a>
                    )}
                  </div>
                  {activeExam.remarks && (
                    <p className="text-sm text-stone-500">Student remarks: {activeExam.remarks}</p>
                  )}
                  <ExamEvaluationForm
                    submissionId={activeExam.id}
                    initialResult={(examEvaluation?.result as "qualified" | "not_qualified") ?? ""}
                    initialFeedback={examEvaluation?.student_feedback ?? ""}
                    published={Boolean(examEvaluation?.published)}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <Avatar name={student.full_name} src={photoUrl} size="xl" />
              <div>
                <p className="font-semibold text-stone-900">{student.full_name}</p>
                <p className="text-sm text-stone-400">{student.registration_number}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-stone-600">
                <Mail className="h-4 w-4 text-stone-400" />
                <span className="min-w-0 break-all">{student.email}</span>
              </div>
              <div className="flex items-center gap-3 text-stone-600">
                <Phone className="h-4 w-4 text-stone-400" />
                <span>
                  {student.phone}
                  {student.whatsapp ? ` · WA ${student.whatsapp}` : ""}
                </span>
              </div>
              <div className="flex items-start gap-3 text-stone-600">
                <MapPin className="mt-0.5 h-4 w-4 text-stone-400" />
                <span>
                  {[student.address, student.city, student.district, student.state, student.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-stone-600">
                <CalendarDays className="h-4 w-4 text-stone-400" />
                <span>Enrolled {formatDate(student.enrollment_date)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignTeacherControl
                studentId={id}
                currentTeacherId={student.teacher_id}
                teachers={teachersRes.data ?? []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificateManager studentId={id} certificates={certificates} maxMb={5} />
            </CardContent>
          </Card>

          {refundsRes.data && refundsRes.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Refunds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {refundsRes.data.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0">
                    <span className="text-stone-600">{formatDate(r.refund_date)}</span>
                    <span>{formatCurrency(r.amount, currency)}</span>
                    <span className="text-xs capitalize text-stone-400">{r.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}