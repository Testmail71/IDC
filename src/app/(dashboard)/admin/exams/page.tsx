import { Download, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { ExamStatusBadge } from "@/components/ui/status-badge";
import { ExamEvaluationForm } from "@/components/admin/exam-evaluation-form";
import { requireAdmin } from "@/lib/auth";
import { BUCKETS } from "@/lib/constants";
import { getSignedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { ExamStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("examination_submissions")
    .select("*, evaluation:examination_evaluations(*)")
    .eq("is_active", true)
    .order("submitted_at", { ascending: false });

  const studentIds = Array.from(new Set((submissions ?? []).map((s) => s.student_id)));
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, full_name, registration_number")
        .in("id", studentIds)
    : { data: [] as { id: string; full_name: string; registration_number: string }[] };

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]));

  const rows = await Promise.all(
    (submissions ?? []).map(async (s) => {
      const evaluation = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation;
      const sheetUrl = await getSignedUrl(supabase, BUCKETS.examSheets, s.file_path, 3600);
      return {
        submission: s,
        evaluation,
        student: studentMap.get(s.student_id),
        sheetUrl,
      };
    }),
  );

  const pendingCount = rows.filter(
    (r) => r.submission.status === "submitted" || r.submission.status === "under_evaluation",
  ).length;

  return (
    <div>
      <PageHeader
        title="Examinations"
        description={`Evaluate submitted examination sheets and publish results. ${pendingCount} awaiting action.`}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No examination submissions"
              description="Student submissions will appear here for evaluation."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {rows.map(({ submission, evaluation, student, sheetUrl }) => (
            <Card key={submission.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{student?.full_name ?? "Unknown student"}</CardTitle>
                  <p className="text-xs text-stone-400">
                    {student?.registration_number ?? ""} · Exam date {formatDate(submission.examination_date)}
                  </p>
                </div>
                <ExamStatusBadge status={submission.status as ExamStatus} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-stone-500">
                    <FileText className="h-4 w-4" /> {submission.file_name ?? "Exam sheet"}
                  </span>
                  {sheetUrl && (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-saffron-700 hover:text-saffron-800"
                    >
                      <Download className="h-4 w-4" /> View sheet
                    </a>
                  )}
                </div>
                {submission.remarks && (
                  <p className="text-sm text-stone-500">Student remarks: {submission.remarks}</p>
                )}
                <ExamEvaluationForm
                  submissionId={submission.id}
                  initialResult={(evaluation?.result as "qualified" | "not_qualified") ?? ""}
                  initialFeedback={evaluation?.student_feedback ?? ""}
                  published={Boolean(evaluation?.published)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}