-- ============================================================
-- 008 · Appointments + Telegram conversations
-- ------------------------------------------------------------
-- Citas del salón (Calendly, Telegram o manual).
-- Inserts públicos solo vía service_role (webhooks/bot).
-- Staff autenticado lee/actualiza todas las filas.
-- ============================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  client_phone text,
  client_email text,
  client_telegram_id text,
  service_slug text not null default 'corte',
  starts_at timestamptz not null,
  ends_at timestamptz,
  channel text not null check (channel in ('calendly', 'telegram', 'manual')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  calendly_event_uri text unique,
  notes text,
  proposed_starts_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_starts_at_idx
  on public.appointments (starts_at);

create index if not exists appointments_status_idx
  on public.appointments (status);

create index if not exists appointments_telegram_idx
  on public.appointments (client_telegram_id);

create table if not exists public.telegram_conversations (
  chat_id text primary key,
  state text not null default 'idle',
  draft jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists telegram_conversations_set_updated_at on public.telegram_conversations;
create trigger telegram_conversations_set_updated_at
  before update on public.telegram_conversations
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
alter table public.telegram_conversations enable row level security;

-- Staff autenticado: CRUD completo sobre citas
drop policy if exists "appointments_select_authenticated" on public.appointments;
create policy "appointments_select_authenticated"
  on public.appointments for select
  to authenticated
  using (true);

drop policy if exists "appointments_insert_authenticated" on public.appointments;
create policy "appointments_insert_authenticated"
  on public.appointments for insert
  to authenticated
  with check (true);

drop policy if exists "appointments_update_authenticated" on public.appointments;
create policy "appointments_update_authenticated"
  on public.appointments for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "appointments_delete_authenticated" on public.appointments;
create policy "appointments_delete_authenticated"
  on public.appointments for delete
  to authenticated
  using (true);

-- telegram_conversations: solo service_role (sin policies de cliente)

grant all on table public.appointments to postgres, service_role, authenticated;
grant all on table public.telegram_conversations to postgres, service_role;
