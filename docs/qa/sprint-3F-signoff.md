# QA Sign-off: Sprint 3F — Estabilización de múltiples métodos de pago y limpieza legacy

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`
**Archivos verificados sin cambios:** `supabase.sql`, `index.html`, `style.css`, `supabase/functions/**` (`git diff --stat HEAD` → solo `app.js`, 1 file changed, 4 insertions, 88 deletions)

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | Código muerto de Sprint 3C eliminado sin referencias residuales | Grep `selfQrPreviewTimer\|updateSelfUrlPreview\|saveDriverSelfProfile\|selfPaymentProvider\|selfPaymentUrl\|selfTestLinkBtn\|selfProviderBadge\|selfQrPreview\|selfPaymentInstructions\|selfDriverVisible` → 0 coincidencias |
| 2 | `loadDriverSelfProfile()` SELECT ajustado | Lectura línea 1269 — campos exactos |
| 3 | Todos los accesos a `driverSelfProfile.*` cubren campos del nuevo SELECT | Grep `driverSelfProfile\.` + lectura `showDriverSelfSection()` |
| 4 | Mensaje vacío "Mi enlace" mejorado | Lectura `renderMethodList()` línea 1427 |
| 5 | Mensaje "Dar propina" sin métodos actualizado | Lectura `showDriverPayView()` línea 902 |
| 6 | Flujo legacy activo cuando `payment_methods` es null/vacío | Lectura `loadPublicDrivers()` + `renderDriverList()` + `showDriverPayView()` rama else |
| 7 | `externalPayBtn` listener usa `payment_url` legacy correctamente | Lectura `setupEvents()` línea 706–713 |
| 8 | `handleTipPayment()` no activa Stripe si hay `payment_methods` | Lectura línea 943 + análisis de optional chaining |
| 9 | Multi-método intacto: `payment_methods` en SELECT y propagación | Lectura `loadPublicDrivers()` línea 993, `renderDriverList()` línea 804, `showDriverPayView()` líneas 825–877 |
| 10 | QR y botón independientes por método | Lectura `showDriverPayView()` bucle `for (const m of methods)` líneas 860–877 |
| 11 | `supabase.sql` no modificado | `git diff --stat HEAD` → 0 líneas en `supabase.sql` |
| 12 | `index.html` no modificado | `git diff --stat HEAD` → 0 líneas en `index.html` |
| 13 | `style.css` no modificado | `git diff --stat HEAD` → 0 líneas en `style.css` |
| 14 | Edge Functions no modificadas | `git diff --stat HEAD` → 0 líneas en `supabase/functions/` |
| 15 | Sin PayPal API ni Revolut API | Grep `api\.paypal\|api\.revolut` → 0 coincidencias |
| 16 | Sin claves secretas en frontend | Grep `sk_\|pk_live_\|client_secret\|service_role` → 0 coincidencias |
| 17 | Sin procesamiento de pagos interno | Grep `window\.open` → 7 ocurrencias, todas `window.open(url, "_blank", "noopener")` |
| 18 | Login/logout no roto | Lectura `onAuthStateChanged()` + `loadDriverSelfProfile()` + lógica `driverSelfProfile !== null` |
| 19 | "Mi enlace" no roto | Lectura `showDriverSelfSection()` — accesos a `driverSelfProfile` verificados contra SELECT |
| 20 | "Dar propina" no roto | Lectura `showDriverPayView()` multi-método y legacy — sin cambios funcionales |
| 21 | Panel admin no roto | Lectura `loadDriverProfiles()`, `renderDriverProfiles()`, `openEditDriverDialog()`, `saveEditDriver()` |
| 22 | Sin errores críticos en consola | Análisis de todos los accesos a `driverSelfProfile.*` tras reducción del SELECT |

---

## Checks aprobados

**[1] Código muerto de Sprint 3C eliminado**
Grep de todos los identificadores relacionados (`selfQrPreviewTimer`, `updateSelfUrlPreview`, `saveDriverSelfProfile`, y todos los IDs dinámicos que referenciaban): **0 coincidencias**. Las tres declaraciones han desaparecido completamente del archivo:
- `let selfQrPreviewTimer = null` — eliminada
- `function updateSelfUrlPreview()` — eliminada (~47 líneas)
- `async function saveDriverSelfProfile()` — eliminada (~33 líneas)
Total: 88 líneas eliminadas, 4 añadidas. ✅

**[2] SELECT de `loadDriverSelfProfile()` ajustado**
```javascript
// app.js línea 1269:
.select("id, driver_id, display_name, is_visible")
```
Campos `payment_provider`, `payment_url`, `payment_instructions` eliminados del SELECT. ✅

**[3] Accesos a `driverSelfProfile` cubren el nuevo SELECT**
Grep de `driverSelfProfile\.` devuelve solo dos líneas de código:
- `línea 1323`: `renderMethodList(..., driverSelfProfile.id, ...)` — `id` en SELECT ✅
- `línea 1396`: `loadDriverMethods(driverSelfProfile.id)` — `id` en SELECT ✅

En `showDriverSelfSection()` (`const p = driverSelfProfile`):
- `p.display_name` (línea 1293) — `display_name` en SELECT ✅
- `p.is_visible` (línea 1295) — `is_visible` en SELECT ✅

Toggle listener (línea 1317): `driverSelfProfile = { ...driverSelfProfile, is_visible: e.target.checked }` — spread de `{ id, driver_id, display_name, is_visible }` sin campos legacy. Ningún código posterior lee `payment_provider/url/instructions` desde `driverSelfProfile`. ✅

`saveDriverSelfProfile()` — eliminada en C01, era el único acceso a los campos legacy de `driverSelfProfile`. ✅

**[4] Mensaje vacío "Mi enlace" — `renderMethodList()`**
```javascript
// app.js línea 1426–1428:
if (!methods.length) {
  container.innerHTML = `<p class='help' style='margin-bottom:12px'>Aún no tienes métodos de pago.<br>Añade PayPal o Revolut para aparecer en "Dar propina".</p>`;
}
```
Texto claro y orientativo. Las comillas dobles en `"Dar propina"` están dentro de un template literal, en contenido de texto HTML (no en atributo) — sin conflicto de escaping. ✅

**[5] Mensaje "Dar propina" sin métodos — `showDriverPayView()`**
```javascript
// app.js línea 898–902:
demoNoticeEl.textContent = driver.isMock
  ? "🧪 Modo demo — el pago no es real"
  : (driver.tip_link_slug || driver.slug)
    ? "🧪 Modo test — el pago es de prueba con Stripe"
    : "Sin método de pago configurado aún.";
```
Texto actualizado. Los otros dos casos (mock y Stripe test) sin cambios. ✅

**[6 + 7] Flujo legacy intacto**
- `loadPublicDrivers()` (línea 993): SELECT incluye `payment_provider, payment_url, payment_instructions, payment_methods` — campos legacy presentes para el fallback.
- `renderDriverList()` (línea 801–804): objeto `normalized` propaga `payment_provider`, `payment_url`, `payment_instructions`, `payment_methods`.
- `showDriverPayView()` rama legacy (líneas 836–886): cuando `methods === null`, usa `driver.payment_url` para QR source, `driver.payment_instructions` para texto, `driver.payment_provider` para label del botón. Sin cambios.
- `externalPayBtn` listener (línea 706–713): `selectedDriver.payment_url` — sin cambios. Solo activo en flujo legacy.

Fallback activo cuando `payment_methods` es null/vacío y `payment_url` legacy existe. ✅

**[8] Condición Stripe en `handleTipPayment()`**
```javascript
// app.js línea 943:
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url && !selectedDriver.payment_methods?.length) {
```
Análisis de la optional chaining `payment_methods?.length`:

| `payment_methods` | `?.length` | `!length` | Resultado |
|---|---|---|---|
| `null` | `undefined` | `true` | Condición evalúa — Stripe posible si resto verdadero |
| `undefined` | `undefined` | `true` | Idem |
| `[]` (vacío) | `0` | `true` | Idem — sin métodos, correcto |
| `[m1, m2]` | `2` | `false` | Condición falsa → **Stripe nunca activa** ✅ |

La barrera ahora es explícita: conductor con `payment_methods` pero `payment_url = null` ya no activa Stripe. Antes dependía implícitamente de que `payTipBtn` estuviera oculto. ✅

**[9 + 10] Multi-método PayPal/Revolut intacto**
`showDriverPayView()` (líneas 825–877): detección de `payment_methods` (`Array.isArray && length > 0`), bucle `for (const m of methods)` generando un bloque por método. Cada bloque:
- QR propio: `qrserver...encodeURIComponent(m.payment_url)` — cierre sobre `m` de la iteración
- Botón con `providerLabel(m.provider)` — sin compartir estado entre métodos
- Instrucciones propias: `m.instructions`
Sin cambios en esta lógica. ✅

**[11–14] Archivos protegidos intactos**
`git diff --stat HEAD` → `app.js | 92 +++-----... 1 file changed`. `supabase.sql`, `index.html`, `style.css`, `supabase/functions/**` — 0 líneas modificadas. ✅

**[15–17] Sin APIs externas, sin secretos, sin pagos internos**
- Grep `api\.paypal|api\.revolut`: **0 coincidencias**. ✅
- Grep `sk_|pk_live_|client_secret|service_role`: **0 coincidencias**. ✅
- Todos los pagos: `window.open(url, "_blank", "noopener")`. Sin fetch a APIs de pago. ✅

**[18] Login/logout no roto**
`onAuthStateChanged()` sin cambios. `loadDriverSelfProfile()` aún llamado en login (línea 646). Resultado: `driverSelfProfile = data || null`. La condición `if (driverSelfProfile)` (línea 647) sigue correcta — `data` no incluye legacy fields pero `data` en sí es truthy cuando existe la fila. En logout: `driverSelfProfile = null`, botones ocultos — sin cambios. ✅

**[19] "Mi enlace" no roto**
`showDriverSelfSection()` accede solo a `p.display_name`, `p.is_visible` y `driverSelfProfile.id` — los tres en el SELECT reducido. `loadSelfMethods()` usa `driverSelfProfile?.id` — presente. `renderMethodList()` se llama con `driverSelfProfile.id` — presente. ✅

**[20] "Dar propina" no roto**
Flujo multi-método: sin cambios. Flujo legacy: sin cambios funcionales (solo texto). `loadPublicDrivers()` y `renderDriverList()` sin cambios. ✅

**[21] Panel admin no roto**
`loadDriverProfiles()` (línea 1002–1009): SELECT incluye legacy fields — sin cambios. `renderDriverProfiles()` badge de `payment_provider` — sin cambios. `openEditDriverDialog()` y `saveEditDriver()` — sin cambios. `showDriverMethodsSection()` — sin cambios. ✅

**[22] Sin errores críticos en consola**
El único riesgo de TypeError nuevo sería `driverSelfProfile.id` en `showDriverSelfSection()` si `driverSelfProfile = null`, pero:
- El botón "🔗 Mi enlace" solo aparece cuando `driverSelfProfile !== null` (línea 647).
- La función tiene guarda `if (!currentUser) return` (línea 1280).
- Ninguna ruta del código puede llamar a `showDriverSelfSection()` con `driverSelfProfile = null` en flujo normal. ✅

---

## Checks fallidos

Ninguno. Los 22 checks pasan.

---

## Bugs encontrados

Ninguno.

---

## Riesgos

### RIESGO-01 — Mensaje primera persona en contexto admin (Informativo)

- **Gravedad:** Informativa
- **Descripción:** `renderMethodList()` mostraba `"Aún no tienes métodos de pago. Añade PayPal o Revolut..."` cuando `methods.length === 0`. Primera persona inapropiada en el contexto del admin viendo el perfil de otro conductor.
- **Impacto:** Ninguno funcional.
- **Estado:** **RESUELTO** — ver re-revisión post-fix.

### RIESGO-02 — `showDriverSelfSection()` sin guarda `if (!driverSelfProfile)` (Informativo, preexistente)

- **Gravedad:** Informativa (preexistente desde Sprint 3D)
- **Descripción:** `showDriverSelfSection()` accedía a `p.display_name` sin comprobar que `driverSelfProfile !== null`. Race condition extrema podía causar `TypeError`.
- **Impacto:** Muy baja probabilidad. No introducido en Sprint 3F.
- **Estado:** **RESUELTO** — ver re-revisión post-fix.

---

## Re-revisión post-fix de riesgos (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| RIESGO-01: mensaje neutral en `renderMethodList()` | ✅ | `app.js:1428` — `"Sin métodos de pago configurados."` (sin primera persona) |
| Mensaje válido en contexto conductor | ✅ | "Sin métodos de pago configurados. Añade PayPal o Revolut..." — orientativo y neutral |
| Mensaje válido en contexto admin | ✅ | Misma formulación — el admin entiende que el conductor no tiene métodos |
| Texto anterior (`"Aún no tienes"`) ausente | ✅ | `grep "Aún no tienes"` → 0 coincidencias |
| RIESGO-02: guarda `if (!driverSelfProfile)` añadida | ✅ | `app.js:1281` — segunda línea de `showDriverSelfSection()` |
| Guarda antes de acceder a `p.display_name` | ✅ | Línea 1281 precede a `const p = driverSelfProfile` (línea 1290) |
| Flujo normal no afectado | ✅ | Guarda solo actúa si `driverSelfProfile === null`, caso imposible en flujo normal |
| Silencio ante race condition extrema | ✅ | Retorno silencioso sin TypeError — comportamiento correcto |
| Solo `app.js` modificado | ✅ | `git diff --stat` → `app.js` únicamente; `supabase.sql`, `index.html`, `style.css`, `supabase/functions/` — 0 bytes de diff |
| PayPal / Revolut multi-método intacto | ✅ | `showDriverPayView()` sin cambios; `renderMethodList()` solo cambia texto vacío |
| "Mi enlace" sigue funcionando | ✅ | `showDriverSelfSection()` — guarda nueva sin efecto en flujo normal; lista de métodos y toggle inalterados |
| "Dar propina" sigue funcionando | ✅ | `loadPublicDrivers()`, `renderDriverList()`, `showDriverPayView()` sin cambios |
| Panel admin sigue funcionando | ✅ | `loadDriverProfiles()`, `renderDriverProfiles()`, `saveEditDriver()` sin cambios |
| Sin claves secretas | ✅ | `grep "sk_\|pk_live_\|client_secret"` → 0 coincidencias |
| Sin PayPal API ni Revolut API | ✅ | `grep "api\.paypal\|api\.revolut"` → 0 coincidencias |
| Sin procesamiento de pagos interno | ✅ | Todos los pagos siguen siendo `window.open()` |
| Sin errores críticos en consola | ✅ | Guarda elimina riesgo de TypeError; resto sin cambios |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

Los 22 checks del QA inicial pasan. Los 2 riesgos informativos quedan resueltos con cambios mínimos de una línea cada uno. El código muerto de Sprint 3C (88 líneas) ha desaparecido completamente. `loadDriverSelfProfile()` pide exactamente los 4 campos que usa. Los mensajes de estado vacío son claros y contextualmente correctos en todos los roles. La condición de activación de Stripe es explícita. El flujo legacy de `payment_url` sigue operativo cuando no hay `payment_methods`. Multi-método PayPal + Revolut intacto. `supabase.sql`, `index.html`, `style.css` y Edge Functions sin tocar.

Sprint 3F listo para avanzar a Sprint 3G.
