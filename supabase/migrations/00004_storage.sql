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