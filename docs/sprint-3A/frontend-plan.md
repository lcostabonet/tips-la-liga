# Sprint 3A Frontend Plan: Pago externo en "Dar propina" y panel admin

## Cambios en "Dar propina" (`showDriverPayView`)

### Lógica de renderizado por conductor

```
¿El conductor tiene payment_url?
  SÍ → mostrar flujo de pago externo:
    - QR generado a partir de payment_url
    - Badge del proveedor (PayPal, etc.)
    - payment_instructions (si existe)
    - Botón "Pagar con [proveedor] →"
    - Aviso: "🔗 El pago se completa en [proveedor], fuera de esta app"
  NO → mostrar aviso sin QR:
    - "Este conductor aún no tiene método de pago configurado."
    - Ocultar botón de pago y chips de importe
```

Para MOCK_DRIVERS (`isMock: true`): siempre mostrar QR ficticio + aviso demo, nunca abrir URLs externas.

### QR

Fuente de datos para el QR (prioridad):
1. `driver.payment_url` → QR real del enlace de pago
2. `driver.public_url` → QR del enlace de la app
3. Fallback demo

```javascript
const qrData = (!driver.isMock && driver.payment_url)
  ? driver.payment_url
  : driver.public_url
  ? driver.public_url
  : `tips-la-liga-demo-${driver.tip_link_slug || driver.slug || 'demo'}`;
```

### Botón de pago

Reemplaza el flujo de Stripe Checkout y la simulación para conductores reales con `payment_url`:

```javascript
// Si conductor real con payment_url:
button.onclick = () => window.open(driver.payment_url, '_blank', 'noopener');
```

El botón muestra el nombre del proveedor:
```
Pagar con PayPal →      (si payment_provider = 'paypal')
Pagar →                 (si payment_provider desconocido)
```

No hay `selectedTipAmount` en este flujo — el cliente introduce el importe directamente en PayPal.

### Aviso de proveedor

```html
<p class="payment-provider-notice">
  🔗 El pago se completa en PayPal, fuera de esta app.
  Tips La Liga no procesa ni registra la transacción.
</p>
```

---

## Cambios en el panel admin (`editDriverDialog`)

Añadir 3 campos al formulario de edición existente:

```html
<label for="editPaymentProvider">Proveedor de pago</label>
<select id="editPaymentProvider">
  <option value="">Sin configurar</option>
  <option value="paypal">PayPal</option>
</select>

<label for="editPaymentUrl">Enlace de pago (PayPal.me)</label>
<input id="editPaymentUrl" type="url" placeholder="https://paypal.me/tu_usuario" />

<label for="editPaymentInstructions">Instrucciones para el cliente (opcional)</label>
<textarea id="editPaymentInstructions" maxlength="200" placeholder="Ej. Pon tu nombre en el concepto"></textarea>
```

### Guardar

`saveEditDriver()` añade estos 3 campos al objeto `updates`:
```javascript
payment_provider: els.editPaymentProvider.value || null,
payment_url: els.editPaymentUrl.value.trim() || null,
payment_instructions: els.editPaymentInstructions.value.trim() || null,
```

### Visualización en la tarjeta del conductor (panel admin)

Mostrar badge de proveedor junto al badge de Stripe:
```html
<span class="payment-badge payment-paypal">PayPal</span>
<!-- o -->
<span class="payment-badge payment-none">Sin pago</span>
```

---

## Cambios en `loadPublicDrivers()`

Añadir los campos nuevos al SELECT:
```javascript
const { data } = await client
  .from('public_driver_profiles')
  .select('id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions')
  .order('display_name');
```

---

## Cambios en `handleTipPayment()`

Nueva lógica de pago para conductores reales con `payment_url`:

```javascript
async function handleTipPayment() {
  if (!selectedDriver || selectedTipAmount <= 0) return;

  // Conductor real con payment_url → abrir enlace externo directamente
  if (!selectedDriver.isMock && selectedDriver.payment_url) {
    window.open(selectedDriver.payment_url, '_blank', 'noopener');
    return;
  }

  // Conductor real con tip_link_slug (Stripe, aparcado) → mantener flujo anterior
  const slug = selectedDriver.tip_link_slug || selectedDriver.slug;
  if (slug && client && !selectedDriver.isMock) {
    // ... llamada a create-driver-payment-link (Stripe, aparcado)
  }

  // MOCK_DRIVER → simulación
  setTimeout(() => { ... }, 1500);
}
```

---

## CSS nuevos necesarios

```css
.payment-badge { ... }
.payment-paypal { background: #009cde; color: white; }  /* azul PayPal */
.payment-none   { background: #f1f1f1; color: #555; }

.payment-provider-notice { ... }  /* aviso informativo discreto */
.external-pay-btn { ... }         /* botón destacado para pago externo */
```

---

## Campos no modificados del objeto `selectedDriver`

`selectedTipAmount` se mantiene para el flujo de Stripe Connect (cuando se reactive) y para la simulación mock. En el flujo PayPal, el importe se introduce directamente en PayPal — no se usa `selectedTipAmount`.

Sin embargo, los chips de importe se pueden mantener visibles como **sugerencia** al cliente (el valor sugerido se puede añadir a la URL de PayPal.me si sigue el formato `https://paypal.me/username/5`).

---

## PayPal.me con importe sugerido (opcional Sprint 3A)

Si el URL es `https://paypal.me/username`, se puede añadir el importe seleccionado al abrir:

```javascript
let payUrl = driver.payment_url;
if (selectedTipAmount > 0 && payUrl.includes('paypal.me')) {
  payUrl = `${payUrl.replace(/\/$/, '')}/${selectedTipAmount.toFixed(2)}`;
}
window.open(payUrl, '_blank', 'noopener');
```

Esto es opcional pero mejora la UX: el cliente llega a PayPal con el importe ya prerellenado.
