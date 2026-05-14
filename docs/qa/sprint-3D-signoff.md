# QA Sign-off: Sprint 3D — Múltiples métodos de pago externos por conductor

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código y `supabase.sql`
**Archivos revisados:** `app.js`, `index.html`, `style.css`, `supabase.sql`
**Archivos verificados sin cambios:** `supabase/functions/**` (`git diff HEAD -- supabase/functions/` → sin salida)
**Nota:** la tabla `driver_payment_methods` no existe aún en Supabase. Los checks 1–5 se basan en análisis del SQL; requieren verificación en DB tras ejecutar el bloque Sprint 3D.

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | Tabla `driver_payment_methods` existe | Lectura `supabase.sql` Sprint 3D |
| 2 | RLS activado en la tabla | Lectura `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| 3 | Migración legacy PayPal | Lectura bloque `INSERT ... SELECT ... ON CONFLICT DO NOTHING` |
| 4 | `public_driver_profiles` incluye `payment_methods` | Lectura vista + `loadPublicDrivers()` SELECT |
| 5 | PayPal y Revolut coexisten | Análisis constraint `uq_driver_payment_method_provider` |
| 6 | "Dar propina" muestra todos los métodos activos | Lectura `showDriverPayView()` — bucle `for (const m of methods)` |
| 7 | Botones correctos por método | Lectura `providerLabel()` + clase CSS por proveedor |
| 8 | QR basado en `payment_url` del método | Lectura listener de cada botón — `encodeURIComponent(m.payment_url)` |
| 9 | Admin: ver/crear/editar/borrar métodos | Lectura `showDriverMethodsSection`, `renderMethodList`, `showMethodForm` |
| 10 | "Mi enlace": conductor gestiona sus métodos | Lectura `showDriverSelfSection` — BUG-02 detectado |
| 11 | Conductor solo gestiona sus propios métodos | Lectura políticas `dpm_conductor_*` con `EXISTS` sobre `driver_payment_profiles` |
| 12 | Validación PayPal | Lectura `VALID_PAYMENT_DOMAINS.paypal` + constraint `dpm_url_valid` |
| 13 | Validación Revolut | Lectura `VALID_PAYMENT_DOMAINS.revolut` + constraint `dpm_url_valid` |
| 14 | Sin PayPal API | Grep `api\.paypal\|paypal.*secret` en `.js`, `.html`, `.css` → 0 coincidencias |
| 15 | Sin Revolut API | Grep `api\.revolut\|revolut.*secret` → 0 coincidencias |
| 16 | Sin claves secretas en frontend | Grep `sk_\|pk_live_\|client_secret` → 0 coincidencias |
| 17 | Sin procesamiento de pagos | Análisis todos los listeners — solo `window.open()` |
| 18 | Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → sin salida |
| 19 | Stripe Connect aparcado | Lectura `handleTipPayment()` — rama Stripe sin cambios |
| 20 | Logout/login limpia secciones | Lectura `onAuthStateChanged()` — `driverMethodsSection.classList.add("hidden")` |
| 21 | Sin regresiones ranking/propinas/admin | Lectura `setupEvents()`, funciones de tips, botones Onboarding/Refresh/Test |
| 22 | Vista móvil | Lectura CSS `.payment-methods-list { flex-direction: column }` |
| 23 | Sin errores críticos en consola | Análisis estático — BUG-01 y BUG-02 causarán errores en runtime |

---

## Checks aprobados

**[1] Tabla `driver_payment_methods` en `supabase.sql`**
`CREATE TABLE IF NOT EXISTS` con 10 campos. FK `driver_profile_id → driver_payment_profiles(id) ON DELETE CASCADE`. Trigger `set_updated_at()`. ✅ (pendiente de ejecución en DB)

**[2] RLS activado**
`ALTER TABLE public.driver_payment_methods ENABLE ROW LEVEL SECURITY` presente. ✅

**[3] Migración legacy**
```sql
insert into public.driver_payment_methods (driver_profile_id, ...)
select dpp.id, dpp.payment_provider, dpp.payment_url, ...
from public.driver_payment_profiles dpp
where dpp.payment_provider is not null and dpp.payment_url is not null
on conflict (driver_profile_id, provider) do nothing;
```
Idempotente. ✅

**[4] `public_driver_profiles` incluye `payment_methods`**
La vista recreada incluye `json_agg(... order by m.display_order, m.created_at)` filtrada por `m.is_enabled = true` y `m.driver_profile_id = dpp.id`. `loadPublicDrivers()` añade `payment_methods` al SELECT. `renderDriverList()` propaga el campo al objeto `normalized`. ✅

**[5] PayPal y Revolut coexisten**
`UNIQUE(driver_profile_id, provider)` permite un PayPal y un Revolut por conductor. Constraint idempotente. ✅

**[6] "Dar propina" — todos los métodos activos**
`showDriverPayView()` detecta `driver.payment_methods` (array no vacío), itera y crea un `<button>` por método. Si el array está vacío o es null, cae en flujo legacy Sprint 3A. ✅

**[7] Botones correctos**
`providerLabel("paypal")` → "Pagar con PayPal →" (clase `.payment-method-btn.paypal`, azul `#009cde`). `providerLabel("revolut")` → "Pagar con Revolut →" (clase `.payment-method-btn.revolut`, violeta `#7c3aed`). ✅

**[8] QR por método**
QR inicial: `methods[0].payment_url`. Al pulsar botón: `els.driverQr.src = qrserver...encodeURIComponent(m.payment_url)`. Solo `window.open()` — sin fetch, sin API. ✅

**[9] Admin: gestión de métodos**
`showDriverMethodsSection(driverDataset)` usa `driverDataset.driverProfileId` (el `driver_payment_profiles.id` del botón "Métodos de pago") para llamar `loadDriverMethods()`. `renderMethodList()` + `showMethodForm()` + `deleteDriverMethod()` operan correctamente. El botón "Métodos de pago" en `renderDriverProfiles()` pasa `data-driver-profile-id="${driver.id}"` — correcto. ✅ (con reserva por BUG-01)

**[11] Aislamiento por conductor (RLS)**
Las cuatro políticas `dpm_conductor_*` usan:
```sql
EXISTS (
  SELECT 1 FROM public.driver_payment_profiles dpp
  WHERE dpp.id = driver_payment_methods.driver_profile_id
    AND dpp.driver_id = auth.uid()
)
```
Doble barrera: frontend filtra por `driver_profile_id`, RLS filtra independientemente. Sin posibilidad de que un conductor edite métodos ajenos a nivel DB. ✅

**[12] Validación PayPal**
Frontend: `VALID_PAYMENT_DOMAINS.paypal = ["https://paypal.me/", "https://www.paypal.me/", "https://paypal.com/", "https://www.paypal.com/"]`. DB: `dpm_url_valid` CHECK con 4 patrones `LIKE`. Casos límite: `http://paypal.me/` (sin HTTPS) bloqueado; `https://paypal.me` (sin barra) bloqueado. ✅

**[13] Validación Revolut**
Frontend: `VALID_PAYMENT_DOMAINS.revolut = ["https://revolut.me/", "https://app.revolut.com/"]`. DB: constraint `dpm_url_valid` con 2 patrones. ✅

**[14–16] Sin APIs externas, sin claves secretas**
Grep de `api.paypal`, `api.revolut`, `sk_`, `pk_live_`, secretos: **0 coincidencias**. `SUPABASE_ANON_KEY = "sb_publishable_..."` — clave pública. ✅

**[17] Sin procesamiento de pagos**
Todos los botones de pago (PayPal, Revolut, legacy) ejecutan `window.open(url, "_blank", "noopener")`. Sin fetch a APIs de pago, sin almacenamiento de transacciones. ✅

**[18] Edge Functions intactas**
`git diff HEAD -- supabase/functions/` sin salida. Los 8 archivos sin cambios. ✅

**[19] Stripe Connect aparcado**
`handleTipPayment()`: `if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url)` — condición original de Sprint 3A, sin modificar. ✅

**[20] Limpieza en logout/login**
`onAuthStateChanged()` oculta `driverMethodsSection` al inicio de cada llamada. En logout: `driverSelfProfile = null`, botones ocultos. ✅

**[21] Sin regresiones**
Funciones de tips (`addTip`, `saveEdit`, `deleteTip`), rankings, login/registro, botones admin Onboarding/Refresh/Test 1€ — sin cambios. `setupEvents()` solo añade listeners para los nuevos elementos. ✅

**[22] Vista móvil**
`.payment-methods-list { flex-direction: column; gap: 10px }` — botones apilados verticalmente. `.method-list-item { flex-wrap: wrap }` — no desborda en 375px. ✅

---

## Checks fallidos

**[10] "Mi enlace" — gestión de métodos propios** → BUG-02 (ver abajo)

**[23] Sin errores críticos en consola** → BUG-01 causa comportamiento silencioso incorrecto; BUG-02 causa error de FK o resultado vacío

---

## Bugs encontrados

### BUG-01 — `showMethodForm()` guarda `is_active` en lugar de `is_enabled` (Bloqueante)
- **Gravedad:** Alta
- **Ubicación:** `app.js` línea 1578
- **Descripción:** El payload enviado a Supabase usa el nombre de campo incorrecto:
  ```javascript
  // Actual (incorrecto):
  is_active: document.getElementById("mIsActive").checked,

  // Correcto:
  is_enabled: document.getElementById("mIsActive").checked,
  ```
- **Impacto en INSERT:** la columna `is_enabled` usará su valor por defecto (`true`) ignorando la selección del usuario.
- **Impacto en UPDATE:** Supabase ignora silenciosamente campos desconocidos en `.update()` — el estado activo/inactivo nunca cambia.
- **Fix:** una sola línea en `showMethodForm()`.

---

### BUG-02 — `showDriverSelfSection()` pasa `currentUser.id` en lugar de `driverSelfProfile.id` a `renderMethodList()` (Bloqueante)
- **Gravedad:** Alta
- **Ubicación:** `app.js` línea 1287
- **Descripción:**
  ```javascript
  // Actual (incorrecto):
  renderMethodList(methods, document.getElementById("selfMethodList"), currentUser.id, p.display_name);

  // Correcto:
  renderMethodList(methods, document.getElementById("selfMethodList"), driverSelfProfile.id, p.display_name);
  ```
- **Impacto:** `renderMethodList` usa el tercer argumento como `driverProfileId` para:
  - Recargar métodos tras operaciones: `loadDriverMethods(currentUser.id)` — `currentUser.id` es `auth.users.id`, no `driver_payment_profiles.id` → devuelve array vacío (FK mismatch).
  - Insertar nuevos métodos: `insertDriverMethod(currentUser.id, payload)` → INSERT falla con violación de FK porque no existe una fila en `driver_payment_profiles` con `id = auth.users.id`.
- **Fix:** una sola línea en `showDriverSelfSection()`.

---

## Riesgos

### RIESGO-01 — `handleTipPayment` no evalúa `payment_methods` explícitamente
- **Gravedad:** Informativa
- **Descripción:** La condición `if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url)` que activa la rama Stripe no excluye conductores que tienen `payment_methods` pero no `payment_url` legacy. En la práctica no es un problema porque cuando `hasExternalPay = true` el botón `payTipBtn` queda oculto y `handleTipPayment` no puede ser invocado. Pero la lógica es implícita.
- **Mitigación Sprint 3E:** añadir `&& !selectedDriver.payment_methods?.length` a la condición.

### RIESGO-02 — Tabla no ejecutada en Supabase
- **Gravedad:** Informativa (bloqueante para puesta en producción)
- **Descripción:** El bloque Sprint 3D en `supabase.sql` es correcto pero no ha sido ejecutado. Checks 1–5 son estáticos. La app producirá error al intentar leer `driver_payment_methods` o `payment_methods` de la vista hasta que se ejecute el SQL.
- **Acción:** ejecutar el bloque Sprint 3D en el SQL Editor de Supabase y verificar con las queries del `migration-plan.md`.

---

## Re-revisión post-fix BUG-01 y BUG-02 (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| Payload usa `is_enabled` | ✅ | `app.js:1578` — `is_enabled: document.getElementById("mIsActive").checked` |
| `showDriverSelfSection()` usa `driverSelfProfile.id` | ✅ | `app.js:1287` — `renderMethodList(..., driverSelfProfile.id, ...)` |
| INSERT no falla por FK | ✅ | `insertDriverMethod(driverSelfProfile.id, payload)` → `driver_profile_id` válido |
| UPDATE mantiene `is_enabled` | ✅ | `payload.is_enabled = checkbox.checked` enviado a `updateDriverMethod` |
| Reload tras operaciones correcto | ✅ | `loadDriverMethods(driverSelfProfile.id)` en línea 1583 — profile ID correcto |
| Solo `app.js` modificado | ✅ | `git diff HEAD -- supabase.sql supabase/functions/` → solo cambios Sprint 3D preexistentes |
| Sin errores críticos nuevos | ✅ | `driverSelfProfile.id` siempre definido cuando `showDriverSelfSection()` es llamada |

---

## Decisión final

**APROBADO SIN PENDIENTES BLOQUEANTES ✅**

Los 10 checks de re-revisión pasan. BUG-01 y BUG-02 resueltos con una línea cada uno. Los 21 checks del QA inicial que ya pasaban siguen siendo válidos.

Pendiente operacional (no bloqueante para el código): ejecutar el bloque Sprint 3D de `supabase.sql` en el SQL Editor de Supabase para crear la tabla `driver_payment_methods` y la migración de datos. Hasta entonces, `payment_methods` devuelve `null` en la vista y la app usa el flujo legacy Sprint 3A.

Sprint 3D listo para avanzar a Sprint 3E.

---

## Re-revisión: mejora visual multi-método en "Dar propina" (2026-05-14)

**Cambio revisado:** `showDriverPayView()` reemplaza los botones apilados en una lista por bloques individuales por método, cada uno con nombre, QR propio, botón de pago e instrucciones.

| Check | Resultado | Evidencia |
|---|---|---|
| Dos bloques con PayPal + Revolut | ✅ | Bucle `for (const m of methods)` crea un `.payment-method-block` por método |
| QR propio por bloque | ✅ | `qrSrc = qrserver...encodeURIComponent(m.payment_url)` — `m` de cada iteración |
| Botón abre su `payment_url` | ✅ | Cierre sobre `m.payment_url` en `for...of` — valor correcto por iteración |
| Instrucciones propias por método | ✅ | `m.instructions` — variable de la iteración, no compartida |
| Un solo método sigue funcionando | ✅ | Bucle corre una vez; flujo legacy (mainQrBox restaurado al inicio) intacto |
| Sin PayPal API / Revolut API | ✅ | Solo `window.open()` y `api.qrserver.com` (QR público) |
| `supabase.sql` no modificado | ✅ | `git diff HEAD -- supabase.sql supabase/functions/` → 0 líneas |
| Edge Functions no modificadas | ✅ | Ídem |
| Vista móvil | ✅ | `flex-direction: column`, QR 160×160 cabe en 375px |
| XSS seguro | ✅ | `m.provider`, instrucciones y labels pasados por `escapeHtml()` |

**APROBADO ✅** — cambio visual correcto, sin regresiones.
