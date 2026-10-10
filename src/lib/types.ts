/** Domain types mirroring the Supabase PostgreSQL schema. */

export type UserRole = "student" | "teacher" | "admin" | "super_admin";
export type AdminRole = Extract<UserRole, "admin" | "super_admin">;

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type CourseStatus = "not_started" | "in_progress" | "completed";

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "waived"
  | "refunded";

export type PaymentMethod =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "other"
  | "online";

export type PaymentStatusTxn = "pending" | "verified" | "rejected" | "reverted";

export type ExamStatus =
  | "submitted"
  | "under_evaluation"
  | "qualified"
  | "not_qualified"
  | "resubmission_requested";

export type CertificateStatus = "draft" | "published" | "revoked";

export type AdjustmentType =
  | "discount_fixed"
  | "discount_percent"
  | "waiver"
  | "additional_charge"
  | "correction";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  registration_number: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  teacher_id: string | null;
  photo_path: string | null;
  status: RegistrationStatus;
  enrollment_date: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  can_view_finance: boolean;
  can_publish_results: boolean;
  can_issue_certificates: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignment {
  id: string;
  student_id: string;
  teacher_id: string;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  total_classes: number;
  is_active: boolean;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  status: CourseStatus;
  completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseProgress {
  id: string;
  enrollment_id: string;
  classes_completed: number;
  status: CourseStatus;
  completion_date: string | null;
  admin_remarks: string | null;
  exam_exception_allowed: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseFeeSettings {
  id: string;
  standard_fee: number;
  currency: string;
  registration_fee: number;
  additional_charges: number;
  discount_rules: string | null;
  late_fee: number;
  late_fee_enabled: boolean;
  payment_instructions: string | null;
  due_date: string | null;
  refund_policy: string | null;
  require_payment_before_certificate: boolean;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFeeAssessment {
  id: string;
  student_id: string;
  course_fee: number;
  registration_fee: number;
  additional_charges: number;
  discount_amount: number;
  late_fee: number;
  fee_waived: boolean;
  currency: string;
  due_date: string | null;
  assessment_date: string;
  set_by: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string | null;
  receipt_number: string;
  status: PaymentStatusTxn;
  received_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  remarks: string | null;
  proof_path: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface PaymentAdjustment {
  id: string;
  student_id: string;
  adjustment_type: AdjustmentType;
  previous_payable: number;
  new_payable: number;
  amount: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  student_id: string;
  amount: number;
  refund_date: string;
  method: string;
  reference: string | null;
  reason: string;
  status: "pending" | "confirmed" | "cancelled";
  recorded_by: string;
  created_at: string;
}

export interface PaymentReceipt {
  id: string;
  payment_id: string;
  student_id: string;
  receipt_number: string;
  amount: number;
  issued_at: string;
  issued_by: string;
  status: string;
}

export interface ExaminationSubmission {
  id: string;
  student_id: string;
  examination_date: string;
  file_path: string;
  file_name: string | null;
  remarks: string | null;
  status: ExamStatus;
  submitted_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExaminationEvaluation {
  id: string;
  submission_id: string;
  evaluator_id: string | null;
  result: "qualified" | "not_qualified" | null;
  internal_remarks: string | null;
  student_feedback: string | null;
  evaluated_at: string | null;
  published: boolean;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  certificate_number: string;
  file_path: string;
  issue_date: string;
  status: CertificateStatus;
  version: number;
  uploaded_by: string | null;
  published_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_published: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PortalSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

/** Aggregated, database-computed financial summary for a student. */
export interface StudentFinance {
  student_id: string;
  course_fee: number;
  registration_fee: number;
  additional_charges: number;
  discount_amount: number;
  late_fee: number;
  fee_waived: boolean;
  currency: string;
  total_payable: number;
  verified_paid: number;
  confirmed_refunds: number;
  net_paid: number;
  outstanding_due: number;
  payment_status: PaymentStatus;
  due_date: string | null;
  last_payment_date: string | null;
}

export interface AdminDashboardStats {
  total_assessed: number;
  total_received: number;
  total_outstanding: number;
  total_discounts: number;
  total_refunds: number;
  count_paid: number;
  count_partially_paid: number;
  count_unpaid: number;
  count_waived: number;
  count_students: number;
  count_pending_registrations: number;
  count_exams_pending: number;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overpaid: "Overpaid / Credit",
  waived: "Waived",
  refunded: "Refunded",
};

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  submitted: "Submitted — Awaiting Evaluation",
  under_evaluation: "Under Evaluation",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  resubmission_requested: "Resubmission Requested",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
  online: "Online Gateway",
};
