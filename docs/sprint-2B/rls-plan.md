# Sprint 2B RLS Plan: driver_payment_profiles

## Principios de seguridad

1. `stripe_account_id` nunca se expone a ningún rol no privilegiado.
2. La vista pública `public_driver_profiles` es el único canal de lectura para clientes anónimos.
3. Un conductor solo puede gestionar su propio perfil (`driver_id = auth.uid()`).
4. El admin se identifica por email (`auth.jwt() ->> 'email' = ADMIN_EMAIL`).
5. RLS activo en `driver_payment_profiles`; la vista hereda las restricciones.

---

## Paso 1: Habilitar RLS

```sql
alter table public.driver_payment_profiles enable row level security;
```

---

## Paso 2: Políticas de lectura

### Política 1 — Conductor lee su propio perfil

```sql
create policy "conductor_read_own"
  on public.driver_payment_profiles
  for select
  using (driver_id = auth.uid());
```

### Política 2 — Admin lee todos los perfiles

```sql
create policy "admin_read_all"
  on public.driver_payment_profiles
  for select
  using (
    (auth.jwt() ->> 'email') = current_setting('app.admin_email', true)
  );
```

> **Nota de implementación:** `current_setting('app.admin_email', true)` requiere definir el setting en Supabase. Alternativa más simple para este proyecto: comparar directamente con el email hardcodeado, o usar una función helper. Ver sección "Alternativa simplificada" más abajo.

### Política 3 — Vista pública (anónimos y autenticados)

La vista `public_driver_profiles` ya filtra por `is_active` e `is_visible`. Para que un usuario anónimo pueda leerla sin acceder a la tabla completa, se usa `security definer` en la vista:

```sql
create or replace view public.public_driver_profiles
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
```

Conceder permiso de lectura de la vista al rol anónimo:

```sql
grant select on public.public_driver_profiles to anon;
grant select on public.public_driver_profiles to authenticated;
```

---

## Paso 3: Política de inserción

### Política 4 — Conductor inserta su propio perfil

```sql
create policy "conductor_insert_own"
  on public.driver_payment_profiles
  for insert
  with check (driver_id = auth.uid());
```

Un conductor solo puede crear un perfil con su propio `driver_id`. La restricción `unique` en `driver_id` evita duplicados.

---

## Paso 4: Políticas de actualización

### Política 5 — Conductor actualiza su propio perfil

```sql
create policy "conductor_update_own"
  on public.driver_payment_profiles
  for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());
```

Campos que el conductor puede actualizar: `display_name`, `vehicle_info`, `route_info`, `is_visible`. Los campos de Stripe (`stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`) solo deben actualizarse desde Edge Functions con `service_role`.

### Política 6 — Admin actualiza cualquier perfil

```sql
create policy "admin_update_all"
  on public.driver_payment_profiles
  for update
  using (
    (auth.jwt() ->> 'email') = current_setting('app.admin_email', true)
  );
```

---

## Paso 5: Política de borrado

### Política 7 — Solo admin puede borrar

```sql
create policy "admin_delete_all"
  on public.driver_payment_profiles
  for delete
  using (
    (auth.jwt() ->> 'email') = current_setting('app.admin_email', true)
  );
```

Un conductor no puede borrar su propio perfil directamente; debe solicitarlo al admin.

---

## Alternativa simplificada para admin (sin `current_setting`)

Si no se configura `app.admin_email` en Supabase, usar la función helper de `profiles`:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and display_name = 'Admin'  -- o usar un campo 'role' en profiles
  );
$$;
```

Y sustituir `current_setting(...)` por `public.is_admin()` en todas las políticas de admin.

> Para este proyecto se recomienda añadir una columna `role text default 'driver'` a la tabla `profiles` existente, con valores `'driver'` y `'admin'`, y usarla como fuente de verdad para la función `is_admin()`.

---

## Resumen de políticas

| Política | Operación | Quién |
|---|---|---|
| `conductor_read_own` | SELECT tabla | Conductor (propio `driver_id`) |
| `admin_read_all` | SELECT tabla | Admin |
| Vista `public_driver_profiles` | SELECT vista | Anónimo + autenticado |
| `conductor_insert_own` | INSERT | Conductor (propio `driver_id`) |
| `conductor_update_own` | UPDATE | Conductor (propio `driver_id`) |
| `admin_update_all` | UPDATE | Admin |
| `admin_delete_all` | DELETE | Admin |

## Campos nunca expuestos al anónimo

- `driver_id`
- `stripe_account_id`
- `stripe_status`
- `payouts_enabled`
- `charges_enabled`
- `created_at` / `updated_at`

## Prueba de las políticas

```sql
-- Como anónimo: debe devolver filas (solo campos públicos)
select * from public.public_driver_profiles;

-- Como anónimo: debe fallar con RLS violation
select * from public.driver_payment_profiles;

-- Como conductor autenticado (su propio UUID):
select * from public.driver_payment_profiles where driver_id = auth.uid();

-- Como conductor: intentar leer otro perfil → 0 filas
select * from public.driver_payment_profiles where driver_id != auth.uid();
```
