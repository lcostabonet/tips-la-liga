# Sprint 3H Plan: Rediseño profesional y experiencia bilingüe de "Dar propina"

## Contexto

La app funciona correctamente. El modelo de múltiples métodos de pago (Sprint 3D–3F) está estabilizado. El flujo de "Dar propina" es funcional pero visualmente informal y completamente en español.

Sprint 3H tiene dos objetivos paralelos:
1. **Diseño profesional**: mejorar la percepción visual de la web para clientes externos que pagan propinas a conductores.
2. **Bilingüe (ES/EN)**: permitir que clientes no hispanohablantes entiendan el flujo de "Dar propina".

---

## Objetivos

### Diseño
- CTA "Dar propina" en topbar: más grande, más prominente.
- Sección "Dar propina": encabezado claro, texto de confianza, bloques de pago mejorados.
- `.payment-method-block`: más visual, más espacioso, con hover.
- QR: ligeramente más grande para mejor lectura en móvil.
- Reducir informalidad: eliminar `.demo-badge` del encabezado público (queda para conductores/admin).

### i18n
- Toggle ES / EN visible solo en la sección "Dar propina".
- Objeto `STRINGS = { es: {}, en: {} }` con todas las cadenas públicas.
- Helper `t(key)` que devuelve la cadena en el idioma activo.
- `setLang(lang)` que actualiza `currentLang` y re-renderiza la vista actual.
- Aplicar a toda la experiencia pública: lista de conductores, vista de pago, botones de método, avisos.
- Panel admin, "Mi enlace" y formularios de conductor quedan en español.

---

## Alcance — archivos modificados

| Archivo | Cambios |
|---|---|
| `index.html` | Toggle ES/EN en `#tipDriverSection`, aviso de confianza en `#driverPayView` |
| `style.css` | Bloque Sprint 3H: CTA, lang toggle, trust notice, mejoras de bloque de pago |
| `app.js` | `STRINGS`, `currentLang`, `t()`, `setLang()`, aplicación en flujo público |

## Alcance — archivos NO modificados

- `supabase.sql` — sin cambios
- `supabase/functions/**` — sin cambios
- Stripe Connect — aparcado, sin tocar

---

## Cambios por archivo

### `index.html`

**C01 — Toggle ES/EN en el encabezado de "Dar propina"**
En `.tip-driver-header` (dentro de `#tipDriverSection`), añadir un `<div class="lang-toggle">` con dos botones `data-lang="es"` y `data-lang="en"`. El toggle es visible en toda la sección (lista de conductores y vista de pago).

**C02 — Aviso de confianza en `#driverPayView`**
Inmediatamente después de `.driver-pay-header`, añadir un `<p id="tipTrustNotice" class="tip-trust-notice"></p>` que se rellena dinámicamente con `t('directToDriver')`. Así el texto cambia de idioma sin re-renderizar toda la vista.

**C03 — Eliminar `.demo-badge` del encabezado público**
El badge "🧪 Demo" en `.tip-driver-header` es visible para todos los usuarios y reduce la credibilidad. Eliminarlo del HTML. Si en el futuro se quiere un aviso de entorno de desarrollo, se añadirá condicionalmente desde JS.

---

### `style.css` — bloque Sprint 3H

**D01 — CTA principal más prominente**
Override de `.tip-tab` para mayor padding, font-size y min-height. El botón de "Dar propina" es el único CTA público primario.

**D02 — Toggle de idioma**
`.lang-toggle`, `.lang-btn`, `.lang-btn.active` — diseño coherente con `.auth-tabs` existente.

**D03 — Aviso de confianza (trust notice)**
`.tip-trust-notice` — texto centrado, muted, pequeño, con icono 🔒 via `::before`.

**D04 — Mejoras de `.payment-method-block`**
Más padding, borde más grueso, `border-radius: 24px`, efecto hover. Override de los valores existentes del bloque Sprint 3D.

**D05 — Mejora del `.qr-hint`**
Centrado con icono, ligeramente más prominente.

---

### `app.js`

**I01 — `STRINGS` y helpers**
Constante `STRINGS = { es: {...}, en: {...} }` con todas las cadenas del flujo público.
Variables `let currentLang = 'es'`.
Función `t(key)` — devuelve `STRINGS[currentLang][key]`.
Función `setLang(lang)` — actualiza `currentLang`, actualiza clases de botones `.lang-btn`, re-renderiza la vista activa.

**I02 — Aplicar `t()` en `renderDriverList()`**
Textos: "Cargando conductores...", "No hay conductores disponibles...", botón "Dar propina" en cada tarjeta.

**I03 — Aplicar `t()` en `showDriverPayView()`**
Textos: trust notice, QR hint, demo/test/sin método notice, provider notice, instrucciones.
Botones de método: usar `t('payWith_' + provider)` o helper `tProviderLabel(provider)`.

**I04 — Aplicar `t()` en `providerLabel()`**
La función devuelve la cadena del proveedor en el idioma activo. Solo afecta a `showDriverPayView()` (el único caller).

**I05 — Aplicar `t()` en `updatePayButton()` y `handleTipPayment()`**
"Selecciona un importe", "Pagar X €", "¡Propina enviada a [nombre]!", "Dar otra propina".

**I06 — Listener del toggle de idioma en `setupEvents()`**
Delegación de click en `.lang-toggle` para manejar ambos botones con un solo listener.

---

## Orden de implementación sugerido

1. `STRINGS` + `t()` + `setLang()` en `app.js` (base del sistema i18n)
2. Toggle HTML en `index.html`
3. Trust notice HTML en `index.html`
4. Eliminar `.demo-badge` de `index.html`
5. Aplicar `t()` en todas las funciones del flujo público
6. Listener del toggle en `setupEvents()`
7. Bloque CSS Sprint 3H en `style.css`
8. Ajuste fino y verificación

---

## Resultado esperado

- Un usuario angloparlante puede abrir "Dar propina", pulsar "EN", seleccionar un conductor y pagar con PayPal o Revolut sin leer español.
- La web proyecta mayor seriedad: botón CTA grande y prominente, texto de confianza, bloques de pago limpios.
- La informalidad del badge demo no contamina la experiencia del cliente.
- Todo el código nuevo es HTML, CSS y JavaScript puro sin librerías.
