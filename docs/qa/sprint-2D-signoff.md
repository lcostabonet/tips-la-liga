# QA Sign-off: Sprint 2D — Panel admin + integración frontend Stripe Connect

**Fecha:** 2026-05-13
**Revisión:** estática (análisis de `app.js`, `index.html`, `style.css`, Edge Functions modificadas + `git diff`)
**Método adicional:** grep de secretos, análisis de flujos de control JS

---

## Pruebas realizadas

| # | Prueba | Método |
|---|---|---|
| 1 | Solo admin ve el panel | Trazado `adminBtn` (clase `hidden`) + `isAdmin()` en `onAuthStateChanged` |
| 2 | Lectura de `driver_payment_profiles` | Revisión `loadDriverProfiles()` + RLS `dpp_admin_read_all` |
| 3 | Crear/actualizar perfil de conductor | Revisión `saveEditDriver()` + RLS `dpp_admin_update_all` |
| 4 | Edge Functions usan `supabase.functions.invoke()` | Lectura `callEdgeFunction()` |
| 5 | Sin claves secretas en frontend | Grep `sk_\|pk_live\|service_role\|STRIPE_SECRET` en `app.js` |
| 6 | Sin claves live | Grep `sk_live_\|pk_live_` en frontend |
| 7 | Sin dinero real | Análisis `_shared/stripe.ts` (assert `sk_test_`) + modo test Checkout |
| 8 | Sin webhook real | Grep `stripe-webhook\|external_tip_payments` en diff frontend |
| 9 | Estado Stripe mostrado correctamente | Revisión `renderDriverProfiles()` + CSS badges |
| 10 | QR/link test mostrado correctamente | Revisión `driver-qr-box` + `showDriverPayView()` |
| 11 | Sin regresiones en funcionalidad existente | Trazado `renderDriverList()`, `handleTipPayment()`, `onAuthStateChanged()` |
| 12 | Vista móvil | Revisión `@media` en `style.css` Sprint 2D |
| 13 | Sin errores críticos en consola | Análisis estático: DOM IDs, `dataset` camelCase, tipos, null-safety |

---

## Checks aprobados

**[1] Solo admin ve el panel**
- `<button id="adminBtn" class="btn ghost admin-btn hidden">` — oculto por defecto en HTML.
- `onAuthStateChanged()` línea 613: `if (isAdmin()) els.adminBtn.classList.remove("hidden")` — solo visible tras login de admin.
- Al logout: `els.adminBtn.classList.add("hidden")` y `adminDriversSection` se oculta.
- `showAdminSection()` solo disparado por `adminBtn.addEventListener("click", ...)`.
- Un non-admin nunca tiene acceso al botón ni a la sección. ✅

**[2] Lectura de `driver_payment_profiles` correctamente**
- `loadDriverProfiles()` usa `client.from("driver_payment_profiles").select(...)` con 14 campos (excluye `stripe_account_id`).
- El `client` de Supabase incluye automáticamente el JWT del admin, cubierto por la política `dpp_admin_read_all`.
- Resultado guardado en `adminDrivers []` y renderizado por `renderDriverProfiles()`. ✅

**[3] Crear/actualizar perfil de conductor**
- **Actualizar:** `saveEditDriver()` — `client.from("driver_payment_profiles").update({display_name, vehicle_info, route_info, is_visible}).eq("driver_id", driverId)`. Política `dpp_admin_update_all` activa. El trigger `guard_stripe_fields` permite admin. Solo campos seguros. ✅
- **Crear perfiles nuevos:** no implementado. Limitación documentada en `dev-summary.md` — los perfiles se crean via SQL Editor. El check se considera parcialmente cumplido: actualización ✅, creación ⚠️ (limitación conocida, no bloqueante). ✅ (parcial)

**[5] Sin claves secretas en frontend**
Grep `sk_|pk_live|service_role|STRIPE_SECRET` en `app.js`: **0 coincidencias**. Solo presentes `SUPABASE_URL`, `SUPABASE_ANON_KEY` (pública) y `ADMIN_EMAIL`. ✅

**[6] Sin claves live**
Grep `sk_live_|pk_live_` en todos los archivos frontend: **0 coincidencias**. ✅

**[7] Sin dinero real**
- `_shared/stripe.ts` lanza excepción si `STRIPE_SECRET_KEY` no empieza por `sk_test_`.
- `create-driver-payment-link` crea Checkout Session en test mode.
- `adminTestPay()` llama `create-driver-payment-link` con `amount: 1.00`, `currency: "eur"` — test mode.
- No hay ninguna ruta de código en frontend que ejecute pagos directamente. ✅

**[8] Sin webhook real**
Grep `stripe-webhook|external_tip_payments` en diff frontend: **0 coincidencias**. `stripe-webhook/index.ts` sigue siendo placeholder sin modificar. ✅

**[9] Estado Stripe mostrado correctamente**
- `stripeStatusLabel()` mapea `not_connected → "Sin conectar"`, `pending → "Pendiente"`, `restricted → "Restringida"`, `active → "Activa ✓"`.
- CSS tiene las 4 variantes: `.stripe-not_connected`, `.stripe-pending`, `.stripe-restricted`, `.stripe-active` con colores diferenciados.
- `charges_enabled` y `payouts_enabled` se muestran como flags con `.flag-ok` (verde) / `.flag-no` (gris).
- Badge se actualiza tras `adminRefresh()`: `loadDriverProfiles()` → `renderDriverProfiles()`. ✅

**[10] QR/link test mostrado correctamente**
- Panel admin: `qrUrl` generado de `public_url` via `api.qrserver.com`. `.driver-qr-box` oculto si `public_url` es null. `public_url` mostrado como enlace clicable con `target="_blank" rel="noopener"`. ✅
- "Dar propina": `showDriverPayView()` usa `driver.public_url` para el QR si existe; fallback a URL demo. Aviso demo actualizado dinámicamente: "🧪 Modo test — el pago es de prueba con Stripe" cuando hay slug. ✅

**[11] Sin regresiones en funcionalidad existente**
- `onAuthStateChanged()`: añadidas 4 líneas, todas aditivas. El bloque existente de propinas/ranking intacto.
- `renderDriverList()`: ahora async, pero los 4 callers (`showTipSection`, `backToDriversBtn`, `newTipBtn`, `darPropinaBtn → showTipSection`) son event-driven y fire-and-forget. `loadPublicDrivers()` tiene try/catch con fallback a `MOCK_DRIVERS` — imposible propagar error al usuario.
- `showDriverPayView()`: 9 líneas añadidas, lógica original intacta. El `emoji || "🚌"` es correcto para drivers reales (sin emoji en `public_driver_profiles`).
- `handleTipPayment()`: ahora async, la simulación sigue presente como fallback explícito.
- Login, registro, rankings, propinas: ninguna función modificada en esas rutas. ✅

**[12] Vista móvil**
- `@media (max-width: 800px)` en Sprint 2D: `.driver-profile-header` pasa a `flex-direction: column`.
- `.driver-actions` usa `flex-wrap: wrap` — los botones se reorganizan en pantallas pequeñas.
- `.admin-section-header` tiene `flex-wrap: wrap`.
- `.admin-btn` tiene `white-space: nowrap` — no se parte en dos líneas.
- `.topbar-right` ya gestiona mobile desde Sprint 2A (width: 100%). ✅

**[13] Sin errores críticos en consola (análisis estático)**
- `dataset.displayName`: `data-display-name` en HTML → `dataset.displayName` en JS (camelCase automático del DOM). ✅
- `els.editDriverVisible.checked`: el `<input type="checkbox" id="editDriverVisible">` es un elemento HTML correcto. ✅
- `escapeHtml()` aplicado en todos los campos de usuario en `renderDriverProfiles()`. ✅
- `callEdgeFunction()` con `requiresAuth = false`: no añade header `Authorization`, correcto para `create-driver-payment-link` (endpoint público). ✅
- `loadDriverProfiles()` en `showAdminSection()` tiene `.catch()`. En `adminRefresh/GenerateTipLink/saveEditDriver` está dentro de `try/catch`. ✅

---

## Checks fallidos

### Check 4 — Las llamadas a Edge Functions NO usan `supabase.functions.invoke()`

`callEdgeFunction()` en `app.js` usa `fetch()` crudo en lugar del método nativo del SDK:

```javascript
// Implementado (fetch crudo):
const res = await fetch(`${FUNCTIONS_URL}/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });

// Esperado (SDK Supabase):
const { data, error } = await client.functions.invoke(name, { body });
```

**Impacto:** Funcional pero con dos diferencias respecto a `client.functions.invoke()`:
1. No se beneficia del refresco automático del access token que gestiona el SDK internamente.
2. Código más verboso y sin tipado del SDK.

**Para `requiresAuth = false`:** `fetch()` es una alternativa válida porque `client.functions.invoke()` incluye el token por defecto y no ofrece un modo sin auth directo. Pero para funciones autenticadas, la diferencia es relevante.

---

## Bugs encontrados

### BUG-01 — `callEdgeFunction()` usa `fetch()` en lugar de `client.functions.invoke()`
- **Gravedad:** Media
- **Archivo:** `app.js` — función `callEdgeFunction()` línea 831
- **Descripción:** Las llamadas autenticadas a Edge Functions no usan `client.functions.invoke()`. Si el access token expira durante la sesión del admin, la petición fallará con 401 hasta que el SDK refresque el token en el siguiente acceso a Supabase. En una sesión activa con propinas/rankings, el token se renueva frecuentemente, por lo que el impacto práctico es muy bajo.
- **Fix recomendado:**
  ```javascript
  async function callEdgeFunction(name, body = {}, requiresAuth = true) {
    if (requiresAuth) {
      const { data, error } = await client.functions.invoke(name, { body });
      if (error) throw new Error(error.message ?? 'Error en Edge Function');
      return data;
    }
    // Fetch directo para endpoints sin auth (create-driver-payment-link)
    const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
    return json;
  }
  ```

---

## Riesgos

### RIESGO-01 — `ADMIN_EMAIL` no configurado en Supabase Secrets bloquea uso admin de Edge Functions
- **Gravedad:** Media
- **Descripción:** Si `ADMIN_EMAIL` no está configurado como secreto en Supabase, las Edge Functions `create-driver-connect-account`, `refresh-driver-onboarding-link` y `generate-tip-link` usarán `adminEmail = ""`, `isAdminUser = false` y operarán sobre el perfil del propio admin (no sobre el conductor). El admin no podrá llamar estas funciones en nombre de conductores.
- **Mitigación:** Configurar antes de desplegar: `supabase secrets set ADMIN_EMAIL=lluis15basket@hotmail.es`.

### RIESGO-02 — Creación de perfiles de conductor no disponible desde UI
- **Gravedad:** Baja (limitación documentada)
- **Descripción:** El panel admin solo gestiona perfiles existentes. No se pueden crear nuevos perfiles desde el frontend sin modificar el SQL o añadir una Edge Function. Documentado en `dev-summary.md`.
- **Impacto actual:** Los perfiles de prueba se insertan via SQL seed data. En producción, los conductores crearán sus propios perfiles (Sprint 2E).

### RIESGO-03 — `renderDriverList()` async sin `.catch()` en algunos callers
- **Gravedad:** Muy baja
- **Descripción:** `backToDriversBtn` y `newTipBtn` llaman `renderDriverList()` sin encadenar `.catch()`. Si `loadPublicDrivers()` lanzara un error no controlado (actualmente imposible por su try/catch interno), sería un unhandled rejection. En la práctica, `loadPublicDrivers()` siempre devuelve `MOCK_DRIVERS` en caso de error.

### RIESGO-04 — Panel admin lee `driver_payment_profiles` sin `stripe_account_id`
- **Gravedad:** Informativa (correcto por diseño)
- **Descripción:** `loadDriverProfiles()` excluye `stripe_account_id` del SELECT. Esto es correcto por seguridad. No hay forma de accidentalmente exponer este campo en la UI del admin.

---

## Resumen de gravedad (revisión inicial)

| ID | Tipo | Gravedad | Bloquea Sprint 2D | Descripción |
|---|---|---|---|---|
| Check 4 | ~~FALLIDO~~ | ~~Media~~ | No | `fetch()` en lugar de `client.functions.invoke()` — **RESUELTO** |
| BUG-01 | ~~Bug~~ | ~~Media~~ | No | Mismo que Check 4 — **RESUELTO** |
| RIESGO-01 | Riesgo | Media | No (config manual) | `ADMIN_EMAIL` no en Secrets |
| RIESGO-02 | Limitación | Baja | No | Crear perfiles no implementado |
| RIESGO-03 | Riesgo | Muy baja | No | Callers de `renderDriverList()` sin `.catch()` |
| RIESGO-04 | Informativa | — | No | Comportamiento correcto por diseño |

---

## Recomendaciones antes de Sprint 2E

1. **Obligatorio (deploy):** Configurar `ADMIN_EMAIL` en Supabase Secrets antes de desplegar (RIESGO-01).
2. ~~**Recomendado:** Refactorizar `callEdgeFunction()`~~ — **RESUELTO** en post-fix BUG-01.
3. **Opcional:** Añadir `.catch(err => toast(err.message))` a `renderDriverList()` en los callers de `backToDriversBtn` y `newTipBtn` (RIESGO-03).

---

## Decisión final (revisión inicial)

**APROBADO ✅** — con BUG-01 pendiente de corrección.

---

## Re-revisión post-fix BUG-01 (2026-05-13)

**Método:** análisis estático de `app.js` + `git diff HEAD` sobre archivos no frontend.

### Verificación de los 9 checks

| # | Check | Resultado | Evidencia |
|---|---|---|---|
| 1 | `callEdgeFunction()` usa `client.functions.invoke()` | ✅ Resuelto | `app.js` línea 833 |
| 2 | Sin `fetch()` para Edge Functions autenticadas | ✅ Correcto | `fetch()` solo para `requiresAuth = false` |
| 3 | Las 3 llamadas siguen funcionando | ✅ | Callers no modificados, interfaz idéntica |
| 4 | Sin claves secretas en frontend | ✅ | Grep 0 coincidencias |
| 5 | Sin claves live | ✅ | Sin `sk_live_`, `pk_live_` |
| 6 | Supabase SQL no modificado | ✅ | `git diff HEAD -- supabase.sql`: 0 líneas |
| 7 | Edge Functions no modificadas (en este fix) | ✅ | Solo `app.js` cambió |
| 8 | Sin dinero real | ✅ | Lógica de pago intacta, assert `sk_test_` en Edge Function |
| 9 | Panel admin sigue funcionando en modo test | ✅ | Mismos callers, misma interfaz |

### Análisis detallado

**Check 1 y 2 — `callEdgeFunction()` corregida**

```javascript
async function callEdgeFunction(name, body = {}, requiresAuth = true) {
  if (requiresAuth) {
    const { data, error } = await client.functions.invoke(name, { body }); // ← SDK
    if (error) throw new Error(error.message ?? "Error en Edge Function");
    return data;
  }
  // fetch para endpoints públicos — intencional, client.functions.invoke()
  // siempre inyecta el token de sesión activa.
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, { ... });
  ...
}
```

Llamadas autenticadas (`requiresAuth = true` por defecto):
- `adminOnboarding()` → `create-driver-connect-account` → `client.functions.invoke()` ✅
- `adminRefresh()` → `refresh-driver-onboarding-link` → `client.functions.invoke()` ✅
- `adminGenerateTipLink()` → `generate-tip-link` → `client.functions.invoke()` ✅

Llamadas públicas (`requiresAuth = false`, mantiene `fetch()`):
- `adminTestPay()` → `create-driver-payment-link` → `fetch()` sin auth ✅ (correcto: endpoint público)
- `handleTipPayment()` → `create-driver-payment-link` → `fetch()` sin auth ✅ (correcto: cliente paga sin login)

**Check 3 — Callers sin cambios**
Los 5 callers de `callEdgeFunction()` son idénticos al Sprint 2D. La interfaz `(name, body, requiresAuth)` no ha cambiado. ✅

**Checks 4–9 — Sin cambios respecto a la revisión inicial**
El BUG-01 solo modificó `callEdgeFunction()` en `app.js`. No hay cambios en Supabase SQL, Edge Functions, lógica de pagos, ni seguridad. ✅

### Riesgos restantes

| ID | Estado | Descripción |
|---|---|---|
| BUG-01 | **RESUELTO** | `client.functions.invoke()` para llamadas autenticadas |
| RIESGO-01 | Abierto | `ADMIN_EMAIL` debe configurarse en Supabase Secrets antes del deploy |
| RIESGO-02 | Abierto (intencional) | Crear perfiles nuevos no disponible desde UI |
| RIESGO-03 | Abierto (muy baja) | `renderDriverList()` sin `.catch()` en 2 callers |
| RIESGO-04 | Informativa | `stripe_account_id` excluido del SELECT — correcto por diseño |

---

## Decisión final (post-fix)

**APROBADO SIN PENDIENTES BLOQUEANTES ✅**

Los 9 checks han pasado. BUG-01 completamente resuelto: `client.functions.invoke()` gestiona el token automáticamente para las 3 llamadas autenticadas, mientras `fetch()` se mantiene intencionalmente para el endpoint público (`create-driver-payment-link`). Sprint 2D listo para avanzar a Sprint 2E.
