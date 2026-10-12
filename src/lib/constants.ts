import type { UserRole } from "@/lib/types";

export const APP_NAME = "ISKCON Disciples Course";
export const APP_SUBTITLE =
  "Student Registration, Examination, Payment & Certificate Portal";
export const COURSE_CODE = "IDC";

/** Storage buckets. All are private unless noted. */
export const BUCKETS = {
  photos: "student-photos",
  examSheets: "exam-sheets",
  certificates: "certificates",
  paymentProofs: "payment-proofs",
  publicAssets: "public-assets",
  materials: "course-materials",
} as const;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const ALLOWED_EXAM_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
export const ALLOWED_CERT_TYPES = ["application/pdf"];
export const ALLOWED_MATERIAL_TYPES = ["application/pdf"];

export const DEFAULT_FILE_LIMIT_MB = 5;
export const DEFAULT_EXAM_LIMIT_MB = 10;
export const DEFAULT_MATERIAL_LIMIT_MB = 20;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const GENDERS = ["Male", "Female", "Other"];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

/** Default portal settings, keyed for the portal_settings table. */
export const DEFAULT_SETTINGS = {
  temple_name: "ISKCON Durgapur",
  idc_center_name: "ISKCON Disciples Course Department",
  logo_path: "",
  contact_email: "info.iskcondurgapur@gmail.com",
  contact_phone: "Not Required",
  contact_address: "ISKCON Durgapur",
  public_disclose_student_name: true,
  require_payment_before_certificate: true,
  allow_exam_without_completion: false,
  student_photo_limit_mb: DEFAULT_FILE_LIMIT_MB,
  exam_sheet_limit_mb: DEFAULT_EXAM_LIMIT_MB,
  certificate_limit_mb: DEFAULT_FILE_LIMIT_MB,
  registration_open: true,
  homepage_intro:
    "The ISKCON Disciples Course (IDC) is a structured study programme for devotees who wish to deepen their understanding of the guru-disciple relationship and the principles of initiation within ISKCON.",
  disclaimer:
    "This portal is operated locally by the temple IDC administration. Information published here is provided by the administrator and does not imply accreditation beyond that supplied by the temple.",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export interface NavItem {
  href: string;
  label: string;
}

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/profile", label: "My Profile" },
  { href: "/student/materials", label: "Course Material" },
  { href: "/student/progress", label: "Course Progress" },
  { href: "/student/exam", label: "Examination" },
  { href: "/student/payments", label: "My Payments" },
  { href: "/student/certificate", label: "My Certificate" },
  { href: "/student/notifications", label: "Notifications" },
  { href: "/student/change-password", label: "Change Password" },
];

export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/students", label: "My Students" },
  { href: "/teacher/notifications", label: "Notifications" },
  { href: "/teacher/change-password", label: "Change Password" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/progress", label: "Course Progress" },
  { href: "/admin/fees", label: "Fee Settings" },
  { href: "/admin/payments", label: "Record Payment" },
  { href: "/admin/dues", label: "Payment Due Management" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/materials", label: "Course Material" },
  { href: "/admin/exams", label: "Examinations" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/reports", label: "Financial Reports" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/audit", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/change-password", label: "Change Password" },
];

export function dashboardPathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "admin":
    case "super_admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}
