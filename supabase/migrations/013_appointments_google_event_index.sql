-- ============================================================
-- 013 · Integridad: google_event_id único + índice de events.user_id
-- ------------------------------------------------------------
-- Índice parcial: varias citas no tienen Google; UNIQUE solo si hay id.
-- events.user_id es FK y no tenía índice.
-- ============================================================

create unique index if not exists appointments_google_event_id_key
  on public.appointments (google_event_id)
  where google_event_id is not null;

create index if not exists events_user_id_idx
  on public.events (user_id);
