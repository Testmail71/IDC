import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AdminProgressTable, type AdminProgressRow } from "@/components/admin/progress-table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminProgressPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [studentsRes, enrollRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, registration_number")
      .eq("status", "approved")
      .order("full_name"),
    supabase
      .from("course_enrollments")
      .select("id, student_id, course:courses(total_classes), progress:course_progress(*)"),
  ]);

  const enrollmentByStudent = new Map(
    (enrollRes.data ?? []).map((e) => [e.student_id, e]),
  );

  const rows: AdminProgressRow[] = (studentsRes.data ?? []).map((s) => {
    const enrollment = enrollmentByStudent.get(s.id) as
      | {
          id: string;
          course: { total_classes: number } | null;
          progress:
            | {
                classes_completed: number;
                status: CourseStatus;
                completion_date: string | null;
                admin_remarks: string | null;
                exam_exception_allowed: boolean;
              }
            | Array<{
                classes_completed: number;
                status: CourseStatus;
                completion_date: string | null;
                admin_remarks: string | null;
                exam_exception_allowed: boolean;
              }>
            | null;
        }
      | undefined;
    const progress = Array.isArray(enrollment?.progress) ? enrollment?.progress[0] : enrollment?.progress;
    return {
      studentId: s.id,
      fullName: s.full_name,
      registrationNumber: s.registration_number,
      enrollmentId: enrollment?.id ?? null,
      classesCompleted: progress?.classes_completed ?? 0,
      totalClasses: enrollment?.course?.total_classes ?? 12,
      status: progress?.status ?? "not_started",
      completionDate: progress?.completion_date ?? null,
      adminRemarks: progress?.admin_remarks ?? null,
      examExceptionAllowed: progress?.exam_exception_allowed ?? false,
    };
  });

  return (
    <div>
      <PageHeader
        title="Course Progress"
        description="Track and update class-completion progress and grant examination exceptions."
      />
      <Card>
        <CardContent className="p-5">
          <AdminProgressTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}