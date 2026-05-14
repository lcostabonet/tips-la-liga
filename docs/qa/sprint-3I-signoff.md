# QA Sign-off: Sprint 3I — Enlace directo y QR público por conductor

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`, `style.css`
**Archivos verificados sin cambios:** `supabase.sql`, `index.html`, `supabase/functions/**` (0 bytes de diff)

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | `?driver=slug` activa `openDirectDriverView()` | Lectura `init()` líneas 1810–1811 |
| 2 | Búsqueda por `tip_link_slug` en la vista pública | Lectura `loadDriverBySlug()` líneas 1069–1082 |
| 3 | Vista pública filtra conductores no visibles/inactivos | Lectura `supabase.sql` líneas 612–613 — `WHERE is_active = true AND is_visible = true` |
| 4 | Conductor visible con métodos → `showDriverPayView()` | Lectura `openDirectDriverView()` líneas 1776–1790 |
| 5 | Slug no encontrado → error bilingüe | Lectura líneas 1771–1773 — `t("driverNotFound")` |
| 6 | Conductor oculto → no aparece | Vista filtra `is_visible = false` → `loadDriverBySlug` devuelve `null` → error |
| 7 | Conductor sin métodos → mensaje en flujo de pago | Análisis `showDriverPayView()` rama `!hasExternalPay` con `driver.isMock = false` |
| 8 | QR independiente por método | Lectura `showDriverPayView()` bucle `for (const m of methods)` — sin cambios |
| 9 | `selfPublicUrl` construido con `origin + pathname` | Lectura líneas 1389–1392 |
| 10 | `selfPublicUrl` en input readonly y `escapeHtml` aplicado | Lectura `app.js:1409–1410` |
| 11 | QR de `selfPublicUrl` vía `qrserver.com` | Lectura líneas 1393–1395 y 1413–1414 |
| 12 | Botón "Copiar" — `navigator.clipboard.writeText()` con try/catch | Lectura líneas 1435–1445 |
| 13 | Guard `if (copyBtn)` previene error sin slug | Lectura línea 1435 |
| 14 | Sin slug → mensaje informativo (sin QR ni botón) | Lectura rama `else` líneas 1420–1424 |
| 15 | `driverNotFound` en STRINGS ES y EN | Lectura `app.js:769` y `app.js:791` |
| 16 | Toggle ES/EN funciona en la vista de deep link | Análisis `setLang()` — re-llama `showDriverPayView(selectedDriver)` si pay view visible |
| 17 | `loadDriverBySlug` usa `public_driver_profiles` (no tabla directa) | Lectura `app.js:1073` |
| 18 | Vista no expone `driver_id` ni campos Stripe | Análisis SELECT de la vista en `supabase.sql` líneas 584–613 |
| 19 | Sin secretos ni APIs externas | `grep "sk_\|pk_live_\|api\.paypal\|api\.revolut"` → 0 |
| 20 | Todos los pagos usan `window.open()` | 7 ocurrencias en `app.js` — todas URL externas |
| 21 | `supabase.sql` sin cambios | 0 bytes de diff |
| 22 | Edge Functions sin cambios | 0 bytes de diff |
| 23 | `index.html` sin cambios | 0 bytes de diff |
| 24 | Login/logout no rotos | `onAuthStateChanged()` sin cambios |
| 25 | "Mi enlace" no roto | Guards `!currentUser`, `!driverSelfProfile` presentes |
| 26 | "Dar propina" no roto | `showDriverPayView()`, `loadPublicDrivers()` sin cambios |
| 27 | Panel admin no roto | `loadDriverProfiles()`, `renderDriverProfiles()` sin cambios |
| 28 | Responsive — `.driver-link-input` no desborda | `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis` |
| 29 | `encodeURIComponent` en slug y URL del QR | Lectura líneas 1391 y 1394 |
| 30 | `init()` omite deep link si Supabase no configurado | `if (!isConfigured) return` en línea 1797 — no llega a leer el slug |

---

## Checks aprobados

**[1–2] Deep link activa el flujo correcto**
```javascript
// init() línea 1810:
const driverSlug = new URLSearchParams(window.location.search).get("driver");
if (driverSlug) openDirectDriverView(driverSlug);
```
Se ejecuta tras `await onAuthStateChanged()` — auth estable. `get("driver")` devuelve `null` si el param no existe → bloque omitido. Si existe valor: `openDirectDriverView(driverSlug)` llamado (sin `await` — fire-and-forget correcto para navegación). ✅

`loadDriverBySlug` usa `.eq("tip_link_slug", slug).maybeSingle()` — query puntual, no carga la lista completa. Guard `if (!client) return null` + try/catch — no lanza nunca. ✅

**[3] Conductores ocultos/inactivos no son accesibles por deep link**
`public_driver_profiles` view tiene `WHERE is_active = true AND is_visible = true` (supabase.sql líneas 612–613). Un conductor con `is_visible = false` no aparece en la vista → `loadDriverBySlug` devuelve `null` → se muestra `t("driverNotFound")`. La protección es en la vista (DB), no solo en el frontend. ✅

**[4] Conductor visible con métodos → vista de pago correcta**
`openDirectDriverView()` construye `normalized` con todos los campos que `showDriverPayView()` necesita:
- `isMock: false` — nunca trata conductores reales como mock
- `payment_methods: driver.payment_methods || null` — propagado de la vista
- `tip_link_slug`, `payment_provider`, `payment_url`, `payment_instructions` — todos presentes

`showDriverPayView(normalized)` es idéntico al flujo normal. QR individual por método, botones de pago, trust notice, toggle ES/EN — sin cambios. ✅

**[5–6] Error para slug inválido u oculto**
```javascript
if (!driver) {
  els.driverList.innerHTML = `<p class='help' style='padding:16px'>${t("driverNotFound")}</p>`;
  return;
}
```
`t("driverNotFound")` es bilingüe. Si el idioma es EN al cargar la página, el mensaje aparece en inglés. ✅

**[8] QR por método sin cambios**
`showDriverPayView()` multi-método intacto. `normalized.payment_methods` viene de la vista (mismo `json_agg` que `loadPublicDrivers()`). ✅

**[9–11] URL pública del conductor en "Mi enlace"**
```javascript
const selfBase = window.location.origin + window.location.pathname;
const selfPublicUrl = p.tip_link_slug
  ? `${selfBase}?driver=${encodeURIComponent(p.tip_link_slug)}`
  : null;
```
- GitHub Pages: `https://lcostabonet.github.io/tips-la-liga/?driver=<slug>`
- Sin hardcode de URL de producción — se adapta a cualquier entorno. ✅
- `encodeURIComponent` en el slug — slugs con caracteres especiales correctamente escapados. ✅
- `escapeHtml(selfPublicUrl)` en el atributo `value` del input — protección XSS. ✅
- Si el usuario ya tiene `?driver=` en la URL, `window.location.pathname` no lo incluye — el URL generado es siempre limpio. ✅

**[12–13] Botón "Copiar"**
`navigator.clipboard.writeText(selfPublicUrl)` — API moderna con fallback toast en el `catch`. Guard `if (copyBtn)` previene que se ejecute el listener cuando no hay slug (el botón no existe en el DOM en ese caso). `selfPublicUrl` capturado en closure de la función `showDriverSelfSection` — valor correcto. ✅

**[14] Sin slug — mensaje sin errores**
Rama `else` muestra texto informativo, sin botón ni QR. No hay `getElementById("selfCopyLinkBtn")` que pueda fallar porque `copyBtn` solo se busca con `document.getElementById()` y el guard `if (copyBtn)` lo cubre. ✅

**[15–16] Bilingüe ES/EN en el deep link**
- `driverNotFound` definido en ES y EN. ✅
- `t("loading")` ya era bilingüe (Sprint 3H). ✅
- `setLang()` — si la vista de pago está visible (`!els.driverPayView.classList.contains("hidden")`) y `selectedDriver` está definido → re-llama `showDriverPayView(selectedDriver)` con el nuevo idioma. ✅

**[17–18] Seguridad del deep link**
- `loadDriverBySlug` usa `public_driver_profiles` (vista), nunca la tabla `driver_payment_profiles`. ✅
- La vista no expone `driver_id`, `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`. ✅
- 0 PayPal API, 0 Revolut API, 0 secretos en el diff. ✅
- `anon` tiene `GRANT SELECT ON public_driver_profiles` desde Sprint 2B — no fue necesario modificar SQL. ✅

**[19–23] Archivos protegidos**
`git diff -- supabase.sql supabase/functions/ index.html` → 0 bytes. ✅

**[24–27] No-regresiones**
- `onAuthStateChanged()` sin cambios. ✅
- `showDriverSelfSection()` mantiene todos los guards y listeners existentes, solo se amplía el template. ✅
- `showDriverPayView()`, `renderDriverList()`, `loadPublicDrivers()` sin cambios. ✅
- Panel admin sin cambios. ✅

**[28–29] Responsive y seguridad HTML**
`.driver-link-input` con `min-width: 0; overflow: hidden; text-overflow: ellipsis` — la URL larga se trunca sin desbordar el card. ✅
`encodeURIComponent` aplicado al slug y al URL completo para el QR. ✅

**[30] Deep link omitido si Supabase no configurado**
`if (!isConfigured) return` en la línea 1797 hace que `init()` retorne antes de llegar a la lectura del slug. `loadDriverBySlug` también tiene `if (!client) return null`. Doble protección. ✅

---

## Checks fallidos

Ninguno. Los 30 checks pasan.

---

## Bugs encontrados

Ninguno.

---

## Riesgos

### RIESGO-01 — Race condition entre `openDirectDriverView` y `onAuthStateChange` — **RESUELTO**
- **Estado:** Resuelto. Ver re-revisión post-fix.

### RIESGO-02 — Conductor con slug pero sin `payment_methods` muestra "Modo test" — **RESUELTO**
- **Estado:** Resuelto. Ver re-revisión post-fix.

### RIESGO-03 — `navigator.clipboard` requiere HTTPS — **RESUELTO**
- **Estado:** Resuelto. Ver re-revisión post-fix.

---

## Re-revisión post-fix de riesgos (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| **R01** — `directDriverSlug` declarado como variable global | ✅ | `app.js:28` — `let directDriverSlug = null` |
| **R01** — `directDriverSlug` asignado en `init()` antes de `openDirectDriverView` | ✅ | `app.js:1827` — `directDriverSlug = driverSlug` |
| **R01** — `onAuthStateChanged()` re-aplica deep link al final (solo si hay sesión activa) | ✅ | `app.js:656` — `if (directDriverSlug) openDirectDriverView(directDriverSlug)` — después del `try/catch`, antes del `return` de logout |
| **R01** — Logout NO reabre la vista (early return impide llegar a línea 656) | ✅ | `app.js:636` — `return` en la rama `!currentUser` es anterior a la línea 656 |
| **R01** — Login preserva el deep link (línea 656 alcanzada tras setup de sesión) | ✅ | Flujo: `!currentUser` es falso → no hay early return → línea 656 se ejecuta |
| **R01** — `hideTipSection()` limpia el flag cuando el usuario navega fuera | ✅ | `app.js:832` — `directDriverSlug = null` primera línea de `hideTipSection()` |
| **R01** — Deep link funciona para usuario anónimo sin sesión | ✅ | `onAuthStateChanged(null)` retorna early (línea 636) sin llegar a 656; `openDirectDriverView` lo llama `init()` directamente (línea 1828) |
| **R01** — Sin doble ejecución durante `init()` | ✅ | `onAuthStateChanged` en `init()` (línea ~1804) se llama cuando `directDriverSlug` es aún `null` → no re-aplica; luego `init()` lo asigna y llama directamente |
| **R02** — `noActiveMethods` en `STRINGS.es` | ✅ | `app.js:766` — `"Este conductor todavía no tiene métodos de pago activos."` |
| **R02** — `noActiveMethods` en `STRINGS.en` | ✅ | `app.js:789` — `"This driver does not have active payment methods yet."` |
| **R02** — Condición simplificada en `showDriverPayView()` | ✅ | `app.js:983–985` — `driver.isMock ? t("demoNotice") : t("noActiveMethods")` |
| **R02** — Conductor real sin métodos → mensaje profesional (no "Modo test") | ✅ | `driver.isMock = false` → `t("noActiveMethods")` siempre |
| **R02** — Conductor mock → sigue mostrando "demo" | ✅ | `driver.isMock = true` → `t("demoNotice")` |
| **R02** — Cambio ES/EN traduce el mensaje | ✅ | `setLang()` re-llama `showDriverPayView(selectedDriver)` → `t("noActiveMethods")` en idioma activo |
| **R03** — `navigator.clipboard.writeText()` intentado primero | ✅ | `app.js:1442` — dentro del `try` |
| **R03** — Fallback `document.execCommand("copy")` en el `catch` | ✅ | `app.js:1445–1454` — selecciona `#selfLinkInput` y usa `execCommand` |
| **R03** — Guard `if (input)` previene null reference en fallback | ✅ | `app.js:1446` |
| **R03** — Toast correcto en ambas rutas ("¡Enlace copiado!") | ✅ | `app.js:1443` y `app.js:1451` |
| **R03** — Toast manual si ambos métodos fallan | ✅ | `app.js:1453` y `app.js:1456` |
| **R03** — Fallback no afecta GitHub Pages HTTPS | ✅ | En HTTPS `navigator.clipboard` funciona → `catch` nunca alcanzado |
| Sin cambios en `supabase.sql` | ✅ | 0 bytes de diff |
| Sin cambios en Edge Functions | ✅ | 0 bytes de diff |
| Sin secretos ni APIs de pago | ✅ | 0 coincidencias en grep |
| Solo `app.js` modificado en este fix | ✅ | `git diff --stat` confirma |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

Los 30 checks del QA inicial pasan. Los 3 riesgos informativos quedan resueltos:

- **RIESGO-01**: `directDriverSlug` garantiza que el deep link persiste a través de refrescos de auth cuando hay sesión activa. El early `return` en la rama de logout impide que la vista se reabra al cerrar sesión. `hideTipSection()` limpia el flag cuando el usuario navega fuera intencionalmente.
- **RIESGO-02**: `t("noActiveMethods")` reemplaza el confuso "Modo test" para todos los conductores reales. Bilingüe y profesional.
- **RIESGO-03**: Fallback `document.execCommand("copy")` cubre entornos HTTP/legacy. GitHub Pages no se ve afectado.

Sprint 3I listo para avanzar a Sprint 3J.
