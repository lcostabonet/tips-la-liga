-- ============================================================
-- Tips La Liga - Base de datos Supabase
-- Ejecuta este archivo en Supabase → SQL Editor → New query.
-- ============================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- Perfiles públicos de usuarios
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_display_name_unique_lower
on public.profiles (lower(display_name));

-- -----------------------------
-- Propinas
-- -----------------------------
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_original numeric(12,2) not null check (amount_original > 0),
  currency text not null check (currency in ('EUR', 'USD')),
  amount_eur numeric(12,2) not null check (amount_eur >= 0),
  exchange_rate numeric(12,6) not null check (exchange_rate > 0),
  comment text,
  device_created_at timestamptz not null,
  device_timezone text,
  month_key text not null,
  day_key text not null,
  time_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tips_user_id_idx on public.tips(user_id);
create index if not exists tips_month_key_idx on public.tips(month_key);
create index if not exists tips_day_key_idx on public.tips(day_key);

-- -----------------------------
-- Función para detectar admin
-- -----------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'lluis15basket@hotmail.es';
$$;

-- -----------------------------
-- Trigger updated_at
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tips_set_updated_at on public.tips;
create trigger tips_set_updated_at
before update on public.tips
for each row execute function public.set_updated_at();

-- -----------------------------
-- Crear profile automáticamente al registrarse
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------
-- Row Level Security
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.tips enable row level security;

-- Limpiar políticas si ya existen
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "tips_select_authenticated" ON public.tips;
DROP POLICY IF EXISTS "tips_insert_own" ON public.tips;
DROP POLICY IF EXISTS "tips_update_own_or_admin" ON public.tips;
DROP POLICY IF EXISTS "tips_delete_own_or_admin" ON public.tips;

-- Cualquiera puede leer nombres públicos. No se exponen emails.
create policy "profiles_select_all"
on public.profiles
for select
to anon, authenticated
using (true);

-- Permite crear el perfil propio si hiciera falta hacerlo desde cliente.
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- Cada usuario puede cambiar su nombre público. Admin también.
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Usuarios autenticados pueden ver todas las propinas para ranking y detalles.
create policy "tips_select_authenticated"
on public.tips
for select
to authenticated
using (true);

-- Cada usuario solo puede insertar propinas para sí mismo.
create policy "tips_insert_own"
on public.tips
for insert
to authenticated
with check (user_id = auth.uid());

-- Cada usuario edita solo sus propinas. Admin edita todas.
create policy "tips_update_own_or_admin"
on public.tips
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Cada usuario borra solo sus propinas. Admin borra todas.
create policy "tips_delete_own_or_admin"
on public.tips
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Permisos para la API pública protegida por RLS
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tips TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
