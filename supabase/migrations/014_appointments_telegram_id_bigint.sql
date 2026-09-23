-- ============================================================
-- 014 · client_telegram_id text → bigint
-- ------------------------------------------------------------
-- Verificado: no hay valores no numéricos.
-- ============================================================

alter table public.appointments
  alter column client_telegram_id type bigint
  using client_telegram_id::bigint;
