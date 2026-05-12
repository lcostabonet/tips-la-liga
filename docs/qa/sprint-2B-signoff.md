# QA Sign-off: Sprint 2B — Base de datos para perfiles de conductores

**Fecha:** 2026-05-12
**Revisión:** estática (análisis de `supabase.sql`, `docs/sprint-2B/plan.md`, `docs/sprint-2B/dev-summary.md`, `docs/sprint-2B/rls-plan.md`)
**Método adicional:** `git diff HEAD -- app.js index.html style.css` (sin output = sin cambios)

---

## Pruebas realizadas

| # | Prueba | Método |
|---|---|---|
| 1 | Tabla `driver_payment_profiles` correctamente definida | Lectura SQL, contraste con `database-plan.md` |
| 2 | `onboarding_url` no persistida | Grep + lectura de columnas |
| 3 | `external_tip_payments` no existe | Grep en archivo completo |
| 4 | RLS activo en `driver_payment_profiles` | Lectura línea 242 |
| 5 | Políticas de conductor (read/insert/update) | Lectura y análisis lógico de `dpp_conductor_*` |
| 6 | Políticas de admin (read/update/delete) | Lectura y análisis lógico de `dpp_admin_*` |
| 7 | Vista no expone `stripe_account_id` | Contraste SELECT list vs columnas tabla |
| 8 | Vista solo expone campos públicos seguros | Revisión de los 8 campos expuestos |
| 9 | `security_invoker = false` justificado y seguro | Análisis del modelo de seguridad de la vista |
| 10 | `GRANT EXECUTE TO anon` no genera riesgo innecesario | Análisis función + alcance de políticas |
| 11 | Sin claves secretas | Grep `STRIPE_SECRET`, `service_role`, API keys |
| 12 | Frontend no modificado | `git diff HEAD -- app.js index.html style.css` |
| 13 | Sin Stripe real ni Edge Functions | Grep + lectura completa del bloque Sprint 2B |

---

## Checks aprobados

- **[1] Tabla correctamente definida** — 15 campos presentes y correctos. `driver_id` con FK a `auth.users(id)`, `not null`, `unique`, `on delete cascade`. `stripe_account_id` nullable text (no secret). `tip_link_slug` con constraint `unique`. Defaults correctos: `stripe_status = 'not_connected'`, booleanos en `false`/`true` según campo. Índice en `driver_id` presente. Trigger `updated_at` reutiliza `set_updated_at()` existente. `create table if not exists` idempotente.

- **[2] `onboarding_url` no persistida** — La columna no existe en la definición de la tabla. El comentario en el SQL documenta explícitamente el motivo (genera bajo demanda, expira). ✅

- **[3] `external_tip_payments` no existe** — Grep sin resultados. No aparece ni como tabla ni como referencia. ✅

- **[4] RLS activo** — `alter table public.driver_payment_profiles enable row level security;` presente en línea 242, antes de los `create policy`. ✅

- **[5] Políticas de conductor**
  - `dpp_conductor_read_own`: `SELECT to authenticated using (driver_id = auth.uid())` ✅
  - `dpp_conductor_insert_own`: `INSERT to authenticated with check (driver_id = auth.uid())` ✅
  - `dpp_conductor_update_own`: `UPDATE using (driver_id = auth.uid()) with check (driver_id = auth.uid())` — doble guard correcto ✅

- **[6] Políticas de admin**
  - `dpp_admin_read_all`: `SELECT to authenticated using (public.is_admin())` ✅
  - `dpp_admin_update_all`: `UPDATE to authenticated using (public.is_admin())` — sin `with check` explícito, PostgreSQL usa la expresión `using` como `with check`, comportamiento correcto ✅
  - `dpp_admin_delete_all`: `DELETE to authenticated using (public.is_admin())` ✅

- **[7] Vista no expone `stripe_account_id`** — SELECT list explícito: `id`, `display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_active`, `is_visible`. Ni `stripe_account_id`, ni `driver_id`, ni `stripe_status`, ni `payouts_enabled`, ni `charges_enabled` están presentes. ✅

- **[8] Vista solo campos públicos** — Los 8 campos expuestos son todos información pública segura. `id` es necesario para referenciar al conductor (no privado). `tip_link_slug` es el identificador público del QR. Ninguno permite deducir datos de Stripe o identidad de cuenta bancaria. ✅

- **[9] `security_invoker = false` justificado** — La vista corre como su owner (`postgres`/superuser), que bypassa RLS en la tabla. La seguridad descansa en: (a) lista de columnas explícita sin campos sensibles, (b) filtro `WHERE is_active = true AND is_visible = true`, (c) `GRANT SELECT` solo a `anon` y `authenticated`. Patrón válido y habitual en Supabase. ✅

- **[10] `GRANT EXECUTE TO anon` sin riesgo** — La función `is_admin()` solo lee `auth.jwt() ->> 'email'`. Para `anon` el JWT no contiene email → siempre retorna `false`. La función no accede a tablas ni expone datos. Además, todas las políticas `dpp_*` son `to authenticated`, por lo que `anon` no las evalúa (análisis en RISK-02). ✅

- **[11] Sin claves secretas** — Grep sobre `STRIPE_SECRET`, `service_role`, `API_KEY`, `anon_key`: sin coincidencias en el bloque Sprint 2B. `lluis15basket@hotmail.es` es un email público (ya presente en `app.js` como `ADMIN_EMAIL` desde Sprint 1). `stripe_account_id` es un nombre de columna, no un valor. ✅

- **[12] Frontend no modificado** — `git diff HEAD -- app.js index.html style.css` sin output. Los tres archivos están idénticos al último commit. ✅

- **[13] Sin Stripe real ni Edge Functions** — Ninguna referencia a endpoints de Stripe API, claves Stripe, ni funciones de Supabase Edge en el bloque nuevo. `stripe_status` es una columna de texto con default; `stripe_account_id` es una columna vacía (nullable). ✅

---

## Checks fallidos

Ninguno. Los 13 checks han pasado.

---

## Riesgos

### RIESGO-01 — `stripe_account_id` actualizable por el propio conductor
- **Gravedad:** Media
- **Bloquea Sprint 2B:** No (no hay Stripe real todavía)
- **Bloquea Sprint 2C:** Sí, si no se corrige antes de conectar Stripe
- **Descripción:** La política `dpp_conductor_update_own` permite al conductor actualizar **todas** las columnas de su registro, incluyendo `stripe_account_id`. El comentario del SQL dice "Los campos Stripe solo los actualiza la Edge Function con service_role", pero esto no está enforced a nivel de base de datos. Un conductor autenticado podría hacer un UPDATE directo con un `stripe_account_id` falso o de otro conductor.
- **Impacto real en Sprint 2B:** Nulo. Sin Stripe conectado, el campo está vacío y sin uso.
- **Recomendación antes de Sprint 2C:** Añadir protección de columna mediante una de estas opciones:
  1. Crear una función `security definer` que permita al conductor actualizar solo `display_name`, `vehicle_info`, `route_info`, `is_visible` y llamar solo a esa función desde el frontend.
  2. Revocar el UPDATE directo al conductor y forzar todas las actualizaciones a través de funciones `security definer`.

### RIESGO-02 — `GRANT EXECUTE ON FUNCTION is_admin() TO anon` técnicamente redundante
- **Gravedad:** Muy baja
- **Descripción:** Todas las políticas `dpp_*` son `to authenticated`. PostgreSQL no evalúa sus expresiones `using` para usuarios `anon` (no hay políticas aplicables → default deny). Por tanto, `anon` nunca necesita ejecutar `is_admin()` para el acceso a `driver_payment_profiles`. El grant es inofensivo pero no es necesario.
- **Recomendación:** Puede eliminarse. Alternativamente, mantenerlo como medida preventiva si en el futuro se añaden políticas sin scoping de rol.

### RIESGO-03 — Vista `security_invoker = false` depende de lista de columnas mantenida manualmente
- **Gravedad:** Informativa
- **Descripción:** Si en el futuro alguien modifica la vista con `SELECT *` o añade `stripe_account_id` a la lista, el campo quedaría expuesto a `anon`. La seguridad de la vista no es estructural (no es un CHECK que la base de datos aplique automáticamente).
- **Recomendación:** Documentar como regla de mantenimiento que la vista nunca debe incluir `stripe_account_id`, `driver_id` ni campos de estado Stripe. Considerar un test automatizado en Sprint 2C que verifique las columnas de la vista.

### RIESGO-04 — `stripe_status` sin CHECK constraint
- **Gravedad:** Baja
- **Descripción:** La columna acepta cualquier string. Valores inesperados como `'active_ish'` o `''` podrían insertarse y confundir la lógica de frontend en Sprint 2C.
- **Recomendación:** Añadir en Sprint 2C: `check (stripe_status in ('not_connected', 'pending', 'restricted', 'active', 'disabled'))`.

### RIESGO-05 — Conductores no pueden borrar su propio perfil
- **Gravedad:** Informativa (comportamiento intencional)
- **Descripción:** No existe política `dpp_conductor_delete_own`. Un conductor que quiera darse de baja no puede borrar su perfil directamente; debe solicitarlo al admin.
- **Recomendación:** Documentarlo en la UI cuando se implemente el panel de conductor en Sprint 2C.

---

## Recomendaciones antes de Sprint 2C

1. ~~**Obligatorio:** Resolver RIESGO-01~~ — **RESUELTO** (ver re-revisión post-fix).
2. **Recomendado:** Añadir CHECK constraint en `stripe_status` al mismo tiempo que se integra Stripe (RIESGO-04).
3. **Opcional:** Eliminar el grant `EXECUTE ON FUNCTION is_admin() TO anon` si se quiere mínima superficie de ataque (RIESGO-02).
4. **Documentación:** Registrar la regla "nunca SELECT * en `public_driver_profiles`" en CLAUDE.md o en comentarios del SQL (RIESGO-03).

---

## Decisión final (revisión inicial)

**APROBADO ✅** — con RIESGO-01 pendiente de corrección antes de Sprint 2C.

---

## Re-revisión post-fix RIESGO-01 (2026-05-12)

**Método:** análisis estático de `supabase.sql` tras la corrección. `git diff HEAD -- app.js index.html style.css` sin output.

### Solución implementada

Trigger `BEFORE UPDATE` en `driver_payment_profiles`:

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
```

### Verificación de los 13 checks

| # | Check | Resultado |
|---|---|---|
| 1 | Conductor no puede actualizar `stripe_account_id` | ✅ Trigger lanza excepción |
| 2 | Conductor no puede actualizar `stripe_status` | ✅ Trigger lanza excepción |
| 3 | Conductor no puede actualizar `payouts_enabled` | ✅ Trigger lanza excepción |
| 4 | Conductor no puede actualizar `charges_enabled` | ✅ Trigger lanza excepción |
| 5 | Conductor no puede actualizar `is_active` | ✅ Trigger lanza excepción |
| 6 | `is_visible` editable por el conductor | ✅ No está en la lista protegida; trigger retorna NEW |
| 7 | Admin puede actualizar todos los campos | ✅ `if public.is_admin() then return new` |
| 8 | `service_role`/`postgres` pueden actualizar todo | ✅ `if current_role in ('postgres', 'service_role') then return new` |
| 9 | `onboarding_url` no persistida | ✅ Solo aparece en comentario SQL; no es columna |
| 10 | `external_tip_payments` no existe | ✅ Grep sin coincidencias |
| 11 | Frontend no modificado | ✅ `git diff HEAD` sin output |
| 12 | Sin Stripe real ni Edge Functions | ✅ Sin referencias a API Stripe ni funciones edge |
| 13 | Sin claves secretas | ✅ Sin `STRIPE_SECRET*`, sin `service_role` key hardcodeada |

### Análisis técnico del trigger

**Orden de ejecución PostgreSQL para UPDATE con RLS:**
`RLS USING` → `BEFORE ROW trigger` → `RLS WITH CHECK` → UPDATE efectivo.

El trigger interrumpe el flujo en el paso 2 con `RAISE EXCEPTION`, antes de que el UPDATE se materialice. ✅

**`IS DISTINCT FROM` en lugar de `!=`:** comparación NULL-safe. Si el campo era NULL y sigue NULL, no se detecta cambio. Si pasa de NULL a un valor (o viceversa), sí se detecta. ✅

**`security definer` + `set search_path = public`:** sigue la práctica de seguridad recomendada por Supabase para funciones que acceden a otros esquemas. `auth.jwt()` funciona correctamente en contexto `security definer` porque el token JWT está asociado a la sesión, no al rol. ✅

**`service_role` y triggers en Supabase:** el `service_role` bypassa RLS pero NO los triggers. El trigger aún se ejecuta para Edge Functions, pero la primera condición `current_role = 'service_role'` devuelve `NEW` inmediatamente, permitiendo actualizar cualquier campo. ✅

### Riesgos restantes

| ID | Gravedad | Estado | Descripción |
|---|---|---|---|
| RIESGO-01 | ~~Media~~ | **RESUELTO** | Conductor ya no puede actualizar campos Stripe |
| RIESGO-02 | Muy baja | Abierto | `GRANT EXECUTE TO anon` redundante pero inofensivo |
| RIESGO-03 | Informativa | Abierto | Vista depende de lista de columnas mantenida manualmente |
| RIESGO-04 | Baja | Abierto | `stripe_status` sin CHECK constraint — abordar en Sprint 2C |
| RIESGO-05 | Informativa | Abierto (intencional) | Conductor no puede borrar su propio perfil |

Ningún riesgo restante bloquea Sprint 2C.

---

## Decisión final (post-fix)

**APROBADO SIN PENDIENTES BLOQUEANTES ✅**

RIESGO-01 resuelto mediante trigger `guard_stripe_fields_trigger`. Los 5 campos sensibles (`stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`, `is_active`) están protegidos a nivel de base de datos para cualquier usuario no admin y no service_role. `is_visible` permanece editable por el propio conductor. Admin y `service_role` mantienen acceso total. Sprint 2B listo para avanzar a Sprint 2C.
