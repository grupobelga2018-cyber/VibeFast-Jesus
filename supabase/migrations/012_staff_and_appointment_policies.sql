-- ============================================================
-- 012 · Staff allowlist + políticas de appointments
-- ------------------------------------------------------------
-- El dashboard escribe/lee citas con la sesión (anon + JWT).
-- Solo los correos en public.staff pueden SELECT/INSERT/UPDATE/DELETE.
-- El bot y el lifecycle siguen con service_role (bypassean RLS).
-- JWT se compara en minúsculas; los emails de staff se guardan en minúsculas.
-- ============================================================

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

grant select on public.staff to authenticated;

create policy "staff_select_self" on public.staff
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = email);

insert into public.staff (email) values
  ('grupobelga2018@gmail.com'),
  ('gabymk7003@gmail.com');

drop policy "appointments_select_authenticated" on public.appointments;
create policy "appointments_select_staff" on public.appointments
  for select to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (select email from public.staff)
  );

drop policy "appointments_insert_authenticated" on public.appointments;
drop policy "appointments_update_authenticated" on public.appointments;
drop policy "appointments_delete_authenticated" on public.appointments;

create policy "appointments_insert_staff" on public.appointments
  for insert to authenticated
  with check (
    lower(auth.jwt() ->> 'email') in (select email from public.staff)
  );

create policy "appointments_update_staff" on public.appointments
  for update to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (select email from public.staff)
  )
  with check (
    lower(auth.jwt() ->> 'email') in (select email from public.staff)
  );

create policy "appointments_delete_staff" on public.appointments
  for delete to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (select email from public.staff)
  );
