# QA Sign-off: Sprint 3C — Autoservicio de enlace de pago para conductores

**Fecha:** 2026-05-13
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`, `index.html`, `style.css`
**Archivos verificados sin cambios:** `supabase.sql`, `supabase/functions/**`

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | Botón "🔗 Mi enlace" aparece para usuarios con perfil | Lectura `onAuthStateChanged()` + condición `driverSelfProfile !== null` |
| 2 | Sección carga solo el perfil propio | Lectura `loadDriverSelfProfile()` + uso de `driverSelfProfile` en `showDriverSelfSection()` |
| 3 | Consulta usa `driver_id = auth.user.id` | Lectura `.eq("driver_id", currentUser.id)` en SELECT y UPDATE |
| 4 | Conductor edita solo los 4 campos permitidos por RLS | Análisis objeto `updates` en `saveDriverSelfProfile()` + campos bloqueados por `guard_stripe_fields` |
| 5 | Validación PayPal reutiliza `isValidPaymentUrl()` | Grep en `saveDriverSelfProfile()` y `updateSelfUrlPreview()` |
| 6 | QR preview se actualiza al cambiar payment_url | Lectura `updateSelfUrlPreview()` + listener `input` en `selfPaymentUrl` |
| 7 | "Probar enlace" sin PayPal API | Lectura listener `selfTestLinkBtn` + grep `window.open` |
| 8 | Disclaimer "Tips La Liga no procesa pagos" visible | Lectura innerHTML en `showDriverSelfSection()` + CSS `.disclaimer-box` |
| 9 | Sin claves secretas en frontend | Grep `sk_\|pk_live_\|paypal.*secret\|client_id\|STRIPE_SECRET` en `*.js` y `*.html` |
| 10 | Sin PayPal API | Grep `api.paypal.com` y similares en todo el proyecto |
| 11 | Sin procesamiento de pagos | Análisis de todos los listeners y funciones de Sprint 3C |
| 12 | `supabase.sql` no modificado | `git diff HEAD -- supabase.sql` → sin salida |
| 13 | Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → sin salida |
| 14 | Panel admin no roto | Grep de `saveEditDriver`, `renderDriverProfiles`, `updatePaymentUrlPreview` |
| 15 | "Dar propina" no roto | Grep de `showDriverPayView`, `loadPublicDrivers`, `handleTipPayment` |
| 16 | Login, registro, rankings, propinas no rotos | Lectura `setupEvents()` + `onAuthStateChanged()` + `init()` |
| 17 | Vista móvil funcional | Lectura CSS Sprint 3C + clases Sprint 3B heredadas |
| 18 | Sin errores críticos en consola (análisis estático) | Análisis de refs DOM, hoisting, orden de inicialización, XSS |

---

## Checks aprobados

**[1] Botón "🔗 Mi enlace" para usuarios con perfil**
HTML: `<button id="driverLinkBtn" class="btn ghost driver-link-btn hidden">` — oculto por defecto. En `onAuthStateChanged()`:
- Logout: `els.driverLinkBtn.classList.add("hidden")` + `driverSelfProfile = null` ✅
- Login: `await loadDriverSelfProfile(); if (driverSelfProfile) els.driverLinkBtn.classList.remove("hidden")` ✅
Si no hay fila en `driver_payment_profiles`, `driverSelfProfile` es `null` y el botón no aparece. ✅

**[2] Sección carga solo el perfil propio**
`showDriverSelfSection()` usa `const p = driverSelfProfile`, que es la variable cargada en login para el usuario autenticado. No hay parámetros de conductor externo. No hay forma de acceder al perfil de otro conductor desde esta sección. ✅

**[3] Consulta usa `driver_id = auth.user.id`**
`loadDriverSelfProfile()`: `.eq("driver_id", currentUser.id)` — filtra por el UID del usuario autenticado. ✅
`saveDriverSelfProfile()`: `.eq("driver_id", currentUser.id)` — UPDATE limitado a la propia fila. ✅
RLS `dpp_conductor_update_own`: `driver_id = auth.uid()` — segunda barrera independiente del frontend. ✅

**[4] Conductor edita solo los 4 campos permitidos**
Objeto `updates` en `saveDriverSelfProfile()`:
```javascript
{ payment_provider, payment_url, payment_instructions, is_visible }
```
- `display_name`: NO incluido ✅
- Campos Stripe (`stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`): NO incluidos ✅
- `is_active`: NO incluido ✅

El trigger `guard_stripe_fields` no bloquea ninguno de los 4 campos del UPDATE. ✅

**[5] Validación PayPal reutiliza `isValidPaymentUrl()`**
`saveDriverSelfProfile()`:
```javascript
if (paymentProvider === "paypal" && paymentUrl) {
  if (!isValidPaymentUrl(paymentProvider, paymentUrl)) {
    toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
    return;
  }
}
```
`updateSelfUrlPreview()`: `const valid = isValidPaymentUrl(provider, url)` ✅
`VALID_PAYPAL_DOMAINS` y `isValidPaymentUrl()` no duplicados — reutilizados de Sprint 3B. ✅

**[6] QR preview se actualiza al cambiar payment_url**
`updateSelfUrlPreview()` con `selfQrPreviewTimer` (independiente de `qrPreviewTimer` del admin). Debounce 500ms, misma lógica que Sprint 3B. Listener `input` registrado sobre `selfPaymentUrl` tras renderizar el formulario. Guarda `if (!providerEl || !urlEl) return` previene errores si el timer dispara tras navegar fuera. ✅

**[7] "Probar enlace" sin PayPal API**
Listener de `selfTestLinkBtn`:
```javascript
const url = document.getElementById("selfPaymentUrl").value.trim();
if (url) window.open(url, "_blank", "noopener");
```
Solo `window.open()`. Sin `fetch()`. Sin API. `type="button"` en el HTML impide submit del form. Grep de `fetch(` en Sprint 3C: 0 coincidencias nuevas. ✅

**[8] Disclaimer visible**
En `showDriverSelfSection()` el innerHTML incluye:
```html
<div class="disclaimer-box">
  Tips La Liga no procesa pagos. El pago se realiza fuera de la app y llega directamente a ti.
</div>
```
`.disclaimer-box`: fondo `#fff7d7`, borde `#ffd86a`, color `#5f4100` — visualmente diferenciado del formulario. ✅

**[9] Sin claves secretas**
Grep de `sk_|pk_live_|paypal.*secret|client_id|STRIPE_SECRET` en `*.js` y `*.html`: **0 coincidencias**. ✅

**[10] Sin PayPal API**
Grep de `api.paypal.com` y tokens/OAuth PayPal: **0 coincidencias**. Todos los pagos son `window.open()` con URL pública. ✅

**[11] Sin procesamiento de pagos**
`saveDriverSelfProfile()`: solo UPDATE a Supabase (datos de configuración). `selfTestLinkBtn`: solo `window.open()`. Ninguna función de Sprint 3C llama a Edge Functions de pago ni hace fetch a servicios externos. ✅

**[12] `supabase.sql` no modificado**
`git diff HEAD -- supabase.sql`: sin salida. ✅

**[13] Edge Functions no modificadas**
`git diff HEAD -- supabase/functions/`: sin salida. Los 8 archivos intactos. ✅

**[14] Panel admin no roto**
`saveEditDriver()`, `renderDriverProfiles()`, `openEditDriverDialog()`, `updatePaymentUrlPreview()`, `qrPreviewTimer` — sin cambios. `showAdminSection()` solo añadió `els.driverSelfSection.classList.add("hidden")`, que es correcto y no interfiere con la lógica del admin. ✅

**[15] "Dar propina" no roto**
`showDriverPayView()`, `loadPublicDrivers()`, `handleTipPayment()`, listener `externalPayBtn` — sin cambios. `showTipSection()` solo añadió el hide de `driverSelfSection`. ✅

**[16] Login, registro, rankings, propinas no rotos**
`setupEvents()` añade solo 2 listeners nuevos al final. `onAuthStateChanged()` añade `loadDriverSelfProfile()` dentro del try, que captura sus propios errores y nunca lanza al exterior — no afecta el flujo existente de login. `init()` sin cambios. `login()`, `register()`, `addTip()`, `saveEdit()`, `deleteTip()`, `renderAll()` sin cambios. ✅

**[17] Vista móvil funcional**
`.driver-self-card` con `max-width: 560px` — en móvil ocupa el ancho disponible gracias al contenedor padre `min(1180px, calc(100% - 32px))`. `.driver-self-header` con `flex-wrap: wrap` — el botón y el título se reorganizan en pantallas estrechas. `.provider-select-row` y `.disclaimer-box` — sin overflow esperado en 375px. `.btn-sm` tiene `min-height: 44px` de Sprint 3B. ✅

**[18] Sin errores críticos en consola (análisis estático)**

| Referencia | Estado |
|---|---|
| `$("#driverLinkBtn")` | Elemento estático en HTML ✅ |
| `$("#driverSelfSection")` | Elemento estático en HTML ✅ |
| `$("#backFromSelfBtn")` | Elemento estático dentro de `#driverSelfSection` ✅ |
| `$("#driverSelfContent")` | Elemento estático en HTML ✅ |
| `document.getElementById("driverSelfForm")` | Llamado tras `innerHTML` — elemento existe ✅ |
| `type="button"` en `selfTestLinkBtn` | Confirmado en innerHTML — no dispara submit ✅ |
| `updateSelfUrlPreview` (function declaration) | Hoisted — disponible cuando se registran listeners ✅ |
| `selfQrPreviewTimer` (let, línea 1274) | Inicializado a `null` antes de cualquier llamada en runtime ✅ |
| `clearTimeout(null)` en primera llamada | No-op — correcto ✅ |
| `if (!providerEl \|\| !urlEl) return` | Guarda contra llamadas antes de renderizar ✅ |
| XSS en `innerHTML` | `escapeHtml()` aplicado a `display_name`, `payment_url`, `payment_instructions` ✅ |
| `p.payment_provider === "paypal"` en template | Comparación booleana, no output de datos del usuario ✅ |
| `p.is_visible ? " checked" : ""` en template | Booleano, no output de datos del usuario ✅ |

`loadDriverSelfProfile()` dentro del `try` de `onAuthStateChanged`: captura errores internamente — nunca propaga al `catch` externo. Flujos existentes no afectados. ✅

---

## Checks fallidos

Ninguno.

---

## Bugs encontrados

Ninguno.

---

## Riesgos

### RIESGO-01 — Race condition entre auth state changes concurrentes — **RESUELTO**
- **Gravedad:** Informativa
- **Descripción original:** Si `onAuthStateChanged(null)` se ejecutaba mientras `onAuthStateChanged(session)` esperaba `loadDriverSelfProfile()`, `currentUser` podía quedar a `null` con el botón visible. Si el usuario pulsaba el botón, `showDriverSelfSection()` y `saveDriverSelfProfile()` podían ejecutarse sin sesión activa, con riesgo de TypeError en `currentUser.id`.
- **Fix aplicado (2026-05-13):** Añadida guarda `if (!currentUser) return;` al inicio de `showDriverSelfSection()` y `saveDriverSelfProfile()`. Solo cambios en `app.js`.
- **Verificación:** Las dos guardas cortan la ejecución antes de acceder a `currentUser.id` o manipular el DOM con `driverSelfProfile`. RLS sigue siendo la barrera de seguridad definitiva en DB.

---

## Re-revisión post-fix RIESGO-01 (2026-05-13)

| Check | Resultado | Evidencia |
|---|---|---|
| `showDriverSelfSection()` tiene guarda `if (!currentUser) return` | ✅ | `app.js` — primera línea de la función |
| `saveDriverSelfProfile()` tiene guarda `if (!currentUser) return` | ✅ | `app.js` — tras `event.preventDefault()` |
| Solo `app.js` modificado | ✅ | Sin cambios en `index.html`, `style.css`, `supabase.sql`, `supabase/functions/` |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

Los 18 checks del QA plan han pasado. Los campos editables están correctamente limitados. La validación PayPal reutiliza `isValidPaymentUrl()` sin duplicación. `supabase.sql` y Edge Functions intactos. Sin claves secretas, sin PayPal API, sin procesamiento de pagos. Cero regresiones.

RIESGO-01 resuelto con dos guardas defensivas mínimas en `app.js`.

Sprint 3C listo para avanzar a Sprint 3D.
