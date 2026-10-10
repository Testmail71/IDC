import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Users,
  Wallet,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { ProgressBar } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { CourseStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty";
import { requireTeacher } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { CourseStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const session = await requireTeacher();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("can_view_finance, can_publish_results")
    .eq("id", session.user.id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("student_id")
    .eq("teacher_id", session.user.id)
    .eq("is_active", true);

  const studentIds = (assignments ?? []).map((a) => a.student_id);

  if (studentIds.length === 0) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${session.profile?.full_name?.split(" ")[0] ?? "Teacher"}`}
          description="Overview of your assigned students."
        />
        <Card>
          <CardContent>
            <EmptyState
              title="No students assigned yet"
              description="Once the administrator assigns students to you, they will appear here."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [studentsRes, progressRes, financeRes] = await Promise.all([
    supabase.from("students").select("id, full_name, registration_number, status").in("id", studentIds),
    supabase
      .from("course_enrollments")
      .select("student_id, course:courses(total_classes), progress:course_progress(classes_completed, status)")
      .in("student_id", studentIds),
    teacher?.can_view_finance
      ? supabase.from("v_student_finance").select("student_id, payment_status, outstanding_due, currency").in("student_id", studentIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const students = studentsRes.data ?? [];
  const rows = students.map((s) => {
    const enrollment = (progressRes.data ?? []).find((e) => e.student_id === s.id) as
      | {
          course: { total_classes: number } | null;
          progress: { classes_completed: number; status: CourseStatus } | { classes_completed: number; status: CourseStatus }[] | null;
        }
      | undefined;
    const progress = Array.isArray(enrollment?.progress) ? enrollment?.progress[0] : enrollment?.progress;
    const total = enrollment?.course?.total_classes ?? 12;
    const finance = (financeRes.data ?? []).find((f) => f.student_id === s.id);
    return {
      ...s,
      classesCompleted: progress?.classes_completed ?? 0,
      totalClasses: total,
      courseStatus: progress?.status ?? ("not_started" as CourseStatus),
      finance,
    };
  });

  const completed = rows.filter((r) => r.courseStatus === "completed").length;
  const inProgress = rows.filter((r) => r.courseStatus === "in_progress").length;
  const dues = rows.reduce((sum, r) => sum + (Number(r.finance?.outstanding_due) || 0), 0);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${session.profile?.full_name?.split(" ")[0] ?? "Teacher"}`}
        description="Overview of your assigned students and their progress."
        actions={
          <Link
            href="/teacher/students"
            className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
          >
            View all students <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned students" value={rows.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="In progress" value={inProgress} icon={<BookOpen className="h-5 w-5" />} tone="saffron" />
        <StatCard label="Completed" value={completed} icon={<ClipboardCheck className="h-5 w-5" />} tone="green" />
        {teacher?.can_view_finance && (
          <StatCard
            label="Outstanding dues"
            value={formatCurrency(dues)}
            icon={<Wallet className="h-5 w-5" />}
            tone={dues > 0 ? "red" : "green"}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Students at a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-lg border border-stone-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/teacher/students/${r.id}`}
                    className="truncate text-sm font-medium text-stone-800 hover:text-maroon-800"
                  >
                    {r.full_name}
                  </Link>
                  <p className="text-xs text-stone-400">{r.registration_number}</p>
                  <div className="mt-2 max-w-xs">
                    <ProgressBar value={r.classesCompleted} max={r.totalClasses} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <CourseStatusBadge status={r.courseStatus} />
                  {r.finance && <PaymentStatusBadge status={r.finance.payment_status as PaymentStatus} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Alert variant="info" title="Your role">
          You can view and update the course progress of your assigned students.
          {teacher?.can_view_finance
            ? " You are also authorised to view their payment status."
            : " For financial information, please contact the administrator."}
        </Alert>
      </div>
    </div>
  );
}