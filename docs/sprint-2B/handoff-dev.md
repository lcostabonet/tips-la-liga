# Sprint 2B Handoff Dev: Base de datos para perfiles de conductores

## Contexto
Sprint 2A validó visualmente el flujo "Dar propina" con datos mock. Sprint 2B crea la estructura SQL real en Supabase. Sin Stripe, sin Edge Functions, sin cambios en el frontend.

## Qué implementar

### 1. Abrir Supabase SQL Editor

En el dashboard del proyecto: **SQL Editor → New query**.

Ejecutar el siguiente SQL en orden. Cada bloque es independiente y puede ejecutarse por separado si hay errores.

---

### 2. Crear la tabla `driver_payment_profiles`

```sql
create table public.driver_payment_profiles (
  id                 uuid primary key default gen_random_uuid(),
  driver_id          uuid references auth.users(id) on delete cascade not null unique,
  display_name       text not null,
  vehicle_info       text,
  route_info         text,
  stripe_account_id  text,
  stripe_status      text default 'not_connected',
  payouts_enabled    boolean default false,
  charges_enabled    boolean default false,
  tip_link_slug      text unique,
  public_url         text,
  is_active          boolean default true,
  is_visible         boolean default true,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
```

---

### 3. Crear la vista pública segura

```sql
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
  where is_active = true
    and is_visible = true;

grant select on public.public_driver_profiles to anon;
grant select on public.public_driver_profiles to authenticated;
```

---

### 4. Habilitar RLS y crear políticas

```sql
-- Habilitar RLS
alter table public.driver_payment_profiles enable row level security;

-- Conductor: leer su propio perfil
create policy "conductor_read_own"
  on public.driver_payment_profiles for select
  using (driver_id = auth.uid());

-- Conductor: insertar su propio perfil
create policy "conductor_insert_own"
  on public.driver_payment_profiles for insert
  with check (driver_id = auth.uid());

-- Conductor: actualizar su propio perfil
create policy "conductor_update_own"
  on public.driver_payment_profiles for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Admin: leer todos
create policy "admin_read_all"
  on public.driver_payment_profiles for select
  using (public.is_admin());

-- Admin: actualizar cualquier perfil
create policy "admin_update_all"
  on public.driver_payment_profiles for update
  using (public.is_admin());

-- Admin: borrar cualquier perfil
create policy "admin_delete_all"
  on public.driver_payment_profiles for delete
  using (public.is_admin());
```

---

### 5. Crear función helper `is_admin()`

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select (auth.jwt() ->> 'email') = 'lluis15basket@hotmail.es';
$$;
```

> Sustituir el email por el `ADMIN_EMAIL` real del proyecto si es diferente. Esta función es `security definer` para que pueda consultarse desde las políticas RLS.

---

### 6. Insertar datos de prueba

Obtener los UUIDs de usuarios reales desde **Authentication → Users** en el dashboard de Supabase y sustituirlos en el SQL:

```sql
insert into public.driver_payment_profiles
  (driver_id, display_name, vehicle_info, route_info, tip_link_slug, is_active, is_visible)
values
  ('<uuid-conductor-1>', 'Marta G.',  'Bus 🚌', 'Ruta aeropuerto', 'marta-g',  true, true),
  ('<uuid-conductor-2>', 'Jordi P.',  'Van 🚐', 'Ruta hotel',      'jordi-p',  true, true),
  ('<uuid-conductor-3>', 'Sandra R.', 'Bus 🚍', 'Ruta ciudad',     'sandra-r', true, true),
  ('<uuid-conductor-4>', 'Toni V.',   'Bus 🚎', 'Ruta norte',      'toni-v',   true, false);
-- Toni V. con is_visible = false para probar filtro de la vista
```

---

### 7. Verificar que todo funciona

```sql
-- Debe devolver 3 filas (Toni V. excluido por is_visible = false)
select * from public.public_driver_profiles;

-- Debe devolver 4 filas (acceso directo, desde SQL Editor con service_role)
select id, display_name, stripe_status, is_visible
from public.driver_payment_profiles;

-- La vista NO debe incluir stripe_account_id
-- Si este select falla con "column does not exist", es correcto:
select stripe_account_id from public.public_driver_profiles;
```

---

## Restricciones importantes

| Prohibido | Motivo |
|---|---|
| Exponer `stripe_account_id` en la vista | Dato sensible de Stripe |
| Usar `service_role` key en frontend | Solo para Edge Functions o backend |
| Modificar `app.js`, `index.html`, `style.css` | Fuera de alcance Sprint 2B |
| Crear Edge Functions | Sprint 2C |
| Integrar Stripe real | Sprint 2C |

## Archivos a NO modificar

- `app.js`
- `index.html`
- `style.css`
- `supabase.sql` (archivo de documentación, no el SQL de producción)

## Qué actualizar tras ejecutar el SQL

- `docs/sprint-2B/checklist.md` — marcar ítems completados.
- Anotar en `docs/sprint-2B/dev-summary.md` (a crear) cualquier decisión tomada durante la implementación.
