-- ПокеАкадемия: облачные профили. Выполнить один раз в Supabase → SQL Editor → Run.
-- Таблица закрыта (RLS без политик); сайт работает с ней только через функции ниже.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pa_users (
  nick       text primary key check (char_length(nick) between 2 and 24),
  pass_hash  text not null,
  token      uuid not null default gen_random_uuid(),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pa_users_nick_lower on public.pa_users (lower(nick));
create unique index if not exists pa_users_token on public.pa_users (token);
alter table public.pa_users enable row level security;

-- Регистрация: возвращает токен сессии
create or replace function public.pa_register(p_nick text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare t uuid; n text := btrim(p_nick);
begin
  if char_length(n) < 2 or char_length(n) > 24 then raise exception 'Ник должен быть от 2 до 24 символов'; end if;
  if char_length(p_pass) < 4 then raise exception 'Пароль должен быть не короче 4 символов'; end if;
  if exists (select 1 from pa_users where lower(nick) = lower(n)) then raise exception 'Такой ник уже занят'; end if;
  insert into pa_users (nick, pass_hash) values (n, crypt(p_pass, gen_salt('bf'))) returning token into t;
  return json_build_object('nick', n, 'token', t);
end $$;

-- Вход: возвращает тот же токен (работает на нескольких устройствах сразу)
create or replace function public.pa_login(p_nick text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r pa_users;
begin
  select * into r from pa_users where lower(nick) = lower(btrim(p_nick));
  if not found or r.pass_hash <> crypt(p_pass, r.pass_hash) then raise exception 'Неверный ник или пароль'; end if;
  return json_build_object('nick', r.nick, 'token', r.token);
end $$;

create or replace function public.pa_load(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r pa_users;
begin
  select * into r from pa_users where token = p_token;
  if not found then raise exception 'Сессия устарела, войди заново'; end if;
  return json_build_object('nick', r.nick, 'data', r.data);
end $$;

create or replace function public.pa_save(p_token uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if octet_length(p_data::text) > 1000000 then raise exception 'Слишком большой прогресс'; end if;
  update pa_users set data = p_data, updated_at = now() where token = p_token;
  if not found then raise exception 'Сессия устарела, войди заново'; end if;
end $$;

-- Таблица лидеров: изучено покемонов и правильных ответов
create or replace function public.pa_leaderboard()
returns table (nick text, caught int, correct int, learned int, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.nick,
         coalesce(jsonb_array_length(u.data->'caught'), 0),
         coalesce((select sum((v->>'correct')::int) from jsonb_each(coalesce(u.data->'quiz', '{}'::jsonb)) q(k, v)), 0)::int,
         coalesce((select count(*) from jsonb_each(coalesce(u.data->'items', '{}'::jsonb)) qz(k, v),
                   jsonb_each(qz.v) it(k2, v2) where (v2->>'s')::int >= 2), 0)::int,
         u.updated_at
  from pa_users u
  order by 2 desc, 3 desc
  limit 100
$$;

revoke all on function public.pa_register, public.pa_login, public.pa_load, public.pa_save, public.pa_leaderboard from public;
grant execute on function public.pa_register, public.pa_login, public.pa_load, public.pa_save, public.pa_leaderboard to anon, authenticated;
