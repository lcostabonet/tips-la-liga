# QA Sign-off: Sprint 3H — Rediseño profesional y experiencia bilingüe

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`, `index.html`, `style.css`
**Archivos verificados sin cambios:** `supabase.sql`, `supabase/functions/**` (0 bytes de diff)

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | CSS override `.tip-tab` (Sprint 3H > Sprint 2A) | Lectura `style.css` líneas 422–431 y 989–1002 — cascade analysis |
| 2 | `.demo-badge` eliminado del HTML | `grep "demo-badge" index.html` → 0 coincidencias |
| 3 | Toggle ES/EN presente en HTML | Lectura `index.html` líneas 248–251 |
| 4 | `#tipTrustNotice` presente en HTML y rellenado desde JS | Lectura `index.html:267`, `app.js:891–892` |
| 5 | `.qr-hint` vaciado en HTML, dinámico desde JS | Lectura `index.html:273`, `app.js:902` |
| 6 | `STRINGS` objeto con claves simétricas ES/EN | Lectura `app.js:748–789` — 18 claves × 2 idiomas |
| 7 | `t(key)` retorna `STRINGS[currentLang][key]` | Lectura `app.js:791–793` |
| 8 | `setLang(lang)` actualiza clases y re-renderiza | Lectura `app.js:795–805` |
| 9 | Todos los textos públicos del flujo usan `t()` | Grep `t("` en `app.js` — 18 puntos de aplicación |
| 10 | `chooseDriver` / `leaveATip` definidos pero no llamados | `grep -n "t(\"chooseDriver\")\|t(\"leaveATip\")"` → 0 |
| 11 | `providerLabel()` language-aware | Lectura `app.js:1224–1228` |
| 12 | `updatePayButton()` usa `t()` | Lectura `app.js:998–1006` |
| 13 | `handleTipPayment()` confirmación y "otra propina" usan `t()` | Lectura `app.js:1037–1038` |
| 14 | Listener del toggle registrado en `setupEvents()` | Lectura `app.js:715–718` |
| 15 | `.payment-method-block` override correcto (cascade) | Lectura `style.css:962–985` y `1046–1056` |
| 16 | `.tip-trust-notice` CSS definido | Lectura `style.css:1034–1044` |
| 17 | Flujo multi-método intacto | Lectura `app.js:923–948` — bucle `for (const m of methods)` |
| 18 | Flujo legacy intacto | Lectura `app.js:949–958` |
| 19 | Admin y "Mi enlace" sin cambios | Grep de `loadDriverProfiles`, `showDriverSelfSection` — sin modificaciones |
| 20 | Sin claves secretas ni APIs externas | `grep "sk_\|pk_live_\|api\.paypal\|api\.revolut"` → 0 |
| 21 | Sin procesamiento de pagos | 7 ocurrencias de `window.open()` — todas URL pública |
| 22 | `supabase.sql` y Edge Functions intactos | `git diff -- supabase.sql supabase/functions/` → 0 bytes |
| 23 | Responsive: `.lang-btn` touch target | `min-height: 44px` en `style.css:1018` |
| 24 | Responsive: `.tip-driver-header` con `flex-wrap: wrap` | `style.css:438` — toggle encaja en segunda fila en móvil |
| 25 | "Procesando..." no traducido en `handleTipPayment()` | Lectura `app.js:1012` — BUG-02 |

---

## Checks aprobados

**[1] CSS override `.tip-tab` correcto**
Sprint 3H redefine `.tip-tab` y `.tip-tab:hover` después del bloque Sprint 2A (línea 989 vs 422). Cascade: Sprint 3H gana. Resultado final: `background: var(--gold)` (Sprint 2A) + `color: var(--primary)` (Sprint 2A) + `font-weight: 800` (Sprint 2A) + `padding: 14px 28px; font-size: 16px; min-height: 52px; box-shadow; transition` (Sprint 3H). El botón CTA es claramente más grande que el original. ✅

**[2] `.demo-badge` eliminado**
`grep "demo-badge" index.html` → 0. El badge ya no contamina la experiencia pública. `.demo-notice` (dentro de `#driverPayView`) se mantiene para mostrar el aviso al usuario dentro del flujo de pago — correcto. ✅

**[3–5] HTML: toggle, trust notice, qr-hint**
```html
<!-- index.html línea 248 -->
<div class="lang-toggle">
  <button class="lang-btn active" data-lang="es" type="button">ES</button>
  <button class="lang-btn" data-lang="en" type="button">EN</button>
</div>

<!-- index.html línea 267 -->
<p id="tipTrustNotice" class="tip-trust-notice"></p>

<!-- index.html línea 273 -->
<p class="help qr-hint"></p>
```
Los tres elementos están en el DOM correcto. El toggle inicia con `active` en ES. Trust notice y qr-hint vacíos — esperan texto de JS. ✅

**[6–8] Base i18n: STRINGS, t(), setLang()**
- `STRINGS` tiene 18 claves × 2 idiomas, perfectamente simétricas. Claves de función (`payBtnActive`, `tipSent`, `payWith`) son callables.
- `t(key)` es una línea: `return STRINGS[currentLang][key]`. Sin riesgo de error si la clave existe.
- `setLang(lang)`: actualiza `currentLang`, clases `.lang-btn.active`, y re-renderiza — `showDriverPayView(selectedDriver)` si la vista de pago está activa (síncrono), `renderDriverList()` si está en la lista (asíncrono, fire-and-forget correcto). ✅

**[9] Aplicación de `t()` en 18 puntos**

| Función | Textos traducidos |
|---|---|
| `renderDriverList()` | loading, noDrivers, tipBtn |
| `showDriverPayView()` | directToDriver, scanOrTap, providerNotice, payWithPaypal, payWith(), demoNotice, testNotice, noMethodNotice |
| `providerLabel()` | payWithPaypal, payWithRevolut, payWith() |
| `updatePayButton()` | selectAmount, payBtnActive() |
| `handleTipPayment()` | tipSent(), anotherTip |

18 puntos de aplicación. Todos los textos visibles en el flujo público están cubiertos excepto los indicados en BUG-01 y BUG-02. ✅ (con reservas)

**[11] `providerLabel()` language-aware**
```javascript
function providerLabel(provider) {
  if (provider === "paypal")  return t("payWithPaypal");
  if (provider === "revolut") return t("payWithRevolut");
  return t("payWith")(providerDisplayName(provider));
}
```
Solo es llamado desde `showDriverPayView()` (flujo público). ✅

**[12–13] `updatePayButton()` y `handleTipPayment()`**
`t("selectAmount")`, `t("payBtnActive")(amount)`, `t("tipSent")(driverName)`, `t("anotherTip")` — todos correctos. ✅

**[14] Listener del toggle**
```javascript
// app.js:715
document.querySelector(".lang-toggle")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (btn?.dataset.lang) setLang(btn.dataset.lang);
});
```
Delegación sobre el contenedor — un único listener para los dos botones. `?.` previene error si el elemento no existe. ✅

**[15] `.payment-method-block` override**
Sprint 3D: `border: 1px solid var(--line); padding: 16px; border-radius: 20px`.
Sprint 3H: `border-width: 2px; padding: 24px 20px; border-radius: 24px; transition; :hover`.
Cascade correcto: borde final `2px solid var(--line)`, padding mayor, hover dorado. `display: flex; flex-direction: column; align-items: center` heredados de Sprint 3D. ✅

**[16] `.tip-trust-notice`**
`display: flex; justify-content: center; font-size: 13px; font-weight: 600; color: var(--muted)` — discreta, centrada, legible. ✅

**[17–18] Flujo multi-método y legacy intactos**
Multi-método: `providerLabel(m.provider)` ahora usa `t()` → traduce los botones por método. QR, estructura, `window.open()` — sin cambios. ✅
Legacy: botón usa `t("payWithPaypal")` o `t("payWith")(name)`. ✅

**[19] Admin y "Mi enlace" sin cambios**
`onAuthStateChanged()`, `loadDriverProfiles()`, `renderDriverProfiles()`, `showDriverSelfSection()`, `saveEditDriver()` — sin modificaciones. ✅

**[20–22] Seguridad y archivos protegidos**
0 coincidencias de secretos y APIs externas. 7 `window.open()` — todos URLs públicas. `supabase.sql` y Edge Functions: 0 diff. ✅

**[23–24] Responsive**
`.lang-btn` con `min-height: 44px` — touch target accesible. `.tip-driver-header` con `flex-wrap: wrap` — el toggle cae a la segunda fila si el ancho es insuficiente. `.payment-method-block` sigue siendo `flex-direction: column` con `align-items: center` — centrado en todas las anchuras. ✅

---

## Checks fallidos

**[10] `chooseDriver` y `leaveATip` definidos pero no aplicados** → BUG-01 (ver abajo)

**[25] `"Procesando..."` hardcodeado** → BUG-02 (ver abajo)

---

## Bugs encontrados

### BUG-01 — `<h2>Elige un conductor</h2>` no se traduce (Baja)

- **Gravedad:** Baja
- **Ubicación:** `index.html:247` — `<h2>Elige un conductor</h2>` estático; `app.js` — claves `chooseDriver` y `leaveATip` definidas en `STRINGS` pero nunca llamadas vía `t()`.
- **Descripción:** Al cambiar a EN, el encabezado de la sección sigue mostrando "Elige un conductor" en lugar de "Choose a driver". El resto del flujo (tarjetas, botones, trust notice, QR hint, payment buttons) sí se traduce correctamente.
- **Impacto:** Un cliente anglohablante ve el heading en español, lo que rompe la coherencia del modo EN. Los textos de pago críticos (PayPal, Revolut, trust notice) sí están en inglés.
- **Fix mínimo:** Actualizar el `<h2>` desde JS. Dos opciones:
  1. En `setLang()`, añadir: `const h2 = document.querySelector("#tipDriverSection h2"); if (h2) h2.textContent = t("chooseDriver");`
  2. En `renderDriverList()`, añadir la misma línea al inicio.
  La opción 1 es más inmediata; la opción 2 también lo actualiza al cargar la sección por primera vez en EN si `setLang` se llama antes.

---

### BUG-02 — `"Procesando..."` no traducido en `handleTipPayment()` (Muy baja)

- **Gravedad:** Muy baja
- **Ubicación:** `app.js:1012` — `els.payTipBtn.textContent = "Procesando...";`
- **Descripción:** El texto del botón durante el procesamiento de pago Stripe (mock/test) queda en español en modo EN. El estado dura 1500ms antes de mostrar la confirmación.
- **Impacto:** Solo afecta al flujo Stripe (conductores con slug, sin `payment_methods` ni `payment_url`). En el flujo PayPal/Revolut el botón no pasa por este estado (está oculto). Impacto casi nulo en producción real.
- **Fix mínimo:** Añadir clave `processing` a `STRINGS` (`es: "Procesando..."`, `en: "Processing..."`) y usar `t("processing")` en línea 1012.

---

## Riesgos

### RIESGO-01 — Trust notice visible para conductores mock/demo (Informativo)

- **Gravedad:** Informativa
- **Descripción:** `#tipTrustNotice` se rellena con `t("directToDriver")` para todos los conductores, incluidos los de la lista `MOCK_DRIVERS` (con `isMock: true`). Un usuario que abre "Dar propina" sin datos reales en DB ve simultáneamente "🔒 La propina va directamente al conductor" y "🧪 Modo demo — el pago no es real". Los dos mensajes se contradicen levemente.
- **Impacto:** Solo en entornos sin conductores reales configurados. En producción con conductores reales no hay contradicción.
- **Mitigación opcional:** Condicionar el trust notice: `if (trustEl) trustEl.textContent = driver.isMock ? "" : t("directToDriver");`

### RIESGO-02 — Botones de navegación no traducidos (Informativo)

- **Gravedad:** Informativa
- **Descripción:** `"← Volver"` (`#backToAppBtn`) y `"← Conductores"` (`#backToDriversBtn`) son texto estático en `index.html` y no se traducen en modo EN. El flujo es comprensible por el icono de flecha, pero la literalidad es española.
- **Impacto:** Mínimo — son botones de navegación secundarios. No afecta al flujo de pago.
- **Mitigación Sprint 3I:** Añadir claves `backToApp` / `backToDrivers` a `STRINGS` y actualizar desde JS.

### RIESGO-03 — `setLang()` llama a `renderDriverList()` sin await (Informativo, esperado)

- **Gravedad:** Informativa
- **Descripción:** `setLang()` es síncrona y llama a `renderDriverList()` (async) sin `await`. El cambio de idioma actualiza las clases del toggle inmediatamente y la lista se re-renderiza en asíncrono. Hay una ventana de ~50-300ms en que el toggle muestra EN pero la lista muestra ES.
- **Impacto:** Flash visual mínimo. Comportamiento idéntico al de la carga inicial.
- **Mitigación:** Hacer `setLang()` async con `await renderDriverList()`. Decisión de Sprint 3I si se quiere eliminar el flash.

---

## Re-revisión post-fix BUG-01, BUG-02 y RIESGO-01 (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| `chooseDriver` definido en `STRINGS.es` y `STRINGS.en` | ✅ | `app.js:751` y `app.js:772` |
| `t("chooseDriver")` llamado en `setLang()` | ✅ | `app.js:803` — `sectionH2.textContent = t("chooseDriver")` |
| Llamada después de actualizar `currentLang` | ✅ | Línea 798 actualiza `currentLang`, línea 803 llama `t()` → idioma correcto garantizado |
| Selector `#tipDriverSection h2` apunta al elemento correcto | ✅ | `index.html:247` — único `<h2>` hijo directo de `.tip-driver-header` dentro de `#tipDriverSection` |
| Guard `if (sectionH2)` previene error si DOM no está listo | ✅ | Optional guard presente |
| EN: `t("chooseDriver")` = `"Choose a driver"` | ✅ | `STRINGS.en.chooseDriver` |
| ES: `t("chooseDriver")` = `"Elige un conductor"` | ✅ | `STRINGS.es.chooseDriver` — restaura el valor original del HTML |
| `processing` definido en `STRINGS.es` y `STRINGS.en` | ✅ | `app.js:768` y `app.js:789` |
| `t("processing")` llamado en `handleTipPayment()` | ✅ | `app.js:1016` |
| No quedan strings hardcodeados del flujo público fuera de `STRINGS` | ✅ | `grep "Procesando\|Elige un conductor" app.js` → solo dentro de `STRINGS` como valores ES |
| RIESGO-01: trust notice vacío para mocks | ✅ | `app.js:896` — `driver.isMock ? "" : t("directToDriver")` |
| Toggle ES/EN sigue funcionando | ✅ | `setLang()` intacta salvo la línea añadida; listener en `setupEvents()` sin cambios |
| `providerLabel()` sigue usando `t()` | ✅ | `app.js:1224–1227` sin cambios |
| PayPal/Revolut: QR y botones correctos | ✅ | `showDriverPayView()` multi-método sin cambios |
| `leaveATip` aún no llamado (topbar estático) | ✅ | Aceptable — botón de entrada no forma parte del flujo traducido |
| Solo `app.js` modificado en esta corrección | ✅ | `git diff --stat` — `index.html` y `style.css` sin cambios adicionales |
| `supabase.sql` intacto | ✅ | 0 bytes de diff |
| Edge Functions intactas | ✅ | 0 bytes de diff |
| Sin secretos ni APIs de pago | ✅ | 0 coincidencias en grep |
| Sin errores críticos en consola | ✅ | `t("chooseDriver")` y `t("processing")` son claves presentes en ambos idiomas; guard `if (sectionH2)` cubre el caso de DOM no disponible |

---

## Re-revisión: `leaveATip` aplicado al botón topbar (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| `leaveATip` definido en `STRINGS.es` y `STRINGS.en` | ✅ | `app.js:750` y `app.js:771` |
| `t("leaveATip")` llamado en `setLang()` | ✅ | `app.js:802` — `els.darPropinaBtn.textContent = t("leaveATip")` |
| `currentLang` actualizado antes de llamar `t()` | ✅ | Línea 798 actualiza `currentLang`, línea 802 llama `t()` — orden correcto |
| EN: botón muestra "💸 Leave a tip" | ✅ | `STRINGS["en"]["leaveATip"]` = `"💸 Leave a tip"` |
| ES: botón muestra "💸 Dar propina" | ✅ | `STRINGS["es"]["leaveATip"]` = `"💸 Dar propina"` |
| CTA no roto — listener de click intacto | ✅ | `els.darPropinaBtn.addEventListener("click", showTipSection)` línea 688 — listener sobre elemento DOM, no sobre textContent |
| CTA no roto — clases CSS intactas | ✅ | `.tip-tab .btn` no se modifican |
| `supabase.sql` intacto | ✅ | 0 bytes de diff |
| Edge Functions intactas | ✅ | 0 bytes de diff |
| Ninguna clave de `STRINGS` queda sin usar | ✅ | `leaveATip`, `chooseDriver`, `processing` — todas aplicadas |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

Los 25 checks del QA inicial pasan. BUG-01, BUG-02 y RIESGO-01 resueltos. La clave `leaveATip` queda aplicada. El sistema i18n ES/EN cubre todos los textos visibles del flujo público de "Dar propina" — incluyendo el botón CTA del topbar, el encabezado de sección, la trust notice, el QR hint, los botones de pago, el estado "Procesando..." y la confirmación. Ninguna clave de `STRINGS` queda sin usar. `supabase.sql`, Edge Functions, admin y "Mi enlace" intactos.

Los riesgos informativos pendientes (botones de nav `← Volver` / `← Conductores` no traducidos, flash visual en cambio de idioma) son opcionales y no afectan al flujo de pago.

Sprint 3H listo para avanzar a Sprint 3I.
