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
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================
-- Sprint 2B: Perfiles de pago de conductores
-- ============================================================

-- -----------------------------
-- Tabla driver_payment_profiles
-- stripe_account_id NUNCA debe exponerse en vistas públicas ni
-- devolverse al frontend. Solo Edge Functions con service_role
-- pueden leerlo o escribirlo.
-- onboarding_url NO se persiste aquí: se genera bajo demanda
-- mediante Edge Function y expira; no tiene sentido almacenarlo.
-- -----------------------------
create table if not exists public.driver_payment_profiles (
  id                uuid        primary key default gen_random_uuid(),
  driver_id         uuid        not null unique references auth.users(id) on delete cascade,
  display_name      text        not null,
  vehicle_info      text,
  route_info        text,
  stripe_account_id text,
  stripe_status     text        not null default 'not_connected',
  payouts_enabled   boolean     not null default false,
  charges_enabled   boolean     not null default false,
  tip_link_slug     text        unique,
  public_url        text,
  is_active         boolean     not null default true,
  is_visible        boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists driver_payment_profiles_driver_id_idx
  on public.driver_payment_profiles(driver_id);

drop trigger if exists driver_payment_profiles_set_updated_at
  on public.driver_payment_profiles;
create trigger driver_payment_profiles_set_updated_at
  before update on public.driver_payment_profiles
  for each row execute function public.set_updated_at();

-- -----------------------------
-- Vista pública segura
-- security_invoker = false (default): la vista corre como su
-- owner (postgres/superuser), que bypassa RLS en la tabla.
-- El filtro WHERE y la lista de columnas son la barrera de
-- seguridad: stripe_account_id y driver_id nunca se exponen.
-- -----------------------------
drop view if exists public.public_driver_profiles;
create view public.public_driver_profiles
  with (security_invoker = false)
as
  select
    id,
    display_name,
    vehicle_info,
    route_info,
    tip_link_slug,
    public_url,
    is_active,
    is_visible
  from public.driver_payment_profiles
  where is_active  = true
    and is_visible = true;

-- -----------------------------
-- RLS: driver_payment_profiles
-- -----------------------------
alter table public.driver_payment_profiles enable row level security;

drop policy if exists "dpp_conductor_read_own"  on public.driver_payment_profiles;
drop policy if exists "dpp_admin_read_all"       on public.driver_payment_profiles;
drop policy if exists "dpp_conductor_insert_own" on public.driver_payment_profiles;
drop policy if exists "dpp_conductor_update_own" on public.driver_payment_profiles;
drop policy if exists "dpp_admin_update_all"     on public.driver_payment_profiles;
drop policy if exists "dpp_admin_delete_all"     on public.driver_payment_profiles;

-- Conductor: leer su propio perfil completo (incluye stripe_status)
create policy "dpp_conductor_read_own"
  on public.driver_payment_profiles
  for select
  to authenticated
  using (driver_id = auth.uid());

-- Admin: leer todos los perfiles (incluye stripe_account_id)
create policy "dpp_admin_read_all"
  on public.driver_payment_profiles
  for select
  to authenticated
  using (public.is_admin());

-- Conductor: crear su propio perfil (driver_id debe ser el suyo)
create policy "dpp_conductor_insert_own"
  on public.driver_payment_profiles
  for insert
  to authenticated
  with check (driver_id = auth.uid());

-- Conductor: actualizar campos propios
-- Los campos Stripe solo los actualiza la Edge Function con service_role
create policy "dpp_conductor_update_own"
  on public.driver_payment_profiles
  for update
  to authenticated
  using  (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Admin: actualizar cualquier perfil
create policy "dpp_admin_update_all"
  on public.driver_payment_profiles
  for update
  to authenticated
  using (public.is_admin());

-- Admin: único rol que puede borrar perfiles
create policy "dpp_admin_delete_all"
  on public.driver_payment_profiles
  for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------
-- Protección de campos Stripe (RIESGO-01)
-- Un conductor autenticado puede actualizar solo:
--   display_name, vehicle_info, route_info, tip_link_slug, public_url, is_visible
-- Campos protegidos (solo Edge Functions con service_role o admin):
--   stripe_account_id, stripe_status, payouts_enabled, charges_enabled, is_active
-- El trigger se salta para 'postgres' y 'service_role' (Edge Functions Sprint 2C).
-- -----------------------------
create or replace function public.guard_stripe_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Superusuario y service_role tienen acceso total (Edge Functions en Sprint 2C)
  if current_role in ('postgres', 'service_role') then
    return new;
  end if;

  -- Admin tiene acceso total
  if public.is_admin() then
    return new;
  end if;

  -- Bloquear cambios en campos sensibles para cualquier otro usuario autenticado
  if (new.stripe_account_id is distinct from old.stripe_account_id)
  or (new.stripe_status    is distinct from old.stripe_status)
  or (new.payouts_enabled  is distinct from old.payouts_enabled)
  or (new.charges_enabled  is distinct from old.charges_enabled)
  or (new.is_active        is distinct from old.is_active)
  then
    raise exception
      'No autorizado: stripe_account_id, stripe_status, payouts_enabled, '
      'charges_enabled e is_active solo pueden actualizarse mediante '
      'Edge Functions con service_role.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_stripe_fields_trigger on public.driver_payment_profiles;
create trigger guard_stripe_fields_trigger
  before update on public.driver_payment_profiles
  for each row execute function public.guard_stripe_fields();

-- -----------------------------
-- Grants
-- -----------------------------
grant select on public.public_driver_profiles to anon, authenticated;
grant select, insert, update on public.driver_payment_profiles to authenticated;

-- ============================================================
-- Sprint 3A: Enlace de pago externo por conductor (PayPal)
-- ============================================================

-- Columnas de pago externo. Coexisten con los campos de Stripe Connect
-- (aparcado). stripe_account_id y campos relacionados se mantienen intactos.
alter table public.driver_payment_profiles
  add column if not exists payment_provider     text,
  add column if not exists payment_url          text,
  add column if not exists payment_instructions text;

-- Recrear vista pública con los nuevos campos.
-- payment_url y payment_provider son datos públicos (el cliente los necesita
-- para pagar). Stripe y driver_id siguen excluidos.
drop view if exists public.public_driver_profiles;
create view public.public_driver_profiles
  with (security_invoker = false)
as
  select
    id,
    display_name,
    vehicle_info,
    route_info,
    tip_link_slug,
    public_url,
    is_active,
    is_visible,
    payment_provider,
    payment_url,
    payment_instructions
  from public.driver_payment_profiles
  where is_active  = true
    and is_visible = true;

grant select on public.public_driver_profiles to anon;
grant select on public.public_driver_profiles to authenticated;

-- Constraint: si payment_provider = 'paypal', payment_url debe ser de dominio PayPal.
-- Permite: provider NULL, provider distinto de paypal, paypal con URL null o URL PayPal válida.
-- No restringe proveedores futuros (bizum, revolut, etc.).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_url_provider_match'
      and conrelid = 'public.driver_payment_profiles'::regclass
  ) then
    alter table public.driver_payment_profiles
      add constraint payment_url_provider_match
      check (
        payment_provider is null
        or payment_provider <> 'paypal'
        or payment_url is null
        or payment_url like 'https://paypal.me/%'
        or payment_url like 'https://www.paypal.me/%'
        or payment_url like 'https://paypal.com/%'
        or payment_url like 'https://www.paypal.com/%'
      );
  end if;
end;
$$;
