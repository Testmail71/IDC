import { BookOpen, CalendarCheck2, ClipboardCheck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { CourseStatusBadge } from "@/components/ui/status-badge";
import { requireStudent } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getStudentProgress } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const session = await requireStudent();
  const supabase = await createClient();
  const bundle = await getStudentProgress(supabase, session.user.id);

  if (!bundle) {
    return (
      <div>
        <PageHeader title="Course Progress" />
        <Alert variant="info" title="Enrollment pending">
          You are not yet enrolled in a course. Course progress becomes available after
          your registration is approved.
        </Alert>
      </div>
    );
  }

  const total = bundle.course?.total_classes ?? 12;
  const completed = bundle.progress?.classes_completed ?? 0;
  const status = bundle.progress?.status ?? "not_started";
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Course Progress"
        description={bundle.course?.name ?? "ISKCON Disciples Course"}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-4xl font-bold text-maroon-900">{pct}%</p>
              <CourseStatusBadge status={status} />
            </div>
            <div className="mt-4">
              <ProgressBar value={completed} max={total} />
            </div>
            <p className="mt-2 text-sm text-stone-500">
              {completed} of {total} classes completed
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: total }).map((_, i) => {
                const done = i < completed;
                return (
                  <div
                    key={i}
                    className={
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                      (done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-white text-stone-400")
                    }
                  >
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
                        (done ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400")
                      }
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    Class {i + 1}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <Detail
                icon={<BookOpen className="h-4 w-4" />}
                label="Course"
                value={bundle.course?.name ?? "—"}
              />
              <Detail
                icon={<CalendarCheck2 className="h-4 w-4" />}
                label="Enrolled on"
                value={formatDate(bundle.enrolledAt)}
              />
              <Detail
                icon={<ClipboardCheck className="h-4 w-4" />}
                label="Completion date"
                value={bundle.progress?.completion_date ? formatDate(bundle.progress.completion_date) : "Not completed"}
              />
            </CardContent>
          </Card>

          {bundle.progress?.admin_remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-600">{bundle.progress.admin_remarks}</p>
              </CardContent>
            </Card>
          )}

          <Alert variant="info">
            Your teacher or the IDC administrator updates your class attendance. Contact
            them if a class you attended has not been marked.
          </Alert>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-50 text-saffron-600">
        {icon}
      </span>
      <div>
        <p className="text-xs text-stone-400">{label}</p>
        <p className="text-sm font-medium text-stone-800">{value}</p>
      </div>
    </div>
  );
}