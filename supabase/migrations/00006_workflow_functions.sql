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