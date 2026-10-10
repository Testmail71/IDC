import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat";
import {
  CourseStatusBadge,
  PaymentStatusBadge,
  RegistrationStatusBadge,
} from "@/components/ui/status-badge";
import { ProgressForm } from "@/components/teacher/progress-form";
import { requireTeacher } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStudentFinance } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { CourseStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireTeacher();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("can_view_finance")
    .eq("id", session.user.id)
    .maybeSingle();

  // RLS limits this to students assigned to the signed-in teacher.
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!student) notFound();

  const [enrollmentRes, finance, photoUrl] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("id, course:courses(total_classes, name), progress:course_progress(*)")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    teacher?.can_view_finance ? getStudentFinance(supabase, id) : Promise.resolve(null),
    getSignedUrl(supabase, BUCKETS.photos, student.photo_path, 3600),
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
  const total = enrollment?.course?.total_classes ?? 12;

  return (
    <div>
      <Link
        href="/teacher/students"
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
              <CardTitle>Course progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <ProgressBar value={progress?.classes_completed ?? 0} max={total} className="flex-1" />
                <span className="ml-4 text-sm font-medium text-stone-600">
                  {progress?.classes_completed ?? 0}/{total}
                </span>
              </div>
              {progress?.status && (
                <div className="mb-4">
                  <CourseStatusBadge status={progress.status} />
                </div>
              )}
              {enrollment ? (
                <ProgressForm
                  enrollmentId={enrollment.id}
                  totalClasses={total}
                  classesCompleted={progress?.classes_completed ?? 0}
                  status={progress?.status ?? "not_started"}
                  completionDate={progress?.completion_date ?? null}
                  adminRemarks={progress?.admin_remarks ?? null}
                  examExceptionAllowed={progress?.exam_exception_allowed ?? false}
                  isAdmin={false}
                />
              ) : (
                <p className="text-sm text-stone-500">
                  This student is not yet enrolled in a course.
                </p>
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
              <InfoRow icon={<Mail className="h-4 w-4" />} value={student.email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} value={student.phone} />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                value={[student.city, student.district, student.state, student.pincode].filter(Boolean).join(", ")}
              />
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                value={`Enrolled ${formatDate(student.enrollment_date)}`}
              />
            </CardContent>
          </Card>

          {teacher?.can_view_finance && finance && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatCard
                  label="Outstanding"
                  value={formatCurrency(finance.outstanding_due, finance.currency)}
                  tone={finance.outstanding_due > 0 ? "red" : "green"}
                />
                <PaymentStatusBadge status={finance.payment_status as PaymentStatus} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 text-stone-600">
      <span className="text-stone-400">{icon}</span>
      <span className="min-w-0 break-words">{value || "—"}</span>
    </div>
  );
}