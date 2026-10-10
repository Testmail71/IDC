import { Badge, type Tone } from "@/components/ui/badge";
import type {
  CertificateStatus,
  CourseStatus,
  ExamStatus,
  PaymentStatus,
  PaymentStatusTxn,
  RegistrationStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const REGISTRATION_TONES: Record<RegistrationStatus, Tone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  suspended: "stone",
};
const REGISTRATION_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <Badge tone={REGISTRATION_TONES[status]}>{REGISTRATION_LABELS[status]}</Badge>
  );
}

const COURSE_TONES: Record<CourseStatus, Tone> = {
  not_started: "stone",
  in_progress: "saffron",
  completed: "green",
};
const COURSE_LABELS: Record<CourseStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <Badge tone={COURSE_TONES[status]}>{COURSE_LABELS[status]}</Badge>
  );
}

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  unpaid: "red",
  partially_paid: "amber",
  paid: "green",
  overpaid: "blue",
  waived: "gold",
  refunded: "stone",
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge tone={PAYMENT_TONES[status]} className={className}>
      {status === "partially_paid" ? "Partially Paid" : status === "unpaid" ? "Unpaid" : status === "paid" ? "Paid" : status === "overpaid" ? "Overpaid / Credit" : status === "waived" ? "Waived" : "Refunded"}
    </Badge>
  );
}

const TXN_TONES: Record<PaymentStatusTxn, Tone> = {
  pending: "amber",
  verified: "green",
  rejected: "red",
  reverted: "stone",
};

export function TxnStatusBadge({ status }: { status: PaymentStatusTxn }) {
  return (
    <Badge tone={TXN_TONES[status]}>
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}

const EXAM_TONES: Record<ExamStatus, Tone> = {
  submitted: "blue",
  under_evaluation: "amber",
  qualified: "green",
  not_qualified: "red",
  resubmission_requested: "maroon",
};
const EXAM_LABELS: Record<ExamStatus, string> = {
  submitted: "Submitted",
  under_evaluation: "Under Evaluation",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  resubmission_requested: "Resubmission Requested",
};

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  return <Badge tone={EXAM_TONES[status]}>{EXAM_LABELS[status]}</Badge>;
}

const CERT_TONES: Record<CertificateStatus, Tone> = {
  draft: "stone",
  published: "green",
  revoked: "red",
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return <Badge tone={CERT_TONES[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

/** Small colored dot used in lists. */
export function StatusDot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        tone === "green" && "bg-emerald-500",
        tone === "red" && "bg-red-500",
        tone === "amber" && "bg-amber-500",
        tone === "saffron" && "bg-saffron-500",
        tone === "gold" && "bg-gold-500",
        tone === "blue" && "bg-sky-500",
        tone === "stone" && "bg-stone-300",
        tone === "maroon" && "bg-maroon-700",
      )}
    />
  );
}