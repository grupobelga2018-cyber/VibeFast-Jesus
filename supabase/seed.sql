-- ============================================================
-- seed.sql
-- ------------------------------------------------------------
-- Datos de ejemplo para desarrollo local (`supabase db reset`).
-- NO se corre en producción.
--
-- core_items y profiles dependen de auth.users reales, así que
-- no los sembramos aquí (se llenan al hacer login con Google).
-- Solo sembramos waitlist con un par de correos demo.
-- ============================================================

insert into public.waitlist (email, source)
values
  ('demo1@vibefast.dev', 'seed'),
  ('demo2@vibefast.dev', 'seed')
on conflict (email) do nothing;

-- Citas demo (sin auth.users)
insert into public.appointments (
  client_name, client_phone, service_slug, starts_at, ends_at, channel, status, notes
)
values
  (
    'Mariana Demo',
    '+525512345678',
    'corte',
    now() + interval '1 day',
    now() + interval '1 day' + interval '60 minutes',
    'manual',
    'confirmed',
    'Seed demo'
  ),
  (
    'Sofía Demo',
    null,
    'color',
    now() + interval '2 days',
    now() + interval '2 days' + interval '120 minutes',
    'telegram',
    'pending',
    'Esperando confirmación de Gaby'
  ),
  (
    'Andrea Demo',
    '+525598765432',
    'peinado',
    now() + interval '3 days',
    now() + interval '3 days' + interval '90 minutes',
    'calendly',
    'confirmed',
    null
  );
