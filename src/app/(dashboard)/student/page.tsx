import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  FileText,
  Info,
  UserRound,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress";
import {
  CourseStatusBadge,
  ExamStatusBadge,
  PaymentStatusBadge,
  RegistrationStatusBadge,
} from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat";
import { requireStudent } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentByUser,
  getStudentFinance,
  getStudentProgress,
  getTeacherName,
} from "@/lib/queries";
import { EXAM_STATUS_LABELS, type ExamStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await requireStudent();
  const supabase = await createClient();
  const student = await getStudentByUser(supabase, session.user.id);

  if (!student) {
    return (
      <Alert variant="warning" title="Student profile not found">
        Your account is not linked to a student record. Please contact the IDC
        administrator.
      </Alert>
    );
  }

  const [finance, progress, teacherName, examRes] = await Promise.all([
    getStudentFinance(supabase, student.id),
    getStudentProgress(supabase, student.id),
    getTeacherName(supabase, student.teacher_id),
    supabase
      .from("examination_submissions")
      .select("status, submitted_at, is_active")
      .eq("student_id", student.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const totalClasses = progress?.course?.total_classes ?? 12;
  const classesCompleted = progress?.progress?.classes_completed ?? 0;
  const examStatus = (examRes.data?.status as ExamStatus | undefined) ?? null;

  if (student.status !== "approved") {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${student.full_name.split(" ")[0]}`}
          description="Your registration details and approval status."
        />
        <Alert
          variant={
            student.status === "rejected"
              ? "error"
              : student.status === "suspended"
                ? "warning"
                : "info"
          }
          title={
            student.status === "rejected"
              ? "Registration not approved"
              : student.status === "suspended"
                ? "Account suspended"
                : "Registration pending approval"
          }
        >
          {student.status === "pending" &&
            "Your registration has been received and is awaiting review by the IDC administrator. You will be able to access course features once approved."}
          {student.status === "rejected" &&
            "Your registration was not approved. Please contact the IDC department for more information."}
          {student.status === "suspended" &&
            "Your account is currently suspended. Please contact the IDC department."}
        </Alert>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Registration number</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-wide text-maroon-900">
                {student.registration_number}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Applied on {formatDate(student.created_at)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RegistrationStatusBadge status={student.status} />
              <p className="text-sm text-stone-500">
                Preferred teacher: {teacherName ?? "Not assigned yet"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const nextSteps: { label: string; href: string; done: boolean }[] = [
    {
      label: "Complete your profile",
      href: "/student/profile",
      done: Boolean(student.address && student.city && student.pincode),
    },
    {
      label: `Attend all ${totalClasses} classes`,
      href: "/student/progress",
      done: classesCompleted >= totalClasses,
    },
    {
      label: "Clear the course fee",
      href: "/student/payments",
      done: finance?.payment_status === "paid" || finance?.payment_status === "waived",
    },
    {
      label: "Submit the examination",
      href: "/student/exam",
      done: Boolean(examStatus),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${student.full_name.split(" ")[0]}`}
        description={`Registration ${student.registration_number} · Enrolled ${formatDate(student.enrollment_date)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Course progress"
          value={`${classesCompleted}/${totalClasses}`}
          icon={<BookOpen className="h-5 w-5" />}
          sub={progress?.progress ? undefined : "Enrollment pending"}
        />
        <StatCard
          label="Payment status"
          value={finance ? <PaymentStatusBadge status={finance.payment_status} /> : "—"}
          icon={<CreditCard className="h-5 w-5" />}
          tone="gold"
          sub={finance ? `Paid ${formatCurrency(finance.net_paid, finance.currency)}` : undefined}
        />
        <StatCard
          label="Outstanding due"
          value={finance ? formatCurrency(finance.outstanding_due, finance.currency) : "—"}
          icon={<CreditCard className="h-5 w-5" />}
          tone={finance && finance.outstanding_due > 0 ? "red" : "green"}
        />
        <StatCard
          label="Examination"
          value={examStatus ? <ExamStatusBadge status={examStatus} /> : "Not submitted"}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="maroon"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Course progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">{progress?.course?.name ?? "ISKCON Disciples Course"}</span>
              {progress?.progress && <CourseStatusBadge status={progress.progress.status} />}
            </div>
            <div className="mt-3">
              <ProgressBar value={classesCompleted} max={totalClasses} />
            </div>
            <p className="mt-2 text-sm text-stone-500">
              {classesCompleted} of {totalClasses} classes completed
            </p>
            {progress?.progress?.completion_date && (
              <p className="mt-1 text-sm text-emerald-700">
                Completed on {formatDate(progress.progress.completion_date)}
              </p>
            )}
            <div className="mt-4">
              <Link
                href="/student/progress"
                className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
              >
                View details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 text-sm text-stone-700 hover:text-maroon-800"
                  >
                    <span
                      className={
                        step.done
                          ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                          : "inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-stone-400"
                      }
                    >
                      {step.done ? "✓" : "•"}
                    </span>
                    <span className={step.done ? "line-through opacity-60" : ""}>
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/student/profile" icon={<UserRound className="h-5 w-5" />} title="My Profile" text="View and update your contact and address details." />
        <QuickLink href="/student/materials" icon={<FileText className="h-5 w-5" />} title="Course Material" text="Download study material once your fee is settled." />
        <QuickLink href="/student/exam" icon={<ClipboardCheck className="h-5 w-5" />} title="Examination" text="Submit your sheet and check your result." />
        <QuickLink href="/student/payments" icon={<CreditCard className="h-5 w-5" />} title="My Payments" text="See your payments, dues and receipts." />
        <QuickLink href="/student/certificate" icon={<FileBadge className="h-5 w-5" />} title="My Certificate" text="Download your certificate once qualified." />
      </div>

      <div className="mt-6">
        <Alert variant="info">
          <span className="inline-flex items-center gap-2">
            <Info className="h-4 w-4" /> Your assigned teacher:{" "}
            <strong>{teacherName ?? "To be assigned"}</strong>.
            {examStatus && (
              <>
                {" "}Examination status: <strong>{EXAM_STATUS_LABELS[examStatus]}</strong>.
              </>
            )}
          </span>
        </Alert>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-50 text-saffron-600">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 text-sm text-stone-500">{text}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-saffron-700 opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}