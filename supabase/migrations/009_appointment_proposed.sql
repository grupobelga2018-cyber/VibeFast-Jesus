-- ============================================================
-- 009 · Horario propuesto (reprogramar espera a Gaby)
-- ============================================================

alter table public.appointments
  add column if not exists proposed_starts_at timestamptz;
