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
