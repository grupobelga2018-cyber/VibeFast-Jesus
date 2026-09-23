-- ============================================================
-- 011 · Endurecer search_path (PASO 1 seguridad)
-- ------------------------------------------------------------
-- No se tocan políticas de appointments: el dashboard las usa
-- con la anon key + sesión authenticated.
-- No se tocan google_calendar_auth ni telegram_conversations.
-- waitlist_insert_public se deja igual.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

alter function public.set_updated_at() set search_path = '';
