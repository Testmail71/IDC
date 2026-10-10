-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0001: schema & tables
-- Run in order. idempotent-friendly (IF NOT EXISTS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student'
    check (role in ('student', 'teacher', 'admin', 'super_admin')),
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------------
create table if not exists public.teachers (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  is_active boolean not null default true,
  can_view_finance boolean not null default false,
  can_publish_results boolean not null default false,
  can_issue_certificates boolean not null default false,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key references public.profiles (id) on delete cascade,
  registration_number text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  gender text check (gender in ('Male', 'Female', 'Other')),
  address text,
  city text,
  district text,
  state text,
  pincode text,
  teacher_id uuid references public.teachers (id) on delete set null,
  photo_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  enrollment_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists students_registration_number_uidx
  on public.students (registration_number);
create index if not exists students_email_idx on public.students (email);
create index if not exists students_phone_idx on public.students (phone);
create index if not exists students_status_idx on public.students (status);
create index if not exists students_teacher_idx on public.students (teacher_id);

-- ---------------------------------------------------------------------------
-- teacher_assignments: history of assignments
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Only one active assignment per student at a time.
create unique index if not exists teacher_assignments_one_active_uidx
  on public.teacher_assignments (student_id) where (is_active);
create index if not exists teacher_assignments_teacher_idx
  on public.teacher_assignments (teacher_id);

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  total_classes integer not null default 12 check (total_classes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- course_enrollments
-- ---------------------------------------------------------------------------
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  enrolled_at date not null default current_date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists course_enrollments_course_idx on public.course_enrollments (course_id);

-- ---------------------------------------------------------------------------
-- course_progress
-- ---------------------------------------------------------------------------
create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.course_enrollments (id) on delete cascade,
  classes_completed integer not null default 0 check (classes_completed >= 0),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completion_date date,
  admin_remarks text,
  exam_exception_allowed boolean not null default false,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- course_fee_settings: global fee configuration (single active row)
-- ---------------------------------------------------------------------------
create table if not exists public.course_fee_settings (
  id uuid primary key default gen_random_uuid(),
  standard_fee numeric(12, 2) not null default 1500 check (standard_fee >= 0),
  currency text not null default 'INR',
  registration_fee numeric(12, 2) not null default 0 check (registration_fee >= 0),
  additional_charges numeric(12, 2) not null default 0 check (additional_charges >= 0),
  discount_rules text,
  late_fee numeric(12, 2) not null default 0 check (late_fee >= 0),
  late_fee_enabled boolean not null default false,
  payment_instructions text,
  due_date date,
  refund_policy text,
  require_payment_before_certificate boolean not null default true,
  effective_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_fee_settings_active_idx
  on public.course_fee_settings (is_active) where (is_active);

-- ---------------------------------------------------------------------------
-- student_fee_assessments: fee snapshot per student (applied at enrollment)
-- ---------------------------------------------------------------------------
create table if not exists public.student_fee_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  course_fee numeric(12, 2) not null default 0 check (course_fee >= 0),
  registration_fee numeric(12, 2) not null default 0 check (registration_fee >= 0),
  additional_charges numeric(12, 2) not null default 0 check (additional_charges >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  late_fee numeric(12, 2) not null default 0 check (late_fee >= 0),
  fee_waived boolean not null default false,
  currency text not null default 'INR',
  due_date date,
  assessment_date date not null default current_date,
  set_by uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- payment_transactions: one row per payment
-- ---------------------------------------------------------------------------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  method text not null
    check (method in ('cash', 'upi', 'bank_transfer', 'cheque', 'other', 'online')),
  reference text,
  receipt_number text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'reverted')),
  received_by uuid references public.profiles (id),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  remarks text,
  proof_path text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists payment_transactions_student_idx
  on public.payment_transactions (student_id);
create index if not exists payment_transactions_date_idx
  on public.payment_transactions (payment_date);
create index if not exists payment_transactions_status_idx
  on public.payment_transactions (status);
create index if not exists payment_transactions_method_idx
  on public.payment_transactions (method);

-- ---------------------------------------------------------------------------
-- payment_adjustments: approved fee changes / discounts / waivers (audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  adjustment_type text not null
    check (adjustment_type in
      ('discount_fixed', 'discount_percent', 'waiver', 'additional_charge', 'correction')),
  previous_payable numeric(12, 2) not null,
  new_payable numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  reason text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists payment_adjustments_student_idx on public.payment_adjustments (student_id);

-- ---------------------------------------------------------------------------
-- payment_refunds: refunds linked to original payments. Original payments are
-- never deleted or modified - refunds are recorded separately.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_transactions (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  refund_date date not null,
  method text not null,
  reference text,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists payment_refunds_payment_idx on public.payment_refunds (payment_id);
create index if not exists payment_refunds_student_idx on public.payment_refunds (student_id);

-- ---------------------------------------------------------------------------
-- payment_receipts: unique receipt identifiers and issue information
-- ---------------------------------------------------------------------------
create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payment_transactions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  receipt_number text not null unique,
  amount numeric(12, 2) not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id),
  status text not null default 'verified',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- examination_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.examination_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  examination_date date not null,
  file_path text not null,
  file_name text,
  remarks text,
  status text not null default 'submitted'
    check (status in
      ('submitted', 'under_evaluation', 'qualified', 'not_qualified', 'resubmission_requested')),
  submitted_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists examination_submissions_student_idx
  on public.examination_submissions (student_id);
create index if not exists examination_submissions_active_idx
  on public.examination_submissions (is_active) where (is_active);

-- ---------------------------------------------------------------------------
-- examination_evaluations
-- ---------------------------------------------------------------------------
create table if not exists public.examination_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.examination_submissions (id) on delete cascade,
  evaluator_id uuid references public.profiles (id),
  result text check (result in ('qualified', 'not_qualified')),
  internal_remarks text,
  student_feedback text,
  evaluated_at timestamptz,
  published boolean not null default false,
  published_at timestamptz,
  published_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- certificates: one active certificate per student
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  certificate_number text not null,
  file_path text not null,
  issue_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'revoked')),
  version integer not null default 1,
  uploaded_by uuid references public.profiles (id),
  published_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists certificates_number_uidx
  on public.certificates (certificate_number);
create unique index if not exists certificates_student_active_uidx
  on public.certificates (student_id) where (is_active);
create index if not exists certificates_status_idx on public.certificates (status);

-- Upload / publish / revoke history for certificates.
create table if not exists public.certificate_history (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  file_path text,
  version integer not null,
  action text not null,
  performed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists certificate_history_cert_idx on public.certificate_history (certificate_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- portal_settings: key/value configuration (select is public; update is admin)
-- ---------------------------------------------------------------------------
create table if not exists public.portal_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------------
-- id_sequences: concurrency-safe sequential number generation
-- ---------------------------------------------------------------------------
create table if not exists public.id_sequences (
  seq_type text not null,
  seq_year integer not null,
  last_value bigint not null default 0,
  primary key (seq_type, seq_year)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists teachers_updated_at on public.teachers;
create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists course_enrollments_updated_at on public.course_enrollments;
create trigger course_enrollments_updated_at before update on public.course_enrollments
  for each row execute function public.set_updated_at();

drop trigger if exists course_progress_updated_at on public.course_progress;
create trigger course_progress_updated_at before update on public.course_progress
  for each row execute function public.set_updated_at();

drop trigger if exists course_fee_settings_updated_at on public.course_fee_settings;
create trigger course_fee_settings_updated_at before update on public.course_fee_settings
  for each row execute function public.set_updated_at();

drop trigger if exists student_fee_assessments_updated_at on public.student_fee_assessments;
create trigger student_fee_assessments_updated_at before update on public.student_fee_assessments
  for each row execute function public.set_updated_at();

drop trigger if exists examination_submissions_updated_at on public.examination_submissions;
create trigger examination_submissions_updated_at before update on public.examination_submissions
  for each row execute function public.set_updated_at();

drop trigger if exists examination_evaluations_updated_at on public.examination_evaluations;
create trigger examination_evaluations_updated_at before update on public.examination_evaluations
  for each row execute function public.set_updated_at();

drop trigger if exists certificates_updated_at on public.certificates;
create trigger certificates_updated_at before update on public.certificates
  for each row execute function public.set_updated_at();