import { CheckCircle2, ClipboardCheck, Download, FileText, XCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ExamSubmitForm } from "@/components/student/exam-form";
import { ExamStatusBadge } from "@/components/ui/status-badge";
import { requireStudent } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getStudentByUser, getStudentProgress } from "@/lib/queries";
import { cacheSettings } from "@/lib/settings-cache";
import { getSignedUrl } from "@/lib/storage";
import { BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ExamStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentExamPage() {
  const session = await requireStudent();
  const supabase = await createClient();
  const [student, bundle, settings] = await Promise.all([
    getStudentByUser(supabase, session.user.id),
    getStudentProgress(supabase, session.user.id),
    cacheSettings(),
  ]);

  const totalClasses = bundle?.course?.total_classes ?? 12;
  const completed = bundle?.progress?.classes_completed ?? 0;
  const exception = bundle?.progress?.exam_exception_allowed ?? false;
  const eligible = (bundle?.progress?.status === "completed") || exception;

  const { data: submission } = await supabase
    .from("examination_submissions")
    .select("*")
    .eq("student_id", session.user.id)
    .eq("is_active", true)
    .maybeSingle();

  let evaluation: {
    result: "qualified" | "not_qualified" | null;
    student_feedback: string | null;
    published: boolean;
  } | null = null;
  let fileUrl: string | null = null;

  if (submission) {
    const [evalRes, signed] = await Promise.all([
      supabase
        .from("examination_evaluations")
        .select("result, student_feedback, published")
        .eq("submission_id", submission.id)
        .eq("published", true)
        .maybeSingle(),
      getSignedUrl(supabase, BUCKETS.examSheets, submission.file_path, 600),
    ]);
    evaluation = evalRes.data ?? null;
    fileUrl = signed;
  }

  const status = (submission?.status as ExamStatus | undefined) ?? null;
  const needsResubmission = status === "resubmission_requested";

  return (
    <div>
      <PageHeader
        title="Examination"
        description="Submit your examination sheet and track your result."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!student || student.status !== "approved" ? (
            <Alert variant="info" title="Approval pending">
              The examination becomes available once your registration is approved.
            </Alert>
          ) : !eligible ? (
            <Alert variant="warning" title="Not yet eligible">
              You have completed {completed} of {totalClasses} classes. The examination
              requires all classes to be completed, unless the administrator grants a
              special exception.
            </Alert>
          ) : submission && !needsResubmission ? (
            <Card>
              <CardHeader>
                <CardTitle>Submitted examination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <ExamStatusBadge status={status ?? "submitted"} />
                  <span className="text-sm text-stone-500">
                    Submitted on {formatDate(submission.submitted_at, true)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                  <FileText className="h-5 w-5 text-saffron-600" />
                  <span className="text-sm text-stone-700">{submission.file_name ?? "Examination sheet"}</span>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                  )}
                </div>
                {submission.remarks && (
                  <p className="text-sm text-stone-500">Your remarks: {submission.remarks}</p>
                )}
                {submission.status === "submitted" && (
                  <Alert variant="info">
                    Your sheet is awaiting evaluation. You will be notified when the result is published.
                  </Alert>
                )}
                {submission.status === "under_evaluation" && (
                  <Alert variant="info">Your sheet is currently under evaluation.</Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{needsResubmission ? "Submit a new examination sheet" : "Submit your examination sheet"}</CardTitle>
              </CardHeader>
              <CardContent>
                {needsResubmission && (
                  <Alert variant="warning" className="mb-4">
                    The examiner has requested a resubmission. Please review any feedback
                    and upload a new sheet.
                  </Alert>
                )}
                <ExamSubmitForm
                  userId={session.user.id}
                  maxMb={settings.examSheetLimitMb}
                  isResubmission={needsResubmission}
                />
              </CardContent>
            </Card>
          )}

          {evaluation && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evaluation.result === "qualified" ? (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Congratulations — you have qualified!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Result: Not qualified</span>
                  </div>
                )}
                {evaluation.student_feedback && (
                  <div>
                    <p className="text-sm font-medium text-stone-700">Feedback</p>
                    <p className="mt-1 text-sm text-stone-600">{evaluation.student_feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Eligibility
              </p>
              <Row label="Classes completed" value={`${completed}/${totalClasses}`} />
              <Row label="Course status" value={bundle?.progress?.status ?? "—"} />
              <Row label="Special exception" value={exception ? "Granted" : "No"} />
            </CardContent>
          </Card>
          <Alert variant="info">
            <span className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Upload a clear photo or PDF scan of your completed answer sheet.
            </span>
          </Alert>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium capitalize text-stone-800">{value.replace(/_/g, " ")}</span>
    </div>
  );
}