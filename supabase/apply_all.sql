-- ==================================================================
-- IDC Portal - ALL migrations (run once in the Supabase SQL Editor)
-- Generated from supabase/migrations/*.sql in order.
-- ==================================================================

-- ==================================================================
-- FILE: 00001_schema_tables.sql
-- ==================================================================

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

-- ==================================================================
-- FILE: 00002_functions_views.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0002: functions, triggers, views
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role / permission helper functions (used inside RLS policies & triggers)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin') and is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher' and is_active
  );
$$;

-- Is the signed-in user an active teacher currently assigned to v_student_id?
create or replace function public.teacher_has_student(v_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_assignments
    where teacher_id = auth.uid() and student_id = v_student_id and is_active
  );
$$;

-- Is the signed-in user a finance-authorized teacher for v_student_id?
create or replace function public.teacher_can_view_finance(v_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teachers t
    join public.teacher_assignments ta on ta.teacher_id = t.id
    where t.id = auth.uid() and t.is_active and t.can_view_finance
      and ta.student_id = v_student_id and ta.is_active
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.teacher_has_student(uuid) to authenticated;
grant execute on function public.teacher_can_view_finance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Block role/is_active changes by non-admins at the database level
-- ---------------------------------------------------------------------------
create or replace function public.prevent_unauthorized_profile_changes()
returns trigger language plpgsql as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only administrators can change user roles';
  end if;
  if old.is_active is distinct from new.is_active and not public.is_admin() then
    raise exception 'Only administrators can activate or suspend accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.prevent_unauthorized_profile_changes();

-- ---------------------------------------------------------------------------
-- Sequential number generation (concurrency-safe via row lock)
--   IDC-2026-0001   (registration)
--   IDC-R-2026-0001 (receipt)
--   IDC-C-2026-0001 (certificate)
-- ---------------------------------------------------------------------------
create or replace function public.next_number(
  p_seq_type text, p_year integer, p_sep text default '-'
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_next bigint;
begin
  insert into public.id_sequences (seq_type, seq_year, last_value)
  values (p_seq_type, p_year, 0)
  on conflict (seq_type, seq_year) do nothing;

  update public.id_sequences
     set last_value = last_value + 1
   where seq_type = p_seq_type and seq_year = p_year
   returning last_value into v_next;

  return p_seq_type || p_sep || p_year || p_sep || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function public.next_registration_number(p_year integer default null)
returns text language sql security definer set search_path = public as $$
  select public.next_number('IDC', coalesce(p_year, extract(year from now())::integer));
$$;

create or replace function public.next_receipt_number(p_year integer default null)
returns text language sql security definer set search_path = public as $$
  select 'IDC-' || public.next_number('R', coalesce(p_year, extract(year from now())::integer));
$$;

create or replace function public.next_certificate_number(p_year integer default null)
returns text language sql security definer set search_path = public as $$
  select 'IDC-' || public.next_number('C', coalesce(p_year, extract(year from now())::integer));
$$;

grant execute on function public.next_number(text, integer, text) to authenticated;
grant execute on function public.next_registration_number(integer) to authenticated;
grant execute on function public.next_receipt_number(integer) to authenticated;
grant execute on function public.next_certificate_number(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Ensure a course_progress row exists whenever an enrollment is created
-- ---------------------------------------------------------------------------
create or replace function public.ensure_course_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.course_progress (enrollment_id)
  values (new.id)
  on conflict (enrollment_id) do nothing;
  return new;
end;
$$;

drop trigger if exists course_enrollments_after_insert on public.course_enrollments;
create trigger course_enrollments_after_insert after insert on public.course_enrollments
  for each row execute function public.ensure_course_progress();

-- ---------------------------------------------------------------------------
-- Course progress guard
--  - classes_completed cannot exceed the course total
--  - completion requires all classes completed
--  - exam exceptions are admin-only
-- ---------------------------------------------------------------------------
create or replace function public.course_progress_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  select c.total_classes into v_total
    from public.course_progress cp
    join public.course_enrollments ce on ce.id = cp.enrollment_id
    join public.courses c on c.id = ce.course_id
   where cp.id = old.id;

  v_total := coalesce(v_total, 0);

  if new.classes_completed > v_total then
    raise exception 'classes_completed cannot exceed the course total of %', v_total;
  end if;

  if new.status = 'completed' and new.classes_completed < v_total then
    raise exception 'Course cannot be marked complete until all classes are completed';
  end if;

  if not public.is_admin() and old.exam_exception_allowed is distinct from new.exam_exception_allowed then
    raise exception 'Only administrators may change the examination exception';
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists course_progress_guard on public.course_progress;
create trigger course_progress_guard before update on public.course_progress
  for each row execute function public.course_progress_guard();

-- ---------------------------------------------------------------------------
-- One active examination submission per student
-- ---------------------------------------------------------------------------
create unique index if not exists examination_one_active_uidx
  on public.examination_submissions (student_id) where (is_active);

-- ---------------------------------------------------------------------------
-- Examination submission guard
--  - students can only submit their own sheet
--  - submission requires completed course unless an admin exception exists
-- ---------------------------------------------------------------------------
create or replace function public.examination_submission_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_progress uuid;
  v_exception boolean;
  v_done boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if new.student_id <> auth.uid() then
    raise exception 'You can only submit examination sheets for your own account';
  end if;

  select cp.id, coalesce(cp.exam_exception_allowed, false), (cp.status = 'completed')
    into v_progress, v_exception, v_done
    from public.course_progress cp
    join public.course_enrollments ce on ce.id = cp.enrollment_id
   where ce.student_id = new.student_id
   order by ce.created_at desc
   limit 1;

  if v_progress is null then
    raise exception 'Active course enrollment not found';
  end if;

  if not v_done and not v_exception then
    raise exception 'Examination submission requires the course to be completed or an administrator-approved exception';
  end if;

  return new;
end;
$$;

drop trigger if exists examination_submission_guard on public.examination_submissions;
create trigger examination_submission_guard before insert on public.examination_submissions
  for each row execute function public.examination_submission_guard();

-- ---------------------------------------------------------------------------
-- Payment transaction guard:
--  - idempotency_key unique (duplicate confirmations impossible)
--  - students can never create or verify transactions
--  - receipts must be unique
-- ---------------------------------------------------------------------------
create or replace function public.payment_transaction_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only authorized administrators can record payments';
  end if;
  if new.amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  return new;
end;
$$;

drop trigger if exists payment_transaction_insert_guard on public.payment_transactions;
create trigger payment_transaction_insert_guard before insert on public.payment_transactions
  for each row execute function public.payment_transaction_insert_guard();

create or replace function public.payment_transaction_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only authorized administrators can modify payments';
  end if;
  if old.status = 'verified' and new.status in ('rejected', 'reverted')
     and pg_trigger_depth() = 1 then
    -- Verified financial records are never silently modified; corrections use
    -- the controlled revert workflow which preserves the history row.
    raise exception 'Verified payments cannot be modified directly. Use the revert workflow.';
  end if;
  return new;
end;
$$;

drop trigger if exists payment_transaction_update_guard on public.payment_transactions;
create trigger payment_transaction_update_guard before update on public.payment_transactions
  for each row execute function public.payment_transaction_update_guard();

-- ---------------------------------------------------------------------------
-- Register fee adjustments (waivers / discounts / charges) in the audit trail
-- ---------------------------------------------------------------------------
create or replace function public.payment_adjustment_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only authorized administrators can apply fee adjustments';
  end if;
  return new;
end;
$$;

drop trigger if exists payment_adjustment_insert_guard on public.payment_adjustments;
create trigger payment_adjustment_insert_guard before insert on public.payment_adjustments
  for each row execute function public.payment_adjustment_guard();

-- ---------------------------------------------------------------------------
-- Refund guard
-- ---------------------------------------------------------------------------
create or replace function public.payment_refund_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only authorized administrators can record refunds';
  end if;
  return new;
end;
$$;

drop trigger if exists payment_refund_insert_guard on public.payment_refunds;
create trigger payment_refund_insert_guard before insert on public.payment_refunds
  for each row execute function public.payment_refund_guard();

-- ---------------------------------------------------------------------------
-- Financial summary view (RLS-aware via security_invoker)
-- ---------------------------------------------------------------------------
create or replace view public.v_student_finance
with (security_invoker = true) as
with sfa as (
  select
    s.id as student_id,
    coalesce(f.course_fee, 0) as course_fee,
    coalesce(f.registration_fee, 0) as registration_fee,
    coalesce(f.additional_charges, 0) as additional_charges,
    coalesce(f.discount_amount, 0) as discount_amount,
    coalesce(f.late_fee, 0) as late_fee,
    coalesce(f.fee_waived, false) as fee_waived,
    coalesce(f.currency, 'INR') as currency,
    f.due_date
  from public.students s
  left join public.student_fee_assessments f on f.student_id = s.id
),
ptx as (
  select student_id,
         coalesce(sum(amount) filter (where status = 'verified'), 0) as verified_paid,
         count(*) filter (where status = 'verified') as txn_count,
         max(payment_date) filter (where status = 'verified') as last_payment_date
    from public.payment_transactions
   group by student_id
),
ref as (
  select student_id,
         coalesce(sum(amount) filter (where status = 'confirmed'), 0) as confirmed_refunds,
         count(*) filter (where status = 'confirmed') as refund_count
    from public.payment_refunds
   group by student_id
)
select
  inner_v.student_id,
  inner_v.course_fee,
  inner_v.registration_fee,
  inner_v.additional_charges,
  inner_v.discount_amount,
  inner_v.late_fee,
  inner_v.fee_waived,
  inner_v.currency,
  inner_v.total_payable,
  inner_v.verified_paid,
  inner_v.confirmed_refunds,
  inner_v.net_paid,
  inner_v.outstanding_due,
  inner_v.due_date,
  inner_v.last_payment_date,
  inner_v.has_payments,
  inner_v.has_refunds,
  case
    when inner_v.total_payable > 0 and inner_v.net_paid > inner_v.total_payable then 'overpaid'
    when inner_v.total_payable > 0 and inner_v.net_paid = inner_v.total_payable then 'paid'
    when inner_v.net_paid > 0 and inner_v.total_payable > inner_v.net_paid then 'partially_paid'
    when inner_v.has_payments and inner_v.has_refunds and inner_v.net_paid = 0 then 'refunded'
    when inner_v.total_payable <= 0 then 'waived'
    else 'unpaid'
  end as payment_status
from (
  select
    sfa.student_id,
    sfa.course_fee,
    sfa.registration_fee,
    sfa.additional_charges,
    sfa.discount_amount,
    sfa.late_fee,
    sfa.fee_waived,
    sfa.currency,
    sfa.due_date,
    greatest(0,
      sfa.course_fee + sfa.registration_fee
      - sfa.discount_amount + sfa.additional_charges + sfa.late_fee) as total_payable,
    coalesce(ptx.verified_paid, 0) as verified_paid,
    coalesce(ref.confirmed_refunds, 0) as confirmed_refunds,
    greatest(0,
      coalesce(ptx.verified_paid, 0) - coalesce(ref.confirmed_refunds, 0)) as net_paid,
    greatest(0,
      greatest(0, sfa.course_fee + sfa.registration_fee
        - sfa.discount_amount + sfa.additional_charges + sfa.late_fee)
      - greatest(0, coalesce(ptx.verified_paid, 0) - coalesce(ref.confirmed_refunds, 0))) as outstanding_due,
    ptx.last_payment_date,
    coalesce(ptx.txn_count, 0) > 0 as has_payments,
    coalesce(ref.refund_count, 0) > 0 as has_refunds
  from sfa
  left join ptx on ptx.student_id = sfa.student_id
  left join ref on ref.student_id = sfa.student_id
) inner_v;

grant select on public.v_student_finance to authenticated;
grant select on public.v_student_finance to service_role;

-- ==================================================================
-- FILE: 00003_rls.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0003: Row Level Security
-- Every client-accessible table has RLS. The service_role bypasses RLS and is
-- reserved for privileged server-side operations.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;

drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select using (
    public.is_admin()
    or id = auth.uid()
    or public.teacher_has_student(id)
  );

drop policy if exists students_insert_admin on public.students;
create policy students_insert_admin on public.students
  for insert with check (public.is_admin());

drop policy if exists students_update on public.students;
create policy students_update on public.students
  for update using (
    public.is_admin() or id = auth.uid()
  )
  with check (
    public.is_admin() or id = auth.uid()
  );

drop policy if exists students_delete_admin on public.students;
create policy students_delete_admin on public.students
  for delete using (public.is_admin());

-- Students can edit their own contact/profile fields only; guard trigger.
create or replace function public.students_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if old.registration_number is distinct from new.registration_number
       or old.status is distinct from new.status
       or old.teacher_id is distinct from new.teacher_id
       or old.enrollment_date is distinct from new.enrollment_date
       or old.email is distinct from new.email then
      raise exception 'You can only update your own contact and address details';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists students_update_guard on public.students;
create trigger students_update_guard before update on public.students
  for each row execute function public.students_update_guard();

-- ---------------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------------
alter table public.teachers enable row level security;

drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers
  for select using (public.is_admin() or id = auth.uid());

drop policy if exists teachers_insert_admin on public.teachers;
create policy teachers_insert_admin on public.teachers
  for insert with check (public.is_admin());

drop policy if exists teachers_update_admin on public.teachers;
create policy teachers_update_admin on public.teachers
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists teachers_delete_admin on public.teachers;
create policy teachers_delete_admin on public.teachers
  for delete using (public.is_admin());

-- Public dropdown list used by the registration form (id + name only).
create or replace view public.teachers_public as
  select id, full_name from public.teachers where is_active = true;
grant select on public.teachers_public to anon;
grant select on public.teachers_public to authenticated;

-- ---------------------------------------------------------------------------
-- teacher_assignments
-- ---------------------------------------------------------------------------
alter table public.teacher_assignments enable row level security;

drop policy if exists teacher_assignments_select on public.teacher_assignments;
create policy teacher_assignments_select on public.teacher_assignments
  for select using (public.is_admin() or teacher_id = auth.uid());

drop policy if exists teacher_assignments_insert_admin on public.teacher_assignments;
create policy teacher_assignments_insert_admin on public.teacher_assignments
  for insert with check (public.is_admin());

drop policy if exists teacher_assignments_update_admin on public.teacher_assignments;
create policy teacher_assignments_update_admin on public.teacher_assignments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists teacher_assignments_delete_admin on public.teacher_assignments;
create policy teacher_assignments_delete_admin on public.teacher_assignments
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
alter table public.courses enable row level security;

drop policy if exists courses_select_authed on public.courses;
create policy courses_select_authed on public.courses
  for select using (auth.uid() is not null);

drop policy if exists courses_insert_admin on public.courses;
create policy courses_insert_admin on public.courses
  for insert with check (public.is_admin());

drop policy if exists courses_update_admin on public.courses;
create policy courses_update_admin on public.courses
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists courses_delete_admin on public.courses;
create policy courses_delete_admin on public.courses
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- course_enrollments
-- ---------------------------------------------------------------------------
alter table public.course_enrollments enable row level security;

drop policy if exists course_enrollments_select on public.course_enrollments;
create policy course_enrollments_select on public.course_enrollments
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_has_student(student_id)
  );

drop policy if exists course_enrollments_insert_admin on public.course_enrollments;
create policy course_enrollments_insert_admin on public.course_enrollments
  for insert with check (public.is_admin());

drop policy if exists course_enrollments_update_admin on public.course_enrollments;
create policy course_enrollments_update_admin on public.course_enrollments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists course_enrollments_delete_admin on public.course_enrollments;
create policy course_enrollments_delete_admin on public.course_enrollments
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- course_progress
-- ---------------------------------------------------------------------------
alter table public.course_progress enable row level security;

drop policy if exists course_progress_select on public.course_progress;
create policy course_progress_select on public.course_progress
  for select using (
    public.is_admin()
    or public.teacher_has_student((select student_id from public.course_enrollments ce where ce.id = enrollment_id))
    or exists (
      select 1 from public.course_enrollments ce
      where ce.id = enrollment_id and ce.student_id = auth.uid()
    )
  );

drop policy if exists course_progress_insert_admin on public.course_progress;
create policy course_progress_insert_admin on public.course_progress
  for insert with check (public.is_admin());

-- Teachers may update authorized class-completion progress; triggers guard the
-- exam-exception column and totals.
drop policy if exists course_progress_update on public.course_progress;
create policy course_progress_update on public.course_progress
  for update using (
    public.is_admin()
    or public.teacher_has_student((select student_id from public.course_enrollments ce where ce.id = enrollment_id))
  )
  with check (
    public.is_admin()
    or public.teacher_has_student((select student_id from public.course_enrollments ce where ce.id = enrollment_id))
  );

drop policy if exists course_progress_delete_admin on public.course_progress;
create policy course_progress_delete_admin on public.course_progress
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- course_fee_settings
-- ---------------------------------------------------------------------------
alter table public.course_fee_settings enable row level security;

drop policy if exists course_fee_settings_select on public.course_fee_settings;
create policy course_fee_settings_select on public.course_fee_settings
  for select using (true);

drop policy if exists course_fee_settings_insert_admin on public.course_fee_settings;
create policy course_fee_settings_insert_admin on public.course_fee_settings
  for insert with check (public.is_admin());

drop policy if exists course_fee_settings_update_admin on public.course_fee_settings;
create policy course_fee_settings_update_admin on public.course_fee_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists course_fee_settings_delete_admin on public.course_fee_settings;
create policy course_fee_settings_delete_admin on public.course_fee_settings
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- student_fee_assessments
-- ---------------------------------------------------------------------------
alter table public.student_fee_assessments enable row level security;

drop policy if exists fee_assessments_select on public.student_fee_assessments;
create policy fee_assessments_select on public.student_fee_assessments
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_can_view_finance(student_id)
  );

drop policy if exists fee_assessments_insert_admin on public.student_fee_assessments;
create policy fee_assessments_insert_admin on public.student_fee_assessments
  for insert with check (public.is_admin());

drop policy if exists fee_assessments_update_admin on public.student_fee_assessments;
create policy fee_assessments_update_admin on public.student_fee_assessments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists fee_assessments_delete_admin on public.student_fee_assessments;
create policy fee_assessments_delete_admin on public.student_fee_assessments
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- payment_transactions
-- ---------------------------------------------------------------------------
alter table public.payment_transactions enable row level security;

drop policy if exists payments_select on public.payment_transactions;
create policy payments_select on public.payment_transactions
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_can_view_finance(student_id)
  );

drop policy if exists payments_insert_admin on public.payment_transactions;
create policy payments_insert_admin on public.payment_transactions
  for insert with check (public.is_admin());

drop policy if exists payments_update_admin on public.payment_transactions;
create policy payments_update_admin on public.payment_transactions
  for update using (public.is_admin()) with check (public.is_admin());

-- No DELETE policy: payment history is append-only.

-- ---------------------------------------------------------------------------
-- payment_adjustments
-- ---------------------------------------------------------------------------
alter table public.payment_adjustments enable row level security;

drop policy if exists adjustments_select on public.payment_adjustments;
create policy adjustments_select on public.payment_adjustments
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_can_view_finance(student_id)
  );

drop policy if exists adjustments_insert_admin on public.payment_adjustments;
create policy adjustments_insert_admin on public.payment_adjustments
  for insert with check (public.is_admin());

drop policy if exists adjustments_update_admin on public.payment_adjustments;
create policy adjustments_update_admin on public.payment_adjustments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists adjustments_delete_admin on public.payment_adjustments;
create policy adjustments_delete_admin on public.payment_adjustments
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- payment_refunds
-- ---------------------------------------------------------------------------
alter table public.payment_refunds enable row level security;

drop policy if exists refunds_select on public.payment_refunds;
create policy refunds_select on public.payment_refunds
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_can_view_finance(student_id)
  );

drop policy if exists refunds_insert_admin on public.payment_refunds;
create policy refunds_insert_admin on public.payment_refunds
  for insert with check (public.is_admin());

drop policy if exists refunds_update_admin on public.payment_refunds;
create policy refunds_update_admin on public.payment_refunds
  for update using (public.is_admin()) with check (public.is_admin());

-- No DELETE policy: refund history is append-only.

-- ---------------------------------------------------------------------------
-- payment_receipts
-- ---------------------------------------------------------------------------
alter table public.payment_receipts enable row level security;

drop policy if exists receipts_select on public.payment_receipts;
create policy receipts_select on public.payment_receipts
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_can_view_finance(student_id)
  );

drop policy if exists receipts_insert_admin on public.payment_receipts;
create policy receipts_insert_admin on public.payment_receipts
  for insert with check (public.is_admin());

drop policy if exists receipts_update_admin on public.payment_receipts;
create policy receipts_update_admin on public.payment_receipts
  for update using (public.is_admin()) with check (public.is_admin());

-- No DELETE policy.

-- ---------------------------------------------------------------------------
-- examination_submissions
-- ---------------------------------------------------------------------------
alter table public.examination_submissions enable row level security;

drop policy if exists exam_submissions_select on public.examination_submissions;
create policy exam_submissions_select on public.examination_submissions
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_has_student(student_id)
  );

drop policy if exists exam_submissions_insert on public.examination_submissions;
create policy exam_submissions_insert on public.examination_submissions
  for insert with check (public.is_admin() or student_id = auth.uid());

drop policy if exists exam_submissions_update on public.examination_submissions;
create policy exam_submissions_update on public.examination_submissions
  for update using (
    public.is_admin() or student_id = auth.uid()
  )
  with check (
    public.is_admin() or student_id = auth.uid()
  );

-- No DELETE policy.

-- ---------------------------------------------------------------------------
-- examination_evaluations
-- ---------------------------------------------------------------------------
alter table public.examination_evaluations enable row level security;

drop policy if exists exam_evaluations_select on public.examination_evaluations;
create policy exam_evaluations_select on public.examination_evaluations
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.examination_submissions es
      where es.id = submission_id
        and (es.student_id = auth.uid() or public.teacher_has_student(es.student_id))
    )
  );

drop policy if exists exam_evaluations_insert_admin on public.examination_evaluations;
create policy exam_evaluations_insert_admin on public.examination_evaluations
  for insert with check (public.is_admin());

drop policy if exists exam_evaluations_update_admin on public.examination_evaluations;
create policy exam_evaluations_update_admin on public.examination_evaluations
  for update using (public.is_admin()) with check (public.is_admin());

-- No DELETE policy: evaluations are part of the exam audit trail.

-- ---------------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------------
alter table public.certificates enable row level security;

drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    public.is_admin()
    or student_id = auth.uid()
    or public.teacher_has_student(student_id)
  );

drop policy if exists certificates_insert_admin on public.certificates;
create policy certificates_insert_admin on public.certificates
  for insert with check (public.is_admin());

drop policy if exists certificates_update_admin on public.certificates;
create policy certificates_update_admin on public.certificates
  for update using (public.is_admin()) with check (public.is_admin());

-- No DELETE policy: certificate lifecycle is protected.

-- ---------------------------------------------------------------------------
-- certificate_history
-- ---------------------------------------------------------------------------
alter table public.certificate_history enable row level security;

drop policy if exists certificate_history_select on public.certificate_history;
create policy certificate_history_select on public.certificate_history
  for select using (
    public.is_admin()
    or public.teacher_has_student(student_id)
    or student_id = auth.uid()
  );

drop policy if exists certificate_history_insert_admin on public.certificate_history;
create policy certificate_history_insert_admin on public.certificate_history
  for insert with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (auth.uid() is not null);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete_admin on public.notifications;
create policy notifications_delete_admin on public.notifications
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
  for select using (public.is_admin());

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert with check (auth.uid() is not null);

-- No UPDATE/DELETE policies: audit logs are immutable.

-- ---------------------------------------------------------------------------
-- portal_settings
-- ---------------------------------------------------------------------------
alter table public.portal_settings enable row level security;

drop policy if exists portal_settings_select on public.portal_settings;
create policy portal_settings_select on public.portal_settings
  for select using (true);

drop policy if exists portal_settings_insert_admin on public.portal_settings;
create policy portal_settings_insert_admin on public.portal_settings
  for insert with check (public.is_admin());

drop policy if exists portal_settings_update_admin on public.portal_settings;
create policy portal_settings_update_admin on public.portal_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists portal_settings_delete_admin on public.portal_settings;
create policy portal_settings_delete_admin on public.portal_settings
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- id_sequences: deny all client access (functions run as security definer)
-- ---------------------------------------------------------------------------
alter table public.id_sequences enable row level security;

revoke all on public.id_sequences from anon;
revoke all on public.id_sequences from authenticated;

-- ==================================================================
-- FILE: 00004_storage.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0004: Storage buckets & policies
-- Private buckets use short-lived signed URLs for access. Storage RLS
-- policies mirror the table policies. public-assets is the only public bucket
-- (used for the replaceable portal logo).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-photos',  'student-photos',  false, 5242880,
    '{image/jpeg,image/jpg,image/png}'),
  ('exam-sheets',     'exam-sheets',     false, 10485760,
    '{application/pdf,image/jpeg,image/jpg,image/png}'),
  ('certificates',    'certificates',    false, 5242880,
    '{application/pdf}'),
  ('payment-proofs',  'payment-proofs',  false, 5242880,
    '{application/pdf,image/jpeg,image/jpg,image/png}'),
  ('public-assets',   'public-assets',   true, 5242880,
    '{image/jpeg,image/jpg,image/png,image/svg+xml,image/webp}')
on conflict (id) do nothing;

-- ===========================================================================
-- student-photos
-- ===========================================================================
drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'student-photos'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "photos_select" on storage.objects;
create policy "photos_select" on storage.objects
  for select using (
    bucket_id = 'student-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.teacher_has_student(cast((storage.foldername(name))[1] as uuid))
    )
  );

drop policy if exists "photos_update" on storage.objects;
create policy "photos_update" on storage.objects
  for update with check (
    bucket_id = 'student-photos'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete" on storage.objects
  for delete using (
    bucket_id = 'student-photos' and public.is_admin()
  );

-- ===========================================================================
-- exam-sheets
-- ===========================================================================
drop policy if exists "exam_insert" on storage.objects;
create policy "exam_insert" on storage.objects
  for insert with check (
    bucket_id = 'exam-sheets'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "exam_select" on storage.objects;
create policy "exam_select" on storage.objects
  for select using (
    bucket_id = 'exam-sheets'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.teacher_has_student(cast((storage.foldername(name))[1] as uuid))
    )
  );

drop policy if exists "exam_update" on storage.objects;
create policy "exam_update" on storage.objects
  for update with check (
    bucket_id = 'exam-sheets' and public.is_admin()
  );

drop policy if exists "exam_delete" on storage.objects;
create policy "exam_delete" on storage.objects
  for delete using (
    bucket_id = 'exam-sheets' and public.is_admin()
  );

-- ===========================================================================
-- certificates
-- ===========================================================================
drop policy if exists "certs_insert" on storage.objects;
create policy "certs_insert" on storage.objects
  for insert with check (bucket_id = 'certificates' and public.is_admin());

drop policy if exists "certs_select" on storage.objects;
create policy "certs_select" on storage.objects
  for select using (
    bucket_id = 'certificates'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.teacher_has_student(cast((storage.foldername(name))[1] as uuid))
    )
  );

drop policy if exists "certs_update" on storage.objects;
create policy "certs_update" on storage.objects
  for update with check (bucket_id = 'certificates' and public.is_admin());

drop policy if exists "certs_delete" on storage.objects;
create policy "certs_delete" on storage.objects
  for delete using (bucket_id = 'certificates' and public.is_admin());

-- ===========================================================================
-- payment-proofs (financial data: administrators only)
-- ===========================================================================
drop policy if exists "proofs_insert" on storage.objects;
create policy "proofs_insert" on storage.objects
  for insert with check (bucket_id = 'payment-proofs' and public.is_admin());

drop policy if exists "proofs_select" on storage.objects;
create policy "proofs_select" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.is_admin());

drop policy if exists "proofs_update" on storage.objects;
create policy "proofs_update" on storage.objects
  for update with check (bucket_id = 'payment-proofs' and public.is_admin());

drop policy if exists "proofs_delete" on storage.objects;
create policy "proofs_delete" on storage.objects
  for delete using (bucket_id = 'payment-proofs' and public.is_admin());

-- ===========================================================================
-- public-assets (public bucket: logo and other approved assets)
-- ===========================================================================
drop policy if exists "assets_select_public" on storage.objects;
create policy "assets_select_public" on storage.objects
  for select using (bucket_id = 'public-assets');

drop policy if exists "assets_insert_admin" on storage.objects;
create policy "assets_insert_admin" on storage.objects
  for insert with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "assets_update_admin" on storage.objects;
create policy "assets_update_admin" on storage.objects
  for update with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "assets_delete_admin" on storage.objects;
create policy "assets_delete_admin" on storage.objects
  for delete using (bucket_id = 'public-assets' and public.is_admin());

-- ===========================================================================
-- Block anonymous writes everywhere except public-assets
-- ===========================================================================
revoke all on storage.objects from anon;

-- ==================================================================
-- FILE: 00005_seed_defaults.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0005: default configuration seed
-- Safe defaults. Admin can change everything from the Settings page.
-- ============================================================================

-- Active IDC course (the only course this portal manages).
insert into public.courses (code, name, description, total_classes)
values (
  'IDC',
  'ISKCON Disciples Course',
  'Structured study of the guru-disciple relationship and initiation principles within ISKCON.',
  12
)
on conflict (code) do nothing;

-- Default portal settings (jsonb key -> value). Update values as needed.
insert into public.portal_settings (key, value) values
  ('temple_name', '"ISKCON Durgapur"'),
  ('idc_center_name', '"ISKCON Disciples Course Department"'),
  ('logo_path', '""'),
  ('contact_email', '"info.iskcondurgapur@gmail.com"'),
  ('contact_phone', '"Not Required"'),
  ('contact_address', '"ISKCON Durgapur"'),
  ('public_disclose_student_name', 'true'),
  ('require_payment_before_certificate', 'true'),
  ('allow_exam_without_completion', 'false'),
  ('student_photo_limit_mb', '2'),
  ('exam_sheet_limit_mb', '10'),
  ('certificate_limit_mb', '5'),
  ('registration_open', 'true'),
  ('homepage_intro', '"The ISKCON Disciples Course (IDC) is a structured study programme for devotees who wish to deepen their understanding of the guru-disciple relationship and the principles of initiation within ISKCON."'),
  ('disclaimer', '"This portal is operated locally by the temple IDC administration. Information published here is provided by the administrator and does not imply accreditation beyond that supplied by the temple."')
on conflict (key) do nothing;

-- Active course fee configuration (â‚¹1,500 illustrative example).
insert into public.course_fee_settings (
  standard_fee, currency, registration_fee, additional_charges,
  discount_rules, late_fee, late_fee_enabled, payment_instructions,
  refund_policy, require_payment_before_certificate, effective_date, is_active
) values (
  1500, 'INR', 0, 0,
  'Approved by the IDC administration on a case-by-case basis.',
  0, false,
  'Payments can be made in cash, via UPI or by bank transfer. Contact the IDC administration for payment details.',
  'Refunds are issued at the discretion of the IDC administration and are recorded with the original payment.',
  true, current_date, true
)
on conflict (id) do nothing;

-- ==================================================================
-- FILE: 00006_workflow_functions.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0006: transactional workflow helpers
-- These run as security definer to perform multi-row operations atomically.
-- Each function re-checks that the caller is an administrator.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- approve_student: approve registration, create enrollment, snapshot the fee
-- from the active fee settings, and (optionally) assign a teacher.
-- ---------------------------------------------------------------------------
create or replace function public.approve_student(
  p_student_id uuid,
  p_teacher_id uuid default null,
  p_admin_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_course uuid;
  v_enrollment uuid;
  v_fee public.course_fee_settings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve registrations';
  end if;

  update public.students
     set status = 'approved', updated_at = now()
   where id = p_student_id and status in ('pending', 'rejected', 'suspended');
  if not found then
    raise exception 'Student not found or not in an approvable state';
  end if;

  select id into v_course from public.courses
   where is_active = true order by created_at asc limit 1;
  if v_course is null then
    raise exception 'No active course configured. Create the IDC course first.';
  end if;

  insert into public.course_enrollments (student_id, course_id, enrolled_at, status)
  values (p_student_id, v_course, current_date, 'not_started')
  on conflict (student_id, course_id)
  do update set status = 'not_started', updated_at = now()
  returning id into v_enrollment;

  select * into v_fee from public.course_fee_settings
   where is_active = true
   order by effective_date desc, created_at desc
   limit 1;

  insert into public.student_fee_assessments (
    student_id, course_fee, currency, registration_fee,
    additional_charges, late_fee, due_date, set_by
  ) values (
    p_student_id,
    coalesce(v_fee.standard_fee, 0),
    coalesce(v_fee.currency, 'INR'),
    coalesce(v_fee.registration_fee, 0),
    coalesce(v_fee.additional_charges, 0),
    coalesce(v_fee.late_fee, 0),
    v_fee.due_date,
    p_admin_id
  )
  on conflict (student_id) do nothing;

  if p_teacher_id is not null then
    update public.teacher_assignments
       set is_active = false, unassigned_at = now()
     where student_id = p_student_id and is_active;

    insert into public.teacher_assignments (student_id, teacher_id, assigned_by)
    values (p_student_id, p_teacher_id, p_admin_id);

    update public.students set teacher_id = p_teacher_id, updated_at = now()
     where id = p_student_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_student
-- ---------------------------------------------------------------------------
create or replace function public.reject_student(p_student_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reject registrations';
  end if;
  update public.students set status = 'rejected', updated_at = now()
   where id = p_student_id;
end;
$$;

grant execute on function public.approve_student(uuid, uuid, uuid) to authenticated;
grant execute on function public.reject_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- assign_teacher: change assignments, preserving the old assignment history.
-- ---------------------------------------------------------------------------
create or replace function public.assign_teacher(
  p_student_id uuid,
  p_teacher_id uuid,
  p_admin_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign teachers';
  end if;
  if p_teacher_id is not null then
    update public.teacher_assignments
       set is_active = false, unassigned_at = now()
     where student_id = p_student_id and is_active;
    insert into public.teacher_assignments (student_id, teacher_id, assigned_by)
    values (p_student_id, p_teacher_id, p_admin_id);
    update public.students set teacher_id = p_teacher_id, updated_at = now()
     where id = p_student_id;
  else
    update public.teacher_assignments
       set is_active = false, unassigned_at = now()
     where student_id = p_student_id and is_active;
    update public.students set teacher_id = null, updated_at = now()
     where id = p_student_id;
  end if;
end;
$$;

grant execute on function public.assign_teacher(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- record_payment: insert a payment transaction with duplicate protection.
-- Returns the new (or existing) payment id and receipt number.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
  p_student_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_reference text default null,
  p_remarks text default null,
  p_received_by uuid default null,
  p_idempotency_key text default null,
  p_proof_path text default null,
  out p_payment_id uuid,
  out p_receipt_number text,
  out p_duplicate boolean
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can record payments';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  if p_idempotency_key is not null then
    select id, receipt_number into p_payment_id, p_receipt_number
      from public.payment_transactions
     where idempotency_key = p_idempotency_key;
    if found then
      p_duplicate := true;
      return;
    end if;
  end if;

  insert into public.payment_transactions (
    student_id, amount, payment_date, method, reference, receipt_number,
    status, received_by, remarks, proof_path, idempotency_key
  ) values (
    p_student_id, p_amount, p_payment_date, p_method, p_reference,
    public.next_receipt_number(), 'pending', p_received_by, p_remarks,
    p_proof_path, p_idempotency_key
  )
  returning id, receipt_number into p_payment_id, p_receipt_number;

  p_duplicate := false;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, date, text, text, text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- verify_payment: confirm a pending transaction and record receipt issuance.
-- ---------------------------------------------------------------------------
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_verified_by uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can verify payments';
  end if;

  update public.payment_transactions
     set status = 'verified', verified_by = p_verified_by, verified_at = now()
   where id = p_payment_id and status = 'pending';
  if not found then
    raise exception 'Payment not found or not in a verifiable state';
  end if;

  insert into public.payment_receipts (payment_id, student_id, receipt_number, amount, issued_by, status)
  select id, student_id, receipt_number, amount, p_verified_by, 'verified'
    from public.payment_transactions where id = p_payment_id
  on conflict (payment_id) do update set status = 'verified';
end;
$$;

grant execute on function public.verify_payment(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- reject_payment: a pending or recorded payment is rejected (not counted).
-- ---------------------------------------------------------------------------
create or replace function public.reject_payment(
  p_payment_id uuid,
  p_admin_id uuid,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reject payments';
  end if;
  update public.payment_transactions
     set status = 'rejected',
         remarks = coalesce(remarks, '') || coalesce(' | ' || p_note, ''),
         verified_by = p_admin_id, verified_at = now()
   where id = p_payment_id and status in ('pending', 'verified');
end;
$$;

grant execute on function public.reject_payment(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- revert_payment: controlled correction preserving the original audit record.
-- ---------------------------------------------------------------------------
create or replace function public.revert_payment(
  p_payment_id uuid,
  p_admin_id uuid,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can revert payments';
  end if;
  update public.payment_transactions
     set status = 'reverted',
         remarks = coalesce(remarks, '') || coalesce(' | ' || p_note, ''),
         verified_by = p_admin_id, verified_at = now()
   where id = p_payment_id and status = 'verified';
  if not found then
    raise exception 'Payment not found or not verified';
  end if;
  update public.payment_receipts set status = 'reverted'
   where payment_id = p_payment_id;
end;
$$;

grant execute on function public.revert_payment(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- confirm_refund / cancel_refund
-- ---------------------------------------------------------------------------
create or replace function public.set_refund_status(
  p_refund_id uuid,
  p_status text,
  p_admin_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage refunds';
  end if;
  update public.payment_refunds set status = p_status
   where id = p_refund_id and status <> 'cancelled';
  if not found then
    raise exception 'Refund not found or already cancelled';
  end if;
end;
$$;

grant execute on function public.set_refund_status(uuid, text, uuid) to authenticated;



-- ==================================================================
-- FILE: 00007_course_materials.sql
-- ==================================================================

-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0007: course materials
-- Administrators upload study material (PDF). Only students whose course fee
-- is fully settled ('paid' / 'overpaid' / 'waived') may see and download the
-- published material. Files live in a private storage bucket and are delivered
-- through short-lived signed URLs issued server-side.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- course_materials
-- ---------------------------------------------------------------------------
create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null,
  file_name text,
  file_size bigint,
  mime_type text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_materials_published_idx
  on public.course_materials (is_published, sort_order);

drop trigger if exists course_materials_updated_at on public.course_materials;
create trigger course_materials_updated_at before update on public.course_materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Is the given student financially settled? Runs as definer so it can read the
-- finance view without depending on the caller's row-level privileges.
-- ---------------------------------------------------------------------------
create or replace function public.student_is_settled(v_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.v_student_finance f
    where f.student_id = v_student_id
      and f.payment_status in ('paid', 'overpaid', 'waived')
  );
$$;

grant execute on function public.student_is_settled(uuid) to authenticated;
grant execute on function public.student_is_settled(uuid) to anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.course_materials enable row level security;

drop policy if exists course_materials_select on public.course_materials;
create policy course_materials_select on public.course_materials
  for select using (
    public.is_admin()
    or (is_published and public.student_is_settled(auth.uid()))
  );

drop policy if exists course_materials_insert_admin on public.course_materials;
create policy course_materials_insert_admin on public.course_materials
  for insert with check (public.is_admin());

drop policy if exists course_materials_update_admin on public.course_materials;
create policy course_materials_update_admin on public.course_materials
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists course_materials_delete_admin on public.course_materials;
create policy course_materials_delete_admin on public.course_materials
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-materials', 'course-materials', false, 20971520, '{application/pdf}')
on conflict (id) do nothing;

drop policy if exists "materials_insert" on storage.objects;
create policy "materials_insert" on storage.objects
  for insert with check (bucket_id = 'course-materials' and public.is_admin());

drop policy if exists "materials_select" on storage.objects;
create policy "materials_select" on storage.objects
  for select using (
    bucket_id = 'course-materials'
    and (public.is_admin() or public.student_is_settled(auth.uid()))
  );

drop policy if exists "materials_update" on storage.objects;
create policy "materials_update" on storage.objects
  for update with check (bucket_id = 'course-materials' and public.is_admin());

drop policy if exists "materials_delete" on storage.objects;
create policy "materials_delete" on storage.objects
  for delete using (bucket_id = 'course-materials' and public.is_admin());
