# Sprint 3F Dev Summary

## Qué se implementó

Estabilización del modelo de múltiples métodos de pago. Eliminación de código muerto de Sprint 3C que quedó inalcanzable tras la reescritura de Sprint 3D. Mejoras de UX en estados vacíos. Corrección de la condición implícita de activación de Stripe.

---

## Archivos modificados

### `app.js` — 5 cambios, solo este archivo

---

### C01 — Código muerto de Sprint 3C eliminado

Tres declaraciones sin caller tras la reescritura de `showDriverSelfSection()` en Sprint 3D:

| Eliminado | Motivo |
|---|---|
| `let selfQrPreviewTimer = null` | Solo usada por `updateSelfUrlPreview()` |
| `function updateSelfUrlPreview()` | Referenciaba elementos dinámicos (`selfPaymentProvider`, `selfPaymentUrl`, etc.) que `showDriverSelfSection()` ya no genera |
| `async function saveDriverSelfProfile()` | El formulario inline de Sprint 3C fue reemplazado por `renderMethodList()` en Sprint 3D |

Ninguna de estas funciones tenía caller. Su eliminación no cambia ningún comportamiento observable.

---

### C02 — SELECT de `loadDriverSelfProfile()` ajustado

```javascript
// Antes:
.select("id, driver_id, display_name, payment_provider, payment_url, payment_instructions, is_visible")

// Después:
.select("id, driver_id, display_name, is_visible")
```

`showDriverSelfSection()` usa `driverSelfProfile.id`, `display_name` e `is_visible`. Los tres campos legacy eliminados no se acceden en ningún punto del flujo de "Mi enlace" tras Sprint 3D.

---

### C03 — Mensaje vacío en `renderMethodList()`

```javascript
// Antes:
container.innerHTML = "<p class='help' style='margin-bottom:12px'>Sin métodos configurados.</p>";

// Después (post corrección RIESGO-01 QA):
container.innerHTML = `<p class='help' style='margin-bottom:12px'>Sin métodos de pago configurados.<br>Añade PayPal o Revolut para aparecer en "Dar propina".</p>`;
```

Mensaje neutral en tercera persona. Funciona correctamente tanto en "Mi enlace" (conductor) como en el panel admin "Métodos de pago" (admin viendo el perfil de un conductor). La formulación inicial usaba primera persona ("Aún no tienes"), que era inapropiada en el contexto del admin.

---

### C04 — Mensaje en "Dar propina" sin métodos

```javascript
// Antes:
: "Este conductor aún no tiene método de pago configurado.";

// Después:
: "Sin método de pago configurado aún.";
```

Texto más conciso. Mismo significado.

---

### C05 — Condición Stripe en `handleTipPayment()`

```javascript
// Antes:
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url) {

// Después:
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url && !selectedDriver.payment_methods?.length) {
```

Corrige RIESGO-01 de Sprint 3D. Si un conductor tiene `payment_methods` pero `payment_url` legacy es `null`, la condición anterior era `true` y la rama Stripe se activaba (aunque en la práctica `payTipBtn` estaba oculto). Ahora la condición es correcta por sí misma.

---

### C06 — Guarda `if (!driverSelfProfile)` en `showDriverSelfSection()` (corrección post-QA)

```javascript
// Antes:
async function showDriverSelfSection() {
  if (!currentUser) return;
  // p = driverSelfProfile → TypeError si null

// Después:
async function showDriverSelfSection() {
  if (!currentUser) return;
  if (!driverSelfProfile) return;
```

Cierra RIESGO-02 de Sprint 3F: una race condition extrema podía causar `TypeError: Cannot read properties of null (reading 'display_name')` si `driverSelfProfile` era `null` al llamar a la función. En flujo normal es imposible (el botón solo aparece cuando existe el perfil), pero la guarda hace la función correcta por sí misma.

---

## Archivos NO modificados

- `index.html` ✅
- `style.css` ✅
- `supabase.sql` ✅
- `supabase/functions/**` ✅

---

## Qué sigue usando campos legacy (intencionadamente)

- `loadPublicDrivers()` — incluye `payment_provider/url/instructions` para el fallback de "Dar propina"
- `showDriverPayView()` — flujo fallback activo cuando `payment_methods` es null/vacío
- `loadDriverProfiles()` — admin necesita ver y editar campos legacy
- `saveEditDriver()` — escritura admin a campos legacy (mecanismo de migración manual)
- `renderDriverProfiles()` — badge de `payment_provider` en panel admin

Ver `docs/sprint-3F/legacy-cleanup-plan.md` para el inventario completo y el plan de Sprint 3G.
