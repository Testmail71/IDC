import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TeacherStudentsTable, type TeacherStudentRow } from "@/components/teacher/students-table";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const session = await requireTeacher();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("can_view_finance")
    .eq("id", session.user.id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("student_id")
    .eq("teacher_id", session.user.id)
    .eq("is_active", true);

  const ids = (assignments ?? []).map((a) => a.student_id);

  let rows: TeacherStudentRow[] = [];

  if (ids.length > 0) {
    const [studentsRes, progressRes, financeRes] = await Promise.all([
      supabase.from("students").select("id, full_name, registration_number").in("id", ids).order("full_name"),
      supabase
        .from("course_enrollments")
        .select("student_id, course:courses(total_classes), progress:course_progress(classes_completed, status)")
        .in("student_id", ids),
      teacher?.can_view_finance
        ? supabase.from("v_student_finance").select("student_id, payment_status, outstanding_due, currency").in("student_id", ids)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    rows = (studentsRes.data ?? []).map((s) => {
      const enrollment = (progressRes.data ?? []).find((e) => e.student_id === s.id) as
        | {
            course: { total_classes: number } | null;
            progress: { classes_completed: number; status: CourseStatus } | { classes_completed: number; status: CourseStatus }[] | null;
          }
        | undefined;
      const progress = Array.isArray(enrollment?.progress) ? enrollment?.progress[0] : enrollment?.progress;
      const finance = (financeRes.data ?? []).find((f) => f.student_id === s.id);
      return {
        id: s.id,
        full_name: s.full_name,
        registration_number: s.registration_number,
        classesCompleted: progress?.classes_completed ?? 0,
        totalClasses: enrollment?.course?.total_classes ?? 12,
        courseStatus: progress?.status ?? "not_started",
        paymentStatus: finance?.payment_status as PaymentStatus | undefined,
        outstanding: finance?.outstanding_due,
        currency: finance?.currency,
        showFinance: Boolean(teacher?.can_view_finance),
      };
    });
  }

  return (
    <div>
      <PageHeader
        title="My Students"
        description="Students currently assigned to you. Update their course progress from their profile."
      />
      <Card>
        <CardContent className="p-5">
          <TeacherStudentsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}