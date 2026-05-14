# Sprint 3D Dev Summary

## Qué se implementó
Soporte para múltiples métodos de pago externos por conductor. Nueva tabla `driver_payment_methods` relacionada con `driver_payment_profiles`. "Dar propina" muestra un botón por método activo. El admin y el conductor pueden gestionar métodos desde sus respectivas secciones. Compatibilidad regresiva con columnas legacy de Sprint 3A.

---

## Archivos modificados

### `supabase.sql` — bloque Sprint 3D (líneas 410–fin)

**Tabla `driver_payment_methods`:**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `driver_profile_id` | `uuid` | FK → `driver_payment_profiles(id)`, `NOT NULL`, cascade delete |
| `provider` | `text` | `'paypal'`, `'revolut'`, extensible |
| `payment_url` | `text` | `NOT NULL` |
| `instructions` | `text` | nullable |
| `is_enabled` | `boolean` | default `true` |
| `is_verified` | `boolean` | default `false` — reservado para verificación admin |
| `display_order` | `smallint` | default `0` — orden en la UI |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` |

**FK a `driver_payment_profiles(id)` (no a `auth.users`):** los métodos pertenecen al perfil de pago del conductor, no al usuario Auth directamente. Si se borra el perfil, los métodos se eliminan en cascada. Las políticas RLS verifican propiedad mediante `EXISTS` sobre `driver_payment_profiles`.

**Constraints (idempotentes):**
- `uq_driver_payment_method_provider`: `UNIQUE (driver_profile_id, provider)` — un método por proveedor por conductor.
- `dpm_url_valid`: dominios PayPal (4) y Revolut (2); proveedores desconocidos sin restricción.

**RLS — 5 políticas:**
- `dpm_conductor_read_own` / `insert_own` / `update_own` / `delete_own`: condición vía `EXISTS` sobre `driver_payment_profiles WHERE id = driver_profile_id AND driver_id = auth.uid()`.
- `dpm_admin_all`: `public.is_admin()` para todo.
- `anon` no tiene grant directo; lee métodos mediante la vista `public_driver_profiles` (`security_invoker = false` bypassa RLS).

**Vista `public_driver_profiles` actualizada:**
- Añade columna `payment_methods` — `json_agg` de métodos activos (`is_enabled = true`) ordenados por `display_order, created_at`.
- Join: `m.driver_profile_id = dpp.id` (antes `m.driver_id = dpp.driver_id`).
- Columnas legacy Sprint 3A (`payment_provider/url/instructions`) se mantienen.

**Migración:**
```sql
insert into public.driver_payment_methods
  (driver_profile_id, provider, payment_url, instructions, is_enabled, display_order)
select dpp.id, dpp.payment_provider, dpp.payment_url, dpp.payment_instructions, true, 0
from public.driver_payment_profiles dpp
where dpp.payment_provider is not null and dpp.payment_url is not null
on conflict (driver_profile_id, provider) do nothing;
```
Idempotente, re-ejecutable.

---

### `app.js`

**1. Validación de dominios — `VALID_PAYMENT_DOMAINS` reemplaza `VALID_PAYPAL_DOMAINS`:**
```javascript
const VALID_PAYMENT_DOMAINS = {
  paypal:  ["https://paypal.me/", ...],
  revolut: ["https://revolut.me/", "https://app.revolut.com/"],
};
```
`isValidPaymentUrl(provider, url)` usa el mapa. Firma sin cambios — todos los callers existentes funcionan.

Helpers nuevos: `providerDisplayName(provider)`, `providerLabel(provider)`, `providerValidationMsg(provider)`.

**2. `updatePaymentUrlPreview()` y `updateSelfUrlPreview()` — mensajes dinámicos:**
El hint de error ya no es "El enlace no parece de PayPal" para todos los proveedores — usa `providerValidationMsg(provider)`. Badge usa `providerDisplayName(provider)`.

**3. `loadPublicDrivers()` — `payment_methods` en SELECT:**
Supabase deserializa automáticamente el JSON de la vista en un array de objetos.

**4. `renderDriverList()` normalized — propaga `payment_methods`.**

**5. `showDriverPayView()` — flujo multi-método:**
- Si `driver.payment_methods` (array no vacío): botones `payment-method-btn` por método, QR del primer método, QR se actualiza al hacer clic en un botón.
- Si `payment_methods` vacío/null y `payment_url` legacy: flujo Sprint 3A sin cambios.

**6. Nuevas funciones CRUD:**

| Función | Acción |
|---|---|
| `loadDriverMethods(driverProfileId)` | SELECT por `driver_profile_id` |
| `loadSelfMethods()` | Usa `driverSelfProfile.id` (profile id, no auth uid) |
| `insertDriverMethod(driverProfileId, payload)` | INSERT con `driver_profile_id` |
| `updateDriverMethod(methodId, payload)` | UPDATE por `id` |
| `deleteDriverMethod(methodId)` | DELETE por `id` |

**7. `loadDriverSelfProfile()` — incluye `id` en SELECT** para poder usar el `driver_payment_profiles.id` en las queries a `driver_payment_methods`.

**8. UI de gestión de métodos:**

| Función | Propósito |
|---|---|
| `renderMethodList(methods, container, driverProfileId, name)` | Lista editable de métodos |
| `showMethodForm(existing, driverProfileId, container, name)` | Formulario inline crear/editar |
| `updateMethodFormPreview()` | Preview de validación/QR para el formulario |
| `showDriverMethodsSection(dataset)` | Admin: sección de métodos por conductor |
| `hideDriverMethodsSection()` | Vuelve al panel admin |

**9. `showDriverSelfSection()` reescrita:**
Muestra toggle `is_visible` + lista de métodos propios vía `renderMethodList`. Reemplaza el formulario de campo único de Sprint 3C.

**10. `renderDriverProfiles()` — botón "Métodos de pago":**
Pasa `data-driver-profile-id` (`driver_payment_profiles.id`, no `auth.users.id`) para que `showDriverMethodsSection` pueda consultar `driver_payment_methods` por `driver_profile_id`.

---

### `index.html`
- `<section id="driverMethodsSection">` añadida.
- `<div class="payment-methods-list">` dentro de `.external-pay-section`.

### `style.css`
- `.payment-revolut { background: #7c3aed }`
- `.payment-method-btn` con variantes `.paypal` y `.revolut`
- `.method-list-item`, `.method-url`, `.method-actions`

---

## Correcciones post-QA (2026-05-14)

### BUG-01 — `is_active` → `is_enabled` en payload del formulario de método
**Ubicación:** `showMethodForm()`, línea del objeto `payload`.
```javascript
// Antes (incorrecto):
is_active: document.getElementById("mIsActive").checked,

// Después (correcto):
is_enabled: document.getElementById("mIsActive").checked,
```
El campo de la tabla es `is_enabled`. Con `is_active`, Supabase ignoraba silenciosamente el valor en UPDATE y usaba el default en INSERT.

### BUG-02 — `currentUser.id` → `driverSelfProfile.id` en `showDriverSelfSection()`
**Ubicación:** `showDriverSelfSection()`, llamada a `renderMethodList`.
```javascript
// Antes (incorrecto):
renderMethodList(methods, ..., currentUser.id, p.display_name);

// Después (correcto):
renderMethodList(methods, ..., driverSelfProfile.id, p.display_name);
```
`driver_payment_methods.driver_profile_id` referencia `driver_payment_profiles.id`, no `auth.users.id`. Con `currentUser.id`, los reloads devolvían array vacío y los INSERTs fallaban con violación de FK.

---

## Archivos NO modificados
- `supabase/functions/**` ✅
- Stripe Connect ✅

---

## Para ejecutar en Supabase SQL Editor

Ejecutar el bloque Sprint 3D completo de `supabase.sql` (desde `-- Sprint 3D` hasta el final). El bloque es idempotente: usa `CREATE TABLE IF NOT EXISTS`, `DO $$ ... $$` para constraints y `ON CONFLICT DO NOTHING` para la migración.

Verificar después con:
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'driver_payment_methods';

select count(*) from public.driver_payment_methods;

select * from public.public_driver_profiles limit 3;
```
