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