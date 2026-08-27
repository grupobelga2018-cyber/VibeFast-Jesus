-- ============================================================
-- 010 · Google Calendar
-- ============================================================

alter table public.appointments
  add column if not exists google_event_id text;

create table if not exists public.google_calendar_auth (
  id text primary key default 'gaby',
  refresh_token text not null,
  email text,
  calendar_id text not null default 'primary',
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_auth enable row level security;

grant all on table public.google_calendar_auth to postgres, service_role;
