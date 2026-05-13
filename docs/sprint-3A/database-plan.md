# Sprint 3A Database Plan: Campos de pago externo

## Cambios en `driver_payment_profiles`

Añadir 3 columnas nuevas. No se elimina ninguna columna existente. Los campos de Stripe quedan intactos.

```sql
alter table public.driver_payment_profiles
  add column if not exists payment_provider    text,
  add column if not exists payment_url         text,
  add column if not exists payment_instructions text;
```

### Descripción de los campos

| Campo | Tipo | Valores | Ejemplo |
|---|---|---|---|
| `payment_provider` | `text` nullable | `'paypal'`, `null` (futuro: `'bizum'`, `'revolut'`, `'stripe'`) | `'paypal'` |
| `payment_url` | `text` nullable | URL completa del enlace de pago externo | `'https://paypal.me/martag'` |
| `payment_instructions` | `text` nullable | Texto libre mostrado al cliente (max recomendado: 200 chars) | `'Pon tu nombre en el concepto'` |

**No hay `payment_provider` CHECK constraint** en Sprint 3A para facilitar la adición de proveedores futuros. Se puede añadir en Sprint 3B cuando el catálogo esté estabilizado.

---

## Actualización de la vista pública `public_driver_profiles`

La vista debe exponer los 3 campos nuevos porque el cliente necesita verlos para realizar el pago. Son datos públicos (el enlace de PayPal de un conductor no es sensible — es el mismo que el conductor compartiría manualmente).

```sql
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
```

Los campos Stripe (`stripe_account_id`, `driver_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`) siguen excluidos de la vista.

---

## RLS y trigger `guard_stripe_fields`

Los campos `payment_provider`, `payment_url`, `payment_instructions` **no están en la lista de campos protegidos** del trigger `guard_stripe_fields`. Un conductor autenticado puede actualizarlos directamente via `dpp_conductor_update_own` (Sprint 3B implementará el panel de conductor autónomo). El admin también puede actualizarlos via `dpp_admin_update_all`.

No es necesario modificar `guard_stripe_fields`.

---

## Datos de prueba

```sql
update public.driver_payment_profiles
set
  payment_provider = 'paypal',
  payment_url = 'https://paypal.me/username_test',
  payment_instructions = 'Pon tu nombre en el concepto'
where display_name = 'Marta G.';
```

Sustituir `username_test` por un usuario de PayPal.me real o ficticio para pruebas. PayPal.me acepta cualquier slug — la URL simplemente no procesará nada si no existe la cuenta, pero el QR y el botón se mostrarán correctamente.

---

## Verificación post-migración

```sql
-- Confirmar columnas nuevas en la tabla
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'driver_payment_profiles'
  and table_schema = 'public'
  and column_name in ('payment_provider', 'payment_url', 'payment_instructions');
-- Esperado: 3 filas, data_type text, is_nullable YES

-- Confirmar que la vista expone los campos nuevos
select column_name
from information_schema.columns
where table_name = 'public_driver_profiles'
  and table_schema = 'public';
-- Esperado: 11 columnas, incluyendo payment_provider, payment_url, payment_instructions

-- Confirmar que stripe_account_id NO está en la vista
select column_name
from information_schema.columns
where table_name = 'public_driver_profiles'
  and table_schema = 'public'
  and column_name = 'stripe_account_id';
-- Esperado: 0 filas
```

---

## SQL completo para ejecutar en Supabase SQL Editor

```sql
-- 1. Añadir columnas
alter table public.driver_payment_profiles
  add column if not exists payment_provider     text,
  add column if not exists payment_url          text,
  add column if not exists payment_instructions text;

-- 2. Recrear vista pública con los campos nuevos
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

-- 3. Re-confirmar grants (la vista se recrea, hay que re-conceder)
grant select on public.public_driver_profiles to anon;
grant select on public.public_driver_profiles to authenticated;

-- 4. Insertar dato de prueba (ajustar el display_name al conductor de prueba)
update public.driver_payment_profiles
set
  payment_provider = 'paypal',
  payment_url = 'https://paypal.me/username_test',
  payment_instructions = 'Pon tu nombre en el concepto'
where display_name ilike '%Marta%';
```
