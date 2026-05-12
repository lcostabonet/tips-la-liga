# Sprint 2B Dev Summary

## Qué se implementó
Estructura SQL para perfiles de pago de conductores en `supabase.sql`. Sin cambios en frontend (`app.js`, `index.html`, `style.css`). Sin Stripe. Sin Edge Functions.

## Archivo modificado

### supabase.sql
Bloque nuevo añadido al final del archivo (tras los grants existentes de Sprint 1).

---

## Cambios en detalle

### 1. Grant adicional en `is_admin()` para `anon`
```sql
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
```
**Por qué:** las políticas RLS de `driver_payment_profiles` usan `public.is_admin()`. Cuando un usuario anónimo intenta acceder a la tabla (y debería ser bloqueado), PostgreSQL evalúa las políticas y necesita ejecutar la función. Sin este grant la evaluación fallaría con un error de permisos en lugar de devolver 0 filas limpiamente.

---

### 2. Tabla `driver_payment_profiles`

15 campos según `docs/sprint-2/database-plan.md`:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `driver_id` | `uuid` | FK `auth.users(id)`, `not null`, `unique`, cascade delete |
| `display_name` | `text` | `not null` |
| `vehicle_info` | `text` | nullable |
| `route_info` | `text` | nullable |
| `stripe_account_id` | `text` | nullable — nunca exponer en vista pública |
| `stripe_status` | `text` | default `'not_connected'` |
| `payouts_enabled` | `boolean` | default `false` |
| `charges_enabled` | `boolean` | default `false` |
| `tip_link_slug` | `text` | `unique`, para QR público |
| `public_url` | `text` | nullable |
| `is_active` | `boolean` | default `true` |
| `is_visible` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, mantenido por trigger |

**`onboarding_url` NO incluida:** según `database-plan.md`, se genera bajo demanda con Edge Function y no debe persistirse.

---

### 3. Índice y trigger `updated_at`
- Índice en `driver_id` para performance en consultas RLS.
- Trigger `driver_payment_profiles_set_updated_at` reutiliza la función `set_updated_at()` ya existente en el archivo.

---

### 4. Vista pública `public_driver_profiles`

```sql
create view public.public_driver_profiles
  with (security_invoker = false)
as
  select id, display_name, vehicle_info, route_info,
         tip_link_slug, public_url, is_active, is_visible
  from public.driver_payment_profiles
  where is_active = true and is_visible = true;
```

**Campos expuestos (8):** `id`, `display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_active`, `is_visible`.

**Campos nunca expuestos:** `driver_id`, `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`, `created_at`, `updated_at`.

**Por qué `security_invoker = false`:** la vista corre como su owner (`postgres`, superuser), que bypassa RLS en la tabla subyacente. El filtro `WHERE` y la lista de columnas son la única barrera de seguridad necesaria. Permite que `anon` lea la vista sin necesitar políticas de lectura adicionales en la tabla.

---

### 5. RLS: 6 políticas con prefijo `dpp_`

Prefijo `dpp_` para evitar colisiones de nombres con políticas existentes (`profiles_*`, `tips_*`).

| Política | Op | Rol | Condición |
|---|---|---|---|
| `dpp_conductor_read_own` | SELECT | `authenticated` | `driver_id = auth.uid()` |
| `dpp_admin_read_all` | SELECT | `authenticated` | `public.is_admin()` |
| `dpp_conductor_insert_own` | INSERT | `authenticated` | `driver_id = auth.uid()` |
| `dpp_conductor_update_own` | UPDATE | `authenticated` | `driver_id = auth.uid()` |
| `dpp_admin_update_all` | UPDATE | `authenticated` | `public.is_admin()` |
| `dpp_admin_delete_all` | DELETE | `authenticated` | `public.is_admin()` |

**`public.is_admin()`** reutilizada del archivo existente (comprueba el email del JWT). No redefinida.

**No hay política DELETE para conductor:** un conductor no puede borrar su propio perfil. Solo el admin puede hacerlo.

---

### 6. Grants finales

```sql
grant select on public.public_driver_profiles to anon, authenticated;
grant select, insert, update on public.driver_payment_profiles to authenticated;
```

No se otorga `delete` en la tabla a `authenticated`: el borrado solo llega al DELETE policy del admin a través de RLS.

---

## Decisiones técnicas

- **`create table if not exists`**: idempotente, coherente con el resto del archivo.
- **`drop view if exists` antes de `create view`**: las vistas no admiten `create or replace` con cambio de columnas en PostgreSQL; el drop+create es la forma segura.
- **`drop policy if exists` antes de cada `create policy`**: mismo patrón que Sprint 1 en el archivo.
- **Sin `external_tip_payments`**: excluida del alcance de Sprint 2B según `docs/sprint-2/plan.md`.

---

## Corrección post-QA: RIESGO-01 (2026-05-12)

**Problema:** La política `dpp_conductor_update_own` permitía al conductor actualizar todas las columnas de su perfil, incluyendo `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled` e `is_active`.

**Solución implementada:** BEFORE UPDATE trigger `guard_stripe_fields_trigger` sobre `driver_payment_profiles`.

### Por qué un trigger y no revocar UPDATE

- **Transparente al frontend**: no cambia la forma en que el cliente llama a updates.
- **Compatible con Edge Functions**: cuando Sprint 2C ejecute updates con `service_role` (`current_role = 'service_role'`), el trigger lo detecta y permite todos los campos sin restricción.
- **Enforced a nivel DB**: ningún cliente SQL puede saltárselo.

### Campos protegidos (solo admin o service_role)

| Campo | Motivo |
|---|---|
| `stripe_account_id` | Identificador de cuenta Stripe; fraude si se falsifica |
| `stripe_status` | Estado de Stripe; debe reflejar la realidad de la API |
| `payouts_enabled` | Flag de capacidad de cobro; solo Stripe decide |
| `charges_enabled` | Flag de capacidad de cargos; solo Stripe decide |
| `is_active` | Activación/desactivación de cuenta; acción de admin |

### Campos permitidos para conductor autenticado

`display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_visible`.

`is_visible` está permitido porque es un toggle de auto-visibilidad (el conductor puede ocultarse de la lista pública). `is_active` en cambio es una acción administrativa.

### Lógica del trigger

```
current_role = 'postgres' o 'service_role' → permitir todo (Edge Functions)
is_admin() = true                           → permitir todo (admin)
cualquier otro usuario autenticado          → bloquear cambios en campos protegidos
                                              con RAISE EXCEPTION
```

### SQL añadido

```sql
create or replace function public.guard_stripe_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if current_role in ('postgres', 'service_role') then return new; end if;
  if public.is_admin() then return new; end if;
  if (new.stripe_account_id is distinct from old.stripe_account_id)
  or (new.stripe_status    is distinct from old.stripe_status)
  or (new.payouts_enabled  is distinct from old.payouts_enabled)
  or (new.charges_enabled  is distinct from old.charges_enabled)
  or (new.is_active        is distinct from old.is_active)
  then
    raise exception 'No autorizado: campos Stripe e is_active solo via service_role.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_stripe_fields_trigger on public.driver_payment_profiles;
create trigger guard_stripe_fields_trigger
  before update on public.driver_payment_profiles
  for each row execute function public.guard_stripe_fields();
```

---

## Siguiente paso (Sprint 2C)
Reemplazar `MOCK_DRIVERS` en `app.js` con una consulta a `public_driver_profiles` vía Supabase client, y crear las Edge Functions para Stripe Connect onboarding y sesiones de pago. Las Edge Functions usarán `service_role`, que el trigger `guard_stripe_fields_trigger` reconoce y permite actualizar todos los campos.
