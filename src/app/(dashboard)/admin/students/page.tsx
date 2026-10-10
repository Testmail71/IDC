import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StudentsTable, type AdminStudentRow } from "@/components/admin/students-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseStatus, PaymentStatus, RegistrationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, financeRes, enrollRes, teachersRes, assignRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number, email, phone, status, teacher_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("v_student_finance")
      .select("student_id, payment_status, outstanding_due, currency"),
    supabase
      .from("course_enrollments")
      .select("student_id, course:courses(total_classes), progress:course_progress(classes_completed, status)"),
    supabase.from("teachers").select("id, full_name"),
    supabase
      .from("teacher_assignments")
      .select("student_id, teacher_id")
      .eq("is_active", true),
  ]);

  const teacherName = new Map((teachersRes.data ?? []).map((t) => [t.id, t.full_name]));
  const assignedTeacher = new Map((assignRes.data ?? []).map((a) => [a.student_id, a.teacher_id]));

  const rows: AdminStudentRow[] = (studentsRes.data ?? []).map((s) => {
    const finance = (financeRes.data ?? []).find((f) => f.student_id === s.id);
    const enrollment = (enrollRes.data ?? []).find((e) => e.student_id === s.id) as
      | {
          course: { total_classes: number } | null;
          progress: { classes_completed: number; status: CourseStatus } | { classes_completed: number; status: CourseStatus }[] | null;
        }
      | undefined;
    const progress = Array.isArray(enrollment?.progress) ? enrollment?.progress[0] : enrollment?.progress;
    const activeTeacherId = assignedTeacher.get(s.id) ?? s.teacher_id;
    return {
      id: s.id,
      full_name: s.full_name,
      registration_number: s.registration_number,
      email: s.email,
      phone: s.phone,
      status: s.status as RegistrationStatus,
      teacherName: activeTeacherId ? teacherName.get(activeTeacherId) ?? null : null,
      paymentStatus: (finance?.payment_status as PaymentStatus) ?? null,
      outstanding: Number(finance?.outstanding_due ?? 0),
      currency: finance?.currency ?? "INR",
      classesCompleted: progress?.classes_completed ?? 0,
      totalClasses: enrollment?.course?.total_classes ?? 12,
    };
  });

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${rows.length} registered student${rows.length === 1 ? "" : "s"}. Manage profiles, progress, fees and more.`}
      />
      <Card>
        <CardContent className="p-5">
          <StudentsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}