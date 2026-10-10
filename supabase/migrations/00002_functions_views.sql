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