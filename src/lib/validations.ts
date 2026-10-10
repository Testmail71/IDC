import { z } from "zod";

import { GENDERS, PAYMENT_METHODS } from "@/lib/constants";

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .regex(/^\+?\d{10,15}$/, "Enter a valid phone number (10-15 digits)");

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "PIN code must be 6 digits");

export const registrationSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Full name must be at least 3 characters")
      .max(120, "Full name is too long"),
    email: z
      .email("Enter a valid email address")
      .transform((value) => value.trim().toLowerCase()),
    phone: phoneSchema,
    whatsapp: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (value) => !value || /^\+?\d{10,15}$/.test(value),
        "Enter a valid WhatsApp number",
      ),
    gender: z.enum(GENDERS, { message: "Select a gender" }),
    address: z.string().trim().min(5, "Enter your full address"),
    city: z.string().trim().min(2, "Enter the city"),
    district: z.string().trim().min(2, "Enter the district"),
    state: z.string().trim().min(2, "Select the state"),
    pincode: pincodeSchema,
    teacher_id: z.string().uuid("Select a teacher").optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100),
    confirm_password: z.string().min(1, "Confirm your password"),
    consent: z.literal(true, {
      message: "You must accept the privacy notice and terms to register",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  email: z
    .email("Enter a valid email address")
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .email("Enter a valid email address")
    .transform((value) => value.trim().toLowerCase()),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const paymentSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  amount: z.coerce
    .number("Enter the amount received")
    .positive("Amount must be greater than zero")
    .max(10_000_000, "Amount is too large"),
  payment_date: z.string().min(1, "Select the payment date"),
  method: z.enum(PAYMENT_METHODS.map((m) => m.value), {
    message: "Select a payment method",
  }),
  reference: z.string().trim().optional().or(z.literal("")),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
  idempotency_key: z.string().min(1),
});

export const refundSchema = z.object({
  payment_id: z.string().uuid("Select the original payment"),
  amount: z.coerce
    .number("Enter the refund amount")
    .positive("Refund must be greater than zero"),
  refund_date: z.string().min(1, "Select the refund date"),
  method: z.string().min(1, "Select the refund method"),
  reference: z.string().trim().optional().or(z.literal("")),
  reason: z.string().trim().min(5, "Provide a reason for the refund"),
});

export const adjustmentSchema = z.object({
  adjustment_type: z.enum(
    ["discount_fixed", "discount_percent", "waiver", "additional_charge", "correction"],
    { message: "Select an adjustment type" },
  ),
  amount: z.coerce
    .number("Enter an amount")
    .nonnegative("Amount cannot be negative"),
  reason: z.string().trim().min(3, "Provide a reason"),
});

export const adjustAssessmentSchema = z.object({
  studentId: z.string().uuid(),
  courseFee: z.coerce.number().nonnegative().max(10_000_000),
  registrationFee: z.coerce.number().nonnegative().max(10_000_000),
  additionalCharges: z.coerce.number().nonnegative().max(10_000_000),
  discountAmount: z.coerce.number().nonnegative().max(10_000_000),
  lateFee: z.coerce.number().nonnegative().max(10_000_000),
  feeWaived: z.boolean(),
  dueDate: z.string().optional().or(z.literal("")),
  reason: z.string().trim().min(3, "Provide a reason for the change"),
});

export const progressSchema = z.object({
  classes_completed: z.coerce
    .number("Enter classes completed")
    .nonnegative("Cannot be negative"),
  status: z.enum(["not_started", "in_progress", "completed"], {
    message: "Select a status",
  }),
  completion_date: z.string().optional().or(z.literal("")),
  admin_remarks: z.string().trim().max(1000).optional().or(z.literal("")),
  exam_exception_allowed: z.boolean().optional(),
});

export const evaluationSchema = z.object({
  result: z.enum(["qualified", "not_qualified"], {
    message: "Select a result",
  }),
  internal_remarks: z.string().trim().max(2000).optional().or(z.literal("")),
  student_feedback: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const certificateSchema = z.object({
  certificate_number: z
    .string()
    .trim()
    .min(3, "Enter a certificate number")
    .max(60),
  issue_date: z.string().min(1, "Select the issue date"),
});

export const materialSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(150, "Title is too long"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  is_published: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export const admissionDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"], { message: "Select a decision" }),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const teacherSchema = z.object({
  full_name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z
    .email("Enter a valid email")
    .transform((value) => value.trim().toLowerCase()),
  phone: z.string().trim().optional().or(z.literal("")),
  can_view_finance: z.boolean().optional(),
  can_publish_results: z.boolean().optional(),
  can_issue_certificates: z.boolean().optional(),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

export const feeSettingsSchema = z.object({
  standard_fee: z.coerce.number().nonnegative("Fee cannot be negative"),
  currency: z.string().min(2).max(5).default("INR"),
  registration_fee: z.coerce.number().nonnegative().default(0),
  additional_charges: z.coerce.number().nonnegative().default(0),
  late_fee: z.coerce.number().nonnegative().default(0),
  late_fee_enabled: z.boolean().optional(),
  require_payment_before_certificate: z.boolean().optional(),
  payment_instructions: z.string().trim().optional().or(z.literal("")),
  discount_rules: z.string().trim().optional().or(z.literal("")),
  refund_policy: z.string().trim().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  effective_date: z.string().min(1, "Select the effective date"),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(3, "Full name must be at least 3 characters"),
  phone: phoneSchema,
  whatsapp: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().min(5, "Enter your full address"),
  city: z.string().trim().min(2, "Enter the city"),
  district: z.string().trim().min(2, "Enter the district"),
  state: z.string().trim().min(2, "Select the state"),
  pincode: pincodeSchema,
});

export const examSubmissionSchema = z.object({
  examination_date: z.string().min(1, "Select the examination date"),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const settingsSchema = z.record(z.string(), z.unknown());