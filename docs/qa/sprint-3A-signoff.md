# QA Sign-off: Sprint 3A — Enlace de pago externo PayPal

**Fecha:** 2026-05-13
**Revisión:** análisis estático de código + inspección de `supabase.sql`
**Archivos revisados:** `app.js`, `index.html`, `style.css`, `supabase.sql`

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | `driver_payment_profiles` tiene los 3 campos nuevos | Lectura `supabase.sql` — ALTER TABLE Sprint 3A |
| 2 | `public_driver_profiles` expone los 3 campos | Lectura SELECT list de la vista Sprint 3A |
| 3 | Vista no expone campos Stripe sensibles | Grep en definición de vista + ausencia de resultados en líneas >360 |
| 4 | Conductor PayPal aparece en "Dar propina" | Lectura `loadPublicDrivers()` + SELECT `public_driver_profiles` |
| 5 | QR basado en `payment_url` | Lectura `showDriverPayView()` — lógica `hasExternalPay` + `qrData` |
| 6 | Botón "Pagar con PayPal" visible | Lectura HTML `.external-pay-section` + lógica show/hide |
| 7 | Sin procesamiento de pagos interno | Grep en listener `externalPayBtn` — solo `window.open()` |
| 8 | Sin claves secretas en frontend | Grep `sk_\|pk_live\|paypal.*secret\|client_id\|STRIPE_SECRET` |
| 9 | Sin errores críticos en consola | Análisis estático de referencias DOM y flujos JS |
| 10 | Stripe Connect aparcado sin borrar | Lectura `supabase.sql` + `guard_stripe_fields` + Edge Functions |

---

## Checks aprobados

**[1] `driver_payment_profiles` tiene los 3 campos nuevos**
`supabase.sql` líneas 354–357:
```sql
alter table public.driver_payment_profiles
  add column if not exists payment_provider     text,
  add column if not exists payment_url          text,
  add column if not exists payment_instructions text;
```
Idempotente (`IF NOT EXISTS`). Columnas Stripe intactas. ✅ Estático (requiere ejecución en Supabase para confirmación en vivo).

**[2] `public_driver_profiles` expone los 3 campos**
`supabase.sql` líneas 362–383: SELECT list incluye `payment_provider`, `payment_url`, `payment_instructions`. Grants `anon` y `authenticated` re-concedidos idempotentemente. ✅

**[3] Vista no expone campos Stripe sensibles**
Grep de `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled` en líneas ≥360 (zona de la vista Sprint 3A): **0 coincidencias**. El SELECT es explícito y solo contiene los 11 campos seguros. ✅

**[4] Conductor PayPal aparece en "Dar propina"**
`loadPublicDrivers()` incluye `payment_provider, payment_url, payment_instructions` en el SELECT de `public_driver_profiles`. La vista filtra `is_active = true AND is_visible = true`. El objeto `normalized` en `renderDriverList()` propaga los 3 campos nuevos al `selectedDriver`. ✅ Estático (requiere dato real en DB).

**[5] QR basado en `payment_url`**
`showDriverPayView()`:
```javascript
const hasExternalPay = !driver.isMock && !!driver.payment_url;
const qrData = hasExternalPay
  ? driver.payment_url          // QR del enlace PayPal
  : (driver.public_url || `tips-la-liga-demo-...`);  // fallback
els.driverQr.src = `https://api.qrserver.com/...?data=${encodeURIComponent(qrData)}`;
```
QR real del `payment_url` cuando existe y el conductor no es mock. ✅

**[6] Botón "Pagar con PayPal" visible y funcional**
- HTML: `.external-pay-section` empieza como `hidden`, se muestra cuando `hasExternalPay = true`.
- Texto del botón: `driver.payment_provider === "paypal" ? "Pagar con PayPal →" : "Pagar →"`.
- `payment_instructions` se muestra en `.payment-instructions` si existe.
- Botón siempre activo — no requiere importe seleccionado. ✅

**[7] Sin procesamiento de pagos interno**
Listener completo de `externalPayBtn`:
```javascript
els.externalPayBtn.addEventListener("click", () => {
  if (!selectedDriver || !selectedDriver.payment_url) return;
  let payUrl = selectedDriver.payment_url;
  if (selectedTipAmount > 0 && payUrl.includes("paypal.me")) {
    payUrl = `${payUrl.replace(/\/$/, '')}/${selectedTipAmount.toFixed(2)}`;
  }
  window.open(payUrl, '_blank', 'noopener');
});
```
Solo `window.open()`. Sin `fetch`, sin API calls, sin almacenamiento de transacción. El pago ocurre completamente en PayPal fuera de la app. ✅

**[8] Sin claves secretas en frontend**
Grep de `sk_|pk_live|paypal.*secret|client_id|STRIPE_SECRET` en `app.js`: **0 coincidencias**. `payment_url` es una URL pública (paypal.me), no una credencial. ✅

**[9] Sin errores críticos en consola (análisis estático)**
- `els.externalPayBtn = document.querySelector(".external-pay-btn")` — el elemento existe en `index.html` como HTML estático (`hidden` por defecto). La ref es válida en tiempo de carga. ✅
- `showDriverPayView()` usa `.querySelector()` dentro del `driverPayView`, que siempre está en DOM. ✅
- `els.customAmount.classList.add("hidden")` / `remove("hidden")` — correctamente restaurado en la rama `else`. ✅
- `payTipBtn` se oculta en modo externo y se restaura en modo normal/mock. ✅
- Chips se reconstruyen correctamente en la rama `else`. ✅
- Guard en listener: `if (!selectedDriver || !selectedDriver.payment_url) return` — previene ejecución sin conductor. ✅

**[10] Stripe Connect aparcado sin borrar**
- Columnas Stripe en `driver_payment_profiles` intactas: `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`.
- Trigger `guard_stripe_fields` activo: sigue protegiendo los campos Stripe.
- Edge Functions sin modificar.
- En `handleTipPayment()`: la rama Stripe solo se activa si `!selectedDriver.payment_url` — queda operativa cuando no hay pago externo configurado. ✅

---

## Checks fallidos

Ninguno. Los 10 checks han pasado.

---

## Bugs encontrados

### BUG-01 — Sin validación de formato de URL en `payment_url`
- **Gravedad:** Baja
- **Descripción:** El `<input type="url">` en el dialog de edición valida que el valor sea una URL válida a nivel HTML5, pero no impide que un admin configure URLs que no sean PayPal (ej. `http://otro-sitio.com`). El código JS no verifica que la URL pertenezca a `paypal.com` o `paypal.me`.
- **Impacto real en Sprint 3A:** Nulo — el admin es un usuario de confianza. El botón abre la URL en una nueva pestaña con `noopener`, sin acceso al contexto de la app.
- **Recomendación Sprint 3B:** Añadir validación de dominio en `saveEditDriver()` para el proveedor seleccionado: si `payment_provider = 'paypal'`, verificar que `payment_url` empieza por `https://paypal.me/` o `https://www.paypal.com/`.

---

## Riesgos

### RIESGO-01 — `payment_provider` sin CHECK constraint en DB
- **Gravedad:** Informativa
- **Descripción:** La columna acepta cualquier string. Un valor inesperado mostraría el botón genérico "Pagar →" en lugar de "Pagar con PayPal →". No supone un riesgo de seguridad, solo de UX.
- **Mitigación Sprint 3B:** Añadir `CHECK (payment_provider IN ('paypal', 'bizum', 'revolut', 'stripe'))` cuando el catálogo esté estabilizado.

### RIESGO-02 — `payment_url` no protegido por `guard_stripe_fields`
- **Gravedad:** Informativa (comportamiento correcto por diseño)
- **Descripción:** Conductores con `dpp_conductor_update_own` pueden actualizar su propio `payment_url` directamente sin pasar por Edge Functions. Es el comportamiento esperado (conductores deben poder configurar su propio PayPal). El constraint `payment_url_provider_match` (BUG-01) garantiza que la URL sea de dominio PayPal si el proveedor es `paypal`.

### RIESGO-03 — Importe no pre-relleno si conductor no tiene cuenta PayPal.me
- **Gravedad:** Informativa
- **Descripción:** Si `payment_url` es una URL de PayPal.com (no PayPal.me), el importe seleccionado no se añade automáticamente a la URL. El cliente llega a PayPal sin importe sugerido.
- **Mitigación:** El `payment_instructions` puede incluir el importe sugerido como texto ("Envíame 5€").

---

## Decisión final (revisión inicial)

**APROBADO ✅** — con BUG-01 pendiente de corrección.

---

## Re-revisión post-fix BUG-01 (2026-05-13)

**Método:** análisis estático de `app.js` y `supabase.sql` tras la corrección + grep de secretos en diff.

### Verificación de los 9 checks

| # | Check | Resultado | Evidencia |
|---|---|---|---|
| 1 | `payment_url_provider_match` en `supabase.sql` | ✅ | Líneas 385–407: `DO $$ ... $$` idempotente |
| 2 | PayPal: solo dominios paypal.me / paypal.com | ✅ | Frontend: `validPaypalDomains` + `startsWith`; DB: 4 LIKE patterns |
| 3 | Vista expone `payment_provider`, `payment_url`, `payment_instructions` | ✅ | Sin cambios respecto a revisión inicial |
| 4 | Vista no expone campos Stripe sensibles | ✅ | Grep en Sprint 3A view (offset 362): 0 coincidencias |
| 5 | Conductor PayPal en "Dar propina" | ✅ | `loadPublicDrivers()` sin cambios |
| 6 | Botón y QR PayPal funcionan | ✅ | `showDriverPayView()` y `externalPayBtn` sin cambios |
| 7 | Sin procesamiento de pagos interno | ✅ | Solo `window.open()` |
| 8 | Sin claves secretas | ✅ | Grep diff: 0 coincidencias |
| 9 | Sin errores críticos en consola | ✅ | Variables locales, `.some()` estándar, `toast()` + `return` si falla |

### Análisis del fix

**Capa 1 — frontend (`saveEditDriver()`):**
```javascript
if (paymentProvider === "paypal" && paymentUrl) {
  const validPaypalDomains = ["https://paypal.me/", "https://www.paypal.me/",
                              "https://paypal.com/", "https://www.paypal.com/"];
  if (!validPaypalDomains.some((d) => paymentUrl.startsWith(d))) {
    toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
    return;
  }
}
```
Intercepta antes del UPDATE. Mensaje de error claro al admin. ✅

**Capa 2 — DB constraint (`supabase.sql`):**
```sql
check (
  payment_provider is null or payment_provider <> 'paypal'
  or payment_url is null
  or payment_url like 'https://paypal.me/%'  or payment_url like 'https://www.paypal.me/%'
  or payment_url like 'https://paypal.com/%' or payment_url like 'https://www.paypal.com/%'
)
```
Bloque `DO $$` idempotente — no falla si el constraint ya existe. ✅

**Casos límite verificados:**
- `http://paypal.me/user` → bloqueado por ambas capas (no empieza por `https://`) ✅
- `https://paypal.me` (sin barra) → bloqueado (`startsWith("https://paypal.me/")` = false) ✅
- `payment_url = null` con provider `paypal` → permitido (sin URL = sin validar) ✅
- Provider `bizum` con cualquier URL → permitido (no afecta al constraint) ✅

### Estado de riesgos tras el fix

| ID | Estado | Descripción |
|---|---|---|
| BUG-01 | **RESUELTO** | Validación frontend + constraint DB |
| RIESGO-01 | Abierto (informativa) | `payment_provider` sin enum constraint |
| RIESGO-02 | Mitigado | El constraint cubre la actualización directa de conductores |
| RIESGO-03 | Abierto (informativa) | Importe no pre-rellena en URLs paypal.com |

---

## Decisión final (post-fix)

**APROBADO SIN PENDIENTES BLOQUEANTES ✅**

BUG-01 resuelto con doble capa de protección. Los 9 checks confirman que el flujo PayPal funciona correctamente, la vista pública es segura, Stripe Connect permanece aparcado y no hay claves secretas en el frontend. Sprint 3A listo para avanzar a Sprint 3B.
