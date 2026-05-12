# Sprint 2B Plan: Base de datos Supabase para perfiles de pago de conductores

## Objetivo del sprint
Crear la tabla `driver_payment_profiles` en Supabase con sus políticas RLS y una vista pública segura, de forma que el frontend pueda consultar conductores activos sin exponer datos sensibles de Stripe.

## Contexto
- Sprint 2 diseñó la arquitectura completa (tablas, Edge Functions, Stripe Connect).
- Sprint 2A validó el flujo visual con datos mock (`MOCK_DRIVERS` en `app.js`).
- Sprint 2B es el primer paso de backend real: crear la estructura SQL sin integrar Stripe todavía.
- Sprint 2C (siguiente) conectará Edge Functions y Stripe Connect.

## Alcance

### Incluye
- Tabla `driver_payment_profiles` en Supabase.
- Vista pública segura `public_driver_profiles` (solo campos no sensibles).
- Políticas RLS para conductor, admin y cliente anónimo.
- Datos de prueba manuales (3–4 filas) para validar que el frontend puede leer la vista.
- Migración SQL lista para ejecutar en Supabase SQL Editor.

### Excluye explícitamente
- Tabla `external_tip_payments` (fase posterior, según Sprint 2).
- Integración con Stripe (real ni test mode).
- Edge Functions.
- Modificaciones en `app.js`, `index.html` ni `style.css`.
- Claves secretas de ningún tipo.
- `stripe_account_id` nunca expuesto en la vista pública.

## Tabla: `driver_payment_profiles`

```sql
create table public.driver_payment_profiles (
  id                 uuid primary key default gen_random_uuid(),
  driver_id          uuid references auth.users(id) on delete cascade not null unique,
  display_name       text not null,
  vehicle_info       text,
  route_info         text,
  stripe_account_id  text,                        -- NUNCA exponer en vistas públicas
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

## Vista pública: `public_driver_profiles`

```sql
create view public.public_driver_profiles as
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

La vista excluye: `driver_id`, `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`, `created_at`, `updated_at`.

## Políticas RLS

Ver detalle completo en `docs/sprint-2B/rls-plan.md`.

Resumen:
- Lectura de la tabla completa: solo conductor propio y admin.
- Lectura de la vista pública: anónimos y usuarios autenticados.
- Inserción: solo el conductor para su propio perfil.
- Actualización: conductor propio y admin.
- Borrado: solo admin.

## Datos de prueba

```sql
insert into public.driver_payment_profiles
  (driver_id, display_name, vehicle_info, route_info, tip_link_slug, is_active, is_visible)
values
  ('<uuid-usuario-1>', 'Marta G.',  'Bus 🚌', 'Ruta aeropuerto',  'marta-g',  true, true),
  ('<uuid-usuario-2>', 'Jordi P.',  'Van 🚐', 'Ruta hotel',       'jordi-p',  true, true),
  ('<uuid-usuario-3>', 'Sandra R.', 'Bus 🚍', 'Ruta ciudad',      'sandra-r', true, true),
  ('<uuid-usuario-4>', 'Toni V.',   'Bus 🚎', 'Ruta norte',       'toni-v',   true, false);
-- Toni V. con is_visible = false para probar que la vista lo excluye
```

Los `<uuid-usuario-N>` deben ser UUIDs reales de `auth.users` del proyecto Supabase.

## Criterios de aceptación

- [ ] La tabla `driver_payment_profiles` se crea sin errores en Supabase.
- [ ] La vista `public_driver_profiles` devuelve solo conductores `is_active = true` y `is_visible = true`.
- [ ] La vista no expone `stripe_account_id`, `driver_id` ni campos sensibles.
- [ ] Un usuario anónimo puede leer la vista; no puede leer la tabla directamente.
- [ ] Un conductor puede leer y actualizar solo su propio registro.
- [ ] Un admin puede leer y actualizar cualquier registro.
- [ ] Los datos de prueba se insertan y la vista devuelve 3 filas (Toni V. excluido por `is_visible = false`).
- [ ] `app.js`, `index.html` y `style.css` no han sido modificados.

## Archivos entregados

- `docs/sprint-2B/plan.md` (este archivo)
- `docs/sprint-2B/handoff-dev.md`
- `docs/sprint-2B/checklist.md`
- `docs/sprint-2B/rls-plan.md`

## Siguiente paso (Sprint 2C)

Conectar `app.js` para leer `public_driver_profiles` desde Supabase y reemplazar `MOCK_DRIVERS` con datos reales. Después, crear Edge Functions para Stripe Connect onboarding y sesiones de pago.
