# Sprint 3F Handoff Dev

## Contexto

Tienes que hacer 5 cambios pequeños en `app.js`. Ninguno afecta a `supabase.sql`, `index.html`, `style.css` ni Edge Functions.

Los cambios son:
- Eliminar código muerto que quedó tras la reescritura de Sprint 3D.
- Ajustar un SELECT que pide columnas que ya no usa.
- Mejorar dos mensajes de estado vacío.
- Hacer explícita una condición implícita en el flujo Stripe.

---

## C01 — Eliminar código muerto de Sprint 3C

### `selfQrPreviewTimer` (línea ~1332)
```javascript
// ELIMINAR esta línea:
let selfQrPreviewTimer = null;
```

### `updateSelfUrlPreview()` (línea ~1334, función completa)
Referencia a elementos DOM dinámicos (`selfPaymentProvider`, `selfPaymentUrl`, `selfUrlValidationHint`, etc.) que `showDriverSelfSection()` ya no genera tras la reescritura de Sprint 3D. Ningún caller en el código.

```javascript
// ELIMINAR toda la función:
function updateSelfUrlPreview() {
  ...
}
```

### `saveDriverSelfProfile()` (línea ~1382, función completa)
El formulario que la invocaba (`selfDriverProfile` form con `selfPaymentProvider`, `selfPaymentUrl`, etc.) fue reemplazado por `renderMethodList()` en Sprint 3D. Ningún caller en el código.

```javascript
// ELIMINAR toda la función:
async function saveDriverSelfProfile(event) {
  ...
}
```

---

## C02 — Quitar campos legacy del SELECT en `loadDriverSelfProfile()`

### Ubicación: línea ~1267

```javascript
// ANTES:
const { data, error } = await client
  .from("driver_payment_profiles")
  .select("id, driver_id, display_name, payment_provider, payment_url, payment_instructions, is_visible")
  .eq("driver_id", currentUser.id)
  .maybeSingle();

// DESPUÉS:
const { data, error } = await client
  .from("driver_payment_profiles")
  .select("id, driver_id, display_name, is_visible")
  .eq("driver_id", currentUser.id)
  .maybeSingle();
```

**Por qué:** `showDriverSelfSection()` ya no usa `payment_provider/url/instructions` del perfil. Los métodos se cargan desde `driver_payment_methods` via `loadSelfMethods()`. Reducir el SELECT evita traer datos que no se muestran.

**Precaución:** `driverSelfProfile` sigue siendo accedido en `saveDriverProfile()` (que hace spread `{ ...driverSelfProfile }`) y en `showDriverSelfSection()` (que accede a `p.display_name`, `p.is_visible` y `driverSelfProfile.id`). Ninguno de estos necesita los tres campos eliminados. ✅

---

## C03 — Mejorar estado vacío en `renderMethodList()` (línea ~1510)

```javascript
// ANTES:
if (!methods.length) {
  container.innerHTML = "<p class='help' style='margin-bottom:12px'>Sin métodos configurados.</p>";
}

// DESPUÉS:
if (!methods.length) {
  container.innerHTML = `<p class='help' style='margin-bottom:12px'>
    Aún no tienes métodos de pago.<br>
    Añade PayPal o Revolut para aparecer en "Dar propina".
  </p>`;
}
```

**Nota:** `renderMethodList` lo usa tanto el conductor desde "Mi enlace" como el admin desde "Métodos de pago". El texto en primera persona ("Aún no tienes") es apropiado para el conductor; para el admin también es claro en contexto. Si se quiere personalizar en el futuro, se puede pasar un parámetro de contexto.

---

## C04 — Ajustar mensaje en `showDriverPayView()` (línea ~900)

```javascript
// ANTES (dentro de la rama else de hasExternalPay, cuando no es mock y no tiene slug):
demoNoticeEl.textContent = driver.isMock
  ? "🧪 Modo demo — el pago no es real"
  : (driver.tip_link_slug || driver.slug)
    ? "🧪 Modo test — el pago es de prueba con Stripe"
    : "Este conductor aún no tiene método de pago configurado.";

// DESPUÉS:
demoNoticeEl.textContent = driver.isMock
  ? "🧪 Modo demo — el pago no es real"
  : (driver.tip_link_slug || driver.slug)
    ? "🧪 Modo test — el pago es de prueba con Stripe"
    : "Sin método de pago configurado aún.";
```

Cambio cosmético mínimo. Texto más conciso.

---

## C05 — Corregir condición Stripe en `handleTipPayment()` (línea ~943)

```javascript
// ANTES:
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url) {

// DESPUÉS:
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url && !selectedDriver.payment_methods?.length) {
```

**Por qué:** Si un conductor tiene `payment_methods` pero `payment_url` es `null`, la condición actual activaría la rama Stripe. En la práctica esto no ocurre (si `hasExternalPay = true` el `payTipBtn` está oculto), pero la condición debe ser explícita para que el código sea correcto por sí mismo, no por dependencia implícita del estado del botón.

---

## Orden de implementación sugerido

1. C05 — una línea, verificable aisladamente.
2. C02 — quitar 3 campos del SELECT.
3. C03 — mejorar el mensaje vacío.
4. C04 — cambio de texto.
5. C01 — eliminar las dos funciones y la variable.

---

## Verificación post-implementación

Antes de crear el dev-summary, verificar en `app.js`:

- [ ] `selfQrPreviewTimer` no aparece en ninguna línea.
- [ ] `updateSelfUrlPreview` no aparece en ninguna línea.
- [ ] `saveDriverSelfProfile` no aparece en ninguna línea.
- [ ] `loadDriverSelfProfile` SELECT contiene exactamente: `id, driver_id, display_name, is_visible`.
- [ ] `renderMethodList` empty state contiene "Añade PayPal o Revolut".
- [ ] `handleTipPayment` condición Stripe incluye `!selectedDriver.payment_methods?.length`.
- [ ] `supabase.sql` sin modificar (`git diff HEAD -- supabase.sql` → 0 líneas).
- [ ] `index.html` sin modificar.
- [ ] `style.css` sin modificar.
- [ ] `supabase/functions/` sin modificar.
