# QA Sign-off: Sprint 2A — Prototipo Visual "Dar Propina"

**Fecha:** 2026-05-12
**Revisión:** estática (análisis de código fuente: `index.html`, `style.css`, `app.js`)
**Archivos revisados:** `index.html`, `style.css`, `app.js`, `supabase.sql`, `docs/sprint-2A/plan.md`, `docs/sprint-2A/dev-summary.md`

---

## Pruebas realizadas

| # | Prueba | Método |
|---|---|---|
| 1 | Botón "Dar propina" visible en topbar | Lectura HTML + CSS |
| 2 | Flujo completo accesible sin login | Trazado lógico JS |
| 3 | Selección de conductor | Revisión `renderDriverList` / `showDriverPayView` |
| 4 | Datos cambian según conductor | Revisión DOM updates en `showDriverPayView` |
| 5 | QR ficticio por conductor | Revisión URL generada + slug |
| 6 | Botón "Pagar" no procesa dinero real | Búsqueda `fetch` / `XMLHttpRequest` en código nuevo |
| 7 | Sin integración Stripe | Grep `stripe`, `STRIPE`, `loadStripe`, `cdn.stripe` |
| 8 | Sin Edge Functions | Grep `functions/v1`, llamadas externas en código nuevo |
| 9 | Sin modificaciones Supabase | Verificación `supabase.sql` + grep `client.` en código nuevo |
| 10 | Sin claves secretas | Revisión de constantes y valores literales |
| 11 | Funcionalidad existente intacta | Revisión `setupEvents`, `onAuthStateChanged`, CSS |
| 12 | Vista móvil | Revisión media queries, tamaños, `meta viewport` |
| 13 | Sin errores de consola | Verificación IDs HTML vs refs `els`, análisis de flujos JS |

---

## Checks aprobados

- **[1] Botón "Dar propina" presente** — `<button id="darPropinaBtn" class="btn tip-tab">` en el topbar, siempre visible (sin login). Estilo dorado con `var(--gold)`, coherente con la paleta del proyecto.
- **[2] Flujo sin login** — `showTipSection()` no depende de `currentUser`. `hideTipSection()` devuelve al estado correcto (`authSection` o `appSection`) según si hay sesión activa.
- **[3] Selección de conductor** — `renderDriverList()` crea 4 tarjetas con botón "Dar propina". Cada botón llama a `showDriverPayView(driver)` con el conductor correcto.
- **[4] Datos por conductor** — `showDriverPayView()` actualiza `payDriverEmoji`, `payDriverName`, `payDriverBio`, `driverQr.src` (con `slug` único) y reconstruye chips en cada selección. Confirmado cambio real de datos.
- **[5] QR ficticio** — URL: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=tips-la-liga-demo-{slug}`. Servicio público, datos demo, sin tokens ni información real. QR diferente por conductor.
- **[6] Pago ficticio** — `handleTipPayment()` contiene solo `setTimeout(1500ms)` + actualizaciones DOM. Cero llamadas de red (`fetch`, `XMLHttpRequest` ausentes en el código nuevo). El aviso "🧪 Modo demo — el pago no es real" es visible en la UI.
- **[7] Sin Stripe** — Grep sobre `stripe`, `STRIPE`, `loadStripe`, `cdn.stripe`: sin resultados en `app.js` ni en `index.html`. El único script externo es `@supabase/supabase-js`.
- **[8] Sin Edge Functions** — Grep sobre `functions/v1` y todas las funciones nuevas: ninguna hace llamadas externas. Confirmado.
- **[9] Sin modificaciones Supabase** — `supabase.sql` existe pero no ha sido modificado. Las funciones nuevas no llaman a `client.from()`, `client.auth` ni ningún método del cliente Supabase.
- **[10] Sin claves secretas** — Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` (prefijo `sb_publishable_`, clave pública conforme al PROJECT_BRIEF §8). Sin `service_role`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ni ninguna credencial privada.
- **[11] Funcionalidad existente intacta** — `setupEvents()` original sin modificaciones. `onAuthStateChanged()` no tocado. CSS nuevo usa clases únicas que no solapan con `.card`, `.btn`, `.form` ni ninguna clase existente. Los 4 chips renderizan con `document.querySelectorAll(".chip")` — no interfiere con otros elementos porque `.chip` es una clase nueva.
- **[12] Vista móvil** — `meta viewport` presente. Nuevo `@media (max-width: 800px)` aplica `width: 100%` a `.topbar-right` y `grid-template-columns: 1fr` a `.driver-grid`. `.pay-btn` a ancho completo. `.chip` con `flex: 1; flex-wrap: wrap`. `.driver-pay-card` con `max-width: 480px; margin: 0 auto`. Botones con padding ≥ 12px (altura efectiva > 44px).
- **[13] Sin errores de consola (análisis estático)** — Los 16 IDs nuevos en `els` están todos presentes en `index.html` con sus IDs exactos. `escapeHtml()` se aplica en `renderDriverList()` sobre `name` y `bio`. `MOCK_DRIVERS` y funciones nuevas están declaradas antes de que `init()` las ejecute.

---

## Checks fallidos

Ninguno. Todos los 13 checks del alcance de QA han pasado.

---

## Bugs encontrados

### BUG-01 — Solapamiento visual si la sesión cambia durante el flujo de propina
- **Gravedad:** Baja
- **Archivo:** `app.js` — función `onAuthStateChanged()` (línea 577)
- **Descripción:** Si el token de sesión de Supabase expira o se invalida mientras el usuario está en `#tipDriverSection`, `onAuthStateChanged()` mostrará `authSection` o `appSection` sin ocultar `tipDriverSection`. Resultado: dos secciones visibles a la vez.
- **Reproducción:** Mantener la sesión activa en la sección "Dar propina" y esperar a que Supabase emita un evento `SIGNED_OUT` (e.g., expiración de token).
- **Impacto real en Sprint 2A:** Prácticamente ninguno. El flujo "Dar propina" no requiere login y el prototipo no tiene sesiones de larga duración en uso normal.
- **Recomendación para Sprint 2B:** Añadir `els.tipDriverSection.classList.add("hidden")` dentro de `onAuthStateChanged()`.

### BUG-02 — `selectedTipAmount` no se resetea al pulsar "Dar otra propina"
- **Gravedad:** Muy baja
- **Archivo:** `app.js` — event listener de `newTipBtn` (línea 636)
- **Descripción:** Al pulsar "Dar otra propina", se llama a `renderDriverList()` pero `selectedTipAmount` no vuelve a 0. El valor queda en memoria hasta que el usuario selecciona un conductor (que sí lo resetea en `showDriverPayView()`). No hay impacto visible en UX porque el botón de pago solo aparece en la vista de conductor.
- **Recomendación:** Añadir `selectedTipAmount = 0;` en el listener de `newTipBtn`, junto al `classList.remove("hidden")` ya existente.

---

## Observaciones (no son bugs)

- **QR sin fallback offline:** La imagen QR depende de `api.qrserver.com`. Sin conexión a internet, se mostraría una imagen rota. Aceptable en prototipo demo. Documentar para Sprint 2B.
- **`customAmount` sin máximo:** El input no tiene atributo `max`. Un usuario podría escribir `999999`. Irrelevante en demo; añadir validación antes de conectar Stripe real.
- **`SUPABASE_ANON_KEY` hardcodeada:** Es una clave pública (`sb_publishable_`), lo que es conforme al PROJECT_BRIEF §8. Sin embargo, a largo plazo se recomienda externalizar mediante variable de entorno en el proceso de build.

---

## Resumen de gravedad

| ID | Descripción | Gravedad | Bloquea sprint |
|---|---|---|---|
| BUG-01 | Solapamiento visual al cambiar sesión en tipDriverSection | Baja | No |
| BUG-02 | selectedTipAmount no se resetea en "Dar otra propina" | Muy baja | No |
| OBS-01 | QR sin fallback offline | Informativa | No |
| OBS-02 | customAmount sin max | Informativa | No |
| OBS-03 | SUPABASE_ANON_KEY hardcodeada | Informativa (conforme al brief) | No |

---

## Recomendaciones antes de Sprint 2B

1. Corregir BUG-01: ocultar `tipDriverSection` en `onAuthStateChanged()`.
2. Corregir BUG-02: resetear `selectedTipAmount` en el listener de `newTipBtn`.
3. Añadir `max="500"` al input `customAmount` como primera validación.
4. Planificar fallback visual para el QR (placeholder SVG local) antes de conectar QR dinámico real.

---

## Decisión final (revisión inicial)

**APROBADO ✅** — con BUG-01 y BUG-02 pendientes de corrección antes de Sprint 2B.

---

## Re-revisión post-fix (2026-05-12)

**Método:** análisis estático de `app.js` tras las correcciones.

### Check 1 — BUG-01 resuelto ✅

`app.js` línea 578 — primera instrucción dentro de `onAuthStateChanged()`:

```js
async function onAuthStateChanged(session) {
  els.tipDriverSection.classList.add("hidden");  // ← presente
  currentUser = session?.user || null;
  ...
}
```

`tipDriverSection` se oculta incondicionalmente antes de cualquier decisión de sesión. Cubre tanto el evento `SIGNED_OUT` como `SIGNED_IN` y cualquier refresco de token. **Resuelto.**

### Check 2 — BUG-02 resuelto ✅

`app.js` líneas 637–643 — listener de `newTipBtn`:

```js
els.newTipBtn.addEventListener("click", () => {
  selectedTipAmount = null;  // ← presente
  els.customAmount.value = "";  // ← presente
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));  // ← presente
  els.payTipBtn.classList.remove("hidden");
  renderDriverList();
});
```

Estado completamente limpio al volver al grid: importe reseteado, input vaciado, chips deseleccionados. Compatibilidad con `null` verificada: `null > 0` → `false` en `updatePayButton()` (botón desactivado); `null <= 0` → `true` en `handleTipPayment()` (pago bloqueado). **Resuelto.**

### Check 3 — Flujo principal intacto ✅

Trazado completo confirmado:
- `showTipSection()` oculta auth/app y renderiza el grid.
- `showDriverPayView(driver)` resetea estado a `0`, actualiza emoji/nombre/bio/QR, reconstruye chips.
- Selección de chip y input libre actualizan `selectedTipAmount` y `updatePayButton()`.
- `handleTipPayment()` guarda contra `null`/`0`, muestra "Procesando..." y panel de confirmación tras 1,5 s.
- `hideTipSection()` devuelve al estado correcto según sesión activa.

### Check 4 — Sin Stripe real ✅

Grep sobre `stripe`, `STRIPE`, `loadStripe`, `cdn.stripe` en `app.js` e `index.html`: **0 coincidencias.**

### Check 5 — Sin cambios en Supabase ✅

Ninguna de las funciones nuevas ni modificadas llama a `client.from()`, `client.auth` ni ningún método del cliente Supabase.

### Check 6 — Sin claves secretas ✅

Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` (`sb_publishable_`, clave pública). Sin `service_role`, `STRIPE_SECRET_KEY` ni ninguna credencial privada.

### Check 7 — Sin errores de consola (análisis estático) ✅

- `selectedTipAmount.toFixed(2)` solo se ejecuta cuando `selectedTipAmount > 0` — nunca con `null`.
- `selectedDriver.name` solo se accede tras el guard `!selectedDriver` — nunca nulo.
- Todos los IDs del DOM referenciados en `els` existen en `index.html`.
- No hay rutas de código que generen excepciones con los nuevos valores de estado.

### Observación menor mantenida

`selectedTipAmount` se inicializa a `0` (línea 23), se resetea a `0` en `hideTipSection()` y `showDriverPayView()`, pero a `null` en el listener de `newTipBtn`. Inconsistencia en la representación del estado "sin importe". Sin consecuencias en runtime dado que ambos valores son falsy para todos los guards existentes. Recomendable unificar a `null` o a `0` en Sprint 2B.

---

## Decisión final (post-fix)

**APROBADO SIN PENDIENTES ✅**

BUG-01 y BUG-02 corregidos y verificados. El prototipo está listo para avanzar a Sprint 2B.
