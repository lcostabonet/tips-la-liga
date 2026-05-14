# QA Sign-off: Sprint 3J — Imprimir y compartir QR público del conductor

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`, `index.html`, `style.css`
**Archivos verificados sin cambios:** `supabase.sql`, `supabase/functions/**` (0 bytes de diff)

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | "Mi enlace" muestra URL, QR y acciones cuando hay slug | Lectura `showDriverSelfSection()` — rama `selfPublicUrl ?` |
| 2 | QR apunta a `?driver=tip_link_slug` | Lectura `selfPublicUrl` líneas 1393–1395 — `encodeURIComponent(p.tip_link_slug)` |
| 3 | Todos los QR (display/print/download) usan `selfPublicUrl` | Grep `encodeURIComponent(selfPublicUrl)` → 4 ocurrencias consistentes |
| 4 | Botón copiar sin cambios (Sprint 3I) | Lectura listener clipboard + execCommand — intacto |
| 5 | Botón compartir condicional a `navigator.share` | Lectura template `app.js:1428` — ternario en runtime |
| 6 | `?.addEventListener` en selfShareBtn — sin error si no existe | Lectura `app.js:1496` |
| 7 | Botón imprimir rellena poster y llama `window.print()` | Lectura `app.js:1471–1477` |
| 8 | `window.print()` llamado inmediatamente tras `src` — race condition | BUG-01 (ver abajo) |
| 9 | `#printPoster` es hijo directo de `<body>` | Lectura `index.html:337` — entre `#toast` y primer `<script>` |
| 10 | CSS: `body > * { display: none !important }` vs `#printPoster { display: flex !important }` — especificidad | Análisis: ID (0,1,0,0) > elementos (0,0,0,2) → `#printPoster` gana ✅ |
| 11 | Todas las clases del poster en HTML tienen reglas CSS en `@media print` | Grep cruzado HTML/CSS: 6 clases todas definidas |
| 12 | `.poster-name` se rellena con `p.display_name` | Lectura `app.js:1474` — `posterName.textContent = p.display_name` |
| 13 | QR del poster usa `selfPublicUrl` (el deep link correcto) | Lectura `app.js:1475` — `encodeURIComponent(selfPublicUrl)` |
| 14 | Texto bilingüe en `index.html` | Lectura líneas 342–346 — `.poster-tagline` + `.poster-trust` |
| 15 | Texto de confianza presente | `"La propina va directamente al conductor / Your tip goes directly to the driver"` |
| 16 | Descarga QR — fetch + blob + URL.createObjectURL + download | Lectura `app.js:1480–1492` |
| 17 | `selfQrDownloadUrl` siempre non-null cuando el botón existe | Análisis: `selfDownloadQrBtn` solo se renderiza si `selfPublicUrl` truthy → `selfQrDownloadUrl` también truthy |
| 18 | `URL.revokeObjectURL` libera memoria | Lectura `app.js:1489` — después de `a.click()` |
| 19 | Fallback descarga si fetch falla | Lectura `app.js:1491` — `window.open(selfQrDownloadUrl, "_blank", "noopener")` |
| 20 | Deep link `?driver=slug` intacto | `openDirectDriverView()`, `loadDriverBySlug()` sin cambios |
| 21 | "Dar propina" intacto | `showDriverPayView()`, `loadPublicDrivers()` sin cambios |
| 22 | Panel admin intacto | `loadDriverProfiles()`, `renderDriverProfiles()` sin cambios |
| 23 | Sin secretos ni APIs de pago | `grep "sk_\|pk_live_\|api\.paypal\|api\.revolut"` → 0 |
| 24 | `supabase.sql` y Edge Functions intactos | 0 bytes de diff |
| 25 | Responsive — `.driver-link-actions` flex-wrap | `style.css:1125` — `flex-wrap: wrap; gap: 8px` |
| 26 | Touch target — `.btn-sm` con `min-height: 44px` (Sprint 3B) | Verificado en Sprint 3B, sin cambios |
| 27 | Sin error en consola — `selfQrDownloadUrl = null` cuando sin slug | Bot ón solo existe si `selfPublicUrl` truthy ✅ |

---

## Checks aprobados

**[1–3] "Mi enlace" — URL, QR y acciones**
La sección `.driver-public-link-section` solo se renderiza cuando `selfPublicUrl` es truthy. Contiene:
- Input readonly con `escapeHtml(selfPublicUrl)` — protección XSS. ✅
- QR 160×160 via qrserver.com con `encodeURIComponent(selfPublicUrl)`. ✅
- `.driver-link-actions` con botones "Imprimir", "Descargar QR" y opcionalmente "Compartir". ✅

**[4–6] Botón compartir — condicional y sin error**
```javascript
// Template literal evaluado en runtime:
${navigator.share ? `<button id="selfShareBtn" ...>...</button>` : ""}
```
Si `navigator.share` es `undefined` (desktop), la expresión ternaria devuelve `""` — el botón no existe en el DOM. El listener usa `document.getElementById("selfShareBtn")?.addEventListener` → si el elemento no existe, `?.` cortocircuita y no lanza. ✅

El `catch` del listener de compartir está vacío — cancelar el share sheet no produce ningún error visible. ✅

**[7] Imprimir — rellena poster y llama print**
```javascript
if (posterName) posterName.textContent = p.display_name;
if (posterQr)   posterQr.src = `...size=300x300...${encodeURIComponent(selfPublicUrl)}`;
window.print();
```
Guards `if (posterName)` y `if (posterQr)` previenen errores si el DOM no está listo. El poster recibe el nombre del conductor y el QR correcto del deep link. ✅ (con BUG-01 — ver abajo)

**[9–11] `#printPoster` — posición y especificidad CSS**
`#printPoster` es hijo directo de `<body>` (verificado: `index.html:337`, entre `<div id="toast">` y `<script>`). Esto es crítico para `body > * { display: none !important }`.

Análisis de especificidad en `@media print`:
- `body > * { display: none !important }` — especificidad (0, 0, 0, 2): dos selectores de elemento.
- `#printPoster { display: flex !important }` — especificidad (0, 1, 0, 0): un selector de ID.
- El ID gana. `#printPoster` es visible al imprimir. ✅

Las 6 clases del poster en `index.html` (`.poster-content`, `.poster-brand`, `.poster-name`, `.poster-qr`, `.poster-tagline`, `.poster-trust`) tienen exactamente su regla CSS correspondiente en `@media print`. ✅

**[12–15] Contenido del cartel**
- Nombre: `posterName.textContent = p.display_name` — `textContent` es XSS-safe. ✅
- QR: `encodeURIComponent(selfPublicUrl)` con `size=300x300` — legible en impresión. ✅
- Tagline bilingüe: `"Escanea para dar una propina · Scan to leave a tip"` — hardcoded ES · EN. ✅
- Trust: `"La propina va directamente al conductor / Your tip goes directly to the driver"` con `<br>`. ✅
- Marca: `🏆 Tips La Liga` en `.poster-brand`. ✅

**[16–19] Descarga QR**
```javascript
const res  = await fetch(selfQrDownloadUrl);  // qrserver.com: CORS: *
const blob = await res.blob();
const url  = URL.createObjectURL(blob);       // blob: URL — same-origin para el browser
const a    = document.createElement("a");
a.href = url;  a.download = "qr-<slug>.png";  a.click();
URL.revokeObjectURL(url);
```
- `blob:` URL generado localmente → atributo `download` funciona. ✅
- `URL.revokeObjectURL` tras `a.click()` — el click es síncrono, la descarga se dispara antes de la revocación. ✅
- `selfQrDownloadUrl` nunca es null cuando el botón existe (lógica garantizada por la rama `selfPublicUrl ?`). ✅
- Fallback `window.open` en el `catch` — si qrserver.com no responde, abre la imagen en nueva pestaña. ✅

**[20–24] No-regresiones y seguridad**
Todas las funciones de navegación, pago, admin y auth sin cambios. 0 secretos, 0 APIs de pago, `supabase.sql` y Edge Functions intactos. ✅

**[25–27] Responsive y errores de consola**
`.driver-link-actions` flex-wrap para móvil. `.btn-sm` 44px touch target. Todos los `?.addEventListener` cortocircuitan sin error si el elemento no existe. ✅

---

## Checks fallidos

**[8] Race condition en `window.print()`** → BUG-01 (ver abajo)

---

## Bugs encontrados

### BUG-01 — `window.print()` llamado antes de que el QR del poster haya cargado — **RESUELTO**

- **Estado:** Resuelto. Ver re-revisión post-fix.

---

## Riesgos

### RIESGO-01 — `fetch` para descarga QR puede fallar en algunos entornos corporativos (Informativo)

- **Gravedad:** Informativa
- **Descripción:** `fetch(selfQrDownloadUrl)` accede a `api.qrserver.com`. En redes con proxy, podría ser bloqueada. El `catch` abre la URL en nueva pestaña — fallback manual presente. ✅

### RIESGO-02 — `navigator.share` con URL no https en desarrollo (Informativo)

- **Gravedad:** Informativa
- **Descripción:** Requiere HTTPS. En HTTP no-localhost, podría fallar silenciosamente (catch vacío). Sin impacto en GitHub Pages. ✅

### RIESGO-03 — `onload` no se dispara si la imagen falla al cargar (Informativo)

- **Gravedad:** Informativa
- **Descripción:** Si qrserver.com devuelve un error HTTP, `onload` no se dispara. `posterQr.complete` será `true` pero `naturalWidth = 0`. En ese estado, `if (posterQr.complete)` se habría evaluado como `false` antes de que la imagen fallara (el error llega de forma asíncrona), así que `window.print()` no se llama. El usuario vería que no ocurre nada al pulsar "Imprimir".
- **Probabilidad muy baja:** qrserver.com ya está cargando el QR 160×160 visible en "Mi enlace" desde la misma sesión — si ese funciona, el 300×300 también funcionará.
- **Mitigación opcional:** Añadir `posterQr.onerror = () => window.print()` como fallback de error.

---

## Re-revisión post-fix BUG-01 (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| `posterQr.onload` asignado ANTES de `posterQr.src` | ✅ | `app.js:1476–1477` — orden garantizado |
| Primera impresión: `onload` espera carga asíncrona | ✅ | Cuando `src` cambia de `""` a nueva URL, `complete = false` → `onload` dispara → `window.print()` |
| Segunda impresión: imagen ya cacheada | ✅ | Mismo src → `complete = true` → `if (posterQr.complete) window.print()` a línea 1478 |
| Sin `#posterQr` en DOM | ✅ | `else { window.print() }` línea 1480 |
| No hay doble print | ✅ | Cuando `src` cambia, `complete` es `false` sincrónicamente → solo `onload` dispara; cuando `src` es el mismo (cached), `onload` no se re-dispara |
| Nombre del conductor rellena el poster | ✅ | `app.js:1474` — `posterName.textContent = p.display_name` — sin cambios |
| QR del poster usa `selfPublicUrl` | ✅ | `app.js:1477` — `encodeURIComponent(selfPublicUrl)` — sin cambios |
| Texto bilingüe y trust en `index.html` | ✅ | Líneas 342–346 — sin cambios |
| Solo `app.js` modificado en el fix | ✅ | `git diff --stat` — `index.html` y `style.css` sin cambios adicionales |
| `supabase.sql` intacto | ✅ | 0 bytes de diff |
| Edge Functions intactas | ✅ | 0 bytes de diff |
| Sin errores de consola | ✅ | `?.addEventListener` en todos los listeners; guards `if (posterName)`, `if (posterQr)` presentes |

---

## Re-revisión post-fix riesgos (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| **R01** — QR no carga → `#selfQrError` visible | ✅ | `app.js:1476–1480` — listener `error` oculta img y muestra fallback |
| **R01** — Mensaje claro "Usa el botón 'Copiar'" | ✅ | `app.js:1421–1422` — texto en template |
| **R01** — Input `#selfLinkInput` intacto cuando QR falla | ✅ | El error handler solo toca `#selfQrImg` y `#selfQrError`; input y copy button sin afectar |
| **R01** — Guard `if (errEl)` previene null reference | ✅ | `app.js:1478` |
| **R02** — `navigator.share` no disponible → botón no aparece | ✅ | `app.js:1431` — ternario `navigator.share ? ... : ""` |
| **R02** — `navigator.clipboard` disponible → copia | ✅ | `app.js:1452–1454` — `clipboard.writeText` + toast |
| **R02** — Fallback clipboard nivel 2: `execCommand` | ✅ | `app.js:1456–1462` — select + execCommand |
| **R02** — Fallback clipboard nivel 3: mensaje manual | ✅ | `app.js:1464` — toast "Cópialo manualmente." |
| **R02** — `cursor: text` en `.driver-link-input` | ✅ | `style.css:1104` — señaliza que el URL es seleccionable manualmente |
| **R03** — Print espera `onload` antes de `window.print()` | ✅ | `app.js:1489` — `posterQr.onload = () => window.print()` |
| **R03** — Print falla → `posterQr.onerror` toast claro | ✅ | `app.js:1490` — `posterQr.onerror = () => toast(...)` |
| **R03** — `onerror` set ANTES de `src` | ✅ | Líneas 1489–1491 — orden garantizado, sin race condition |
| **R03** — Download falla → toast + fallback nueva pestaña | ✅ | `app.js:1510–1511` — toast + `window.open(...)` |
| **R03** — Poster sigue completo (nombre + texto bilingüe) | ✅ | `index.html:340–346` sin cambios; `posterName.textContent = p.display_name` intacto |
| Ningún cambio en `supabase.sql` ni Edge Functions | ✅ | 0 bytes de diff |
| Sin secretos ni APIs de pago | ✅ | `grep "sk_\|api.paypal\|api.revolut"` → 0 |
| GitHub Pages HTTPS sin impacto | ✅ | Todos los cambios son manejo de errores local — sin nuevas llamadas de red |
| Sin errores críticos en consola | ✅ | Guards `if (selfQrImg)`, `if (errEl)`, `if (posterQr)` en todos los puntos; `?.addEventListener` previene null reference |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

Los 27 checks del QA inicial pasan. BUG-01 resuelto (Sprint anterior). Los 3 riesgos informativos quedan cerrados:

- **RIESGO-01**: QR de "Mi enlace" oculta el `<img>` en error y muestra mensaje orientativo. Input y botón "Copiar" permanecen visibles e intactos.
- **RIESGO-02**: `cursor: text` en el input del enlace señaliza que el URL es seleccionable. El botón "Compartir" ya se oculta cuando `navigator.share` es `undefined`. Tres niveles de fallback para el copiado (clipboard → execCommand → manual).
- **RIESGO-03**: `posterQr.onerror` en el listener de impresión muestra toast claro. Download catch muestra toast antes del fallback de nueva pestaña. En ambos casos el usuario es dirigido al botón "Copiar".

`supabase.sql`, Edge Functions, admin, deep link y flujo de pago intactos.

Sprint 3J listo para avanzar a Sprint 3K.
