# Sprint 3A Handoff Dev: Implementación de pago externo PayPal

## Orden de implementación

1. **Supabase SQL** — añadir columnas y recrear vista (15 min)
2. **`app.js`** — actualizar lógica de render y pago (45 min)
3. **`index.html`** — ampliar formulario de edición admin y vista de pago (30 min)
4. **`style.css`** — nuevos estilos de badge y botón de pago (20 min)
5. **Prueba manual** — configurar un conductor con PayPal y validar QR + botón (20 min)

---

## Paso 1: Supabase SQL Editor

Ejecutar el SQL completo de `docs/sprint-3A/database-plan.md`. Verificar con las queries de validación que las columnas y la vista son correctas.

---

## Paso 2: `app.js`

### 2.1 Actualizar `loadPublicDrivers()`

```javascript
const { data, error } = await client
  .from('public_driver_profiles')
  .select('id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions')
  .order('display_name');
```

### 2.2 Actualizar objeto `normalized` en `renderDriverList()`

```javascript
const normalized = {
  id: driver.id,
  name: driver.display_name || driver.name || 'Conductor',
  bio: [driver.vehicle_info, driver.route_info].filter(Boolean).join(' · ') || driver.bio || '',
  emoji: driver.emoji || '🚌',
  slug: driver.tip_link_slug || driver.slug || null,
  tip_link_slug: driver.tip_link_slug || driver.slug || null,
  public_url: driver.public_url || null,
  isMock: driver.isMock || false,
  payment_provider: driver.payment_provider || null,
  payment_url: driver.payment_url || null,
  payment_instructions: driver.payment_instructions || null,
};
```

### 2.3 Actualizar `showDriverPayView()`

```javascript
function showDriverPayView(driver) {
  selectedDriver = driver;
  selectedTipAmount = 0;

  els.driverList.classList.add('hidden');
  els.driverPayView.classList.remove('hidden');
  els.payConfirm.classList.add('hidden');
  els.payTipBtn.classList.remove('hidden');

  const driverName = driver.display_name || driver.name || '';
  const driverBio = driver.bio || [driver.vehicle_info, driver.route_info].filter(Boolean).join(' · ') || '';
  els.payDriverEmoji.textContent = driver.emoji || '🚌';
  els.payDriverName.textContent = driverName;
  els.payDriverBio.textContent = driverBio;

  // QR: prioridad payment_url > public_url > demo
  const qrData = (!driver.isMock && driver.payment_url)
    ? driver.payment_url
    : driver.public_url
    ? driver.public_url
    : `tips-la-liga-demo-${driver.tip_link_slug || driver.slug || 'demo'}`;
  els.driverQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  // Mostrar u ocultar sección de pago externo
  const externalPaySection = els.driverPayView.querySelector('.external-pay-section');
  const chipSection = els.tipChips.parentElement; // el div que contiene chips + input

  if (!driver.isMock && driver.payment_url) {
    // Conductor real con pago externo
    if (externalPaySection) {
      externalPaySection.classList.remove('hidden');
      const instructionsEl = externalPaySection.querySelector('.payment-instructions');
      if (instructionsEl) instructionsEl.textContent = driver.payment_instructions || '';
      const payBtn = externalPaySection.querySelector('.external-pay-btn');
      if (payBtn) {
        const label = driver.payment_provider === 'paypal' ? 'Pagar con PayPal →' : 'Pagar →';
        payBtn.textContent = label;
      }
    }
    // Ocultar chips/input de importe (el importe se elige en PayPal)
    els.tipChips.innerHTML = '';
    els.customAmount.classList.add('hidden');
    els.payTipBtn.classList.add('hidden');
    const demoNoticeEl = els.driverPayView.querySelector('.demo-notice');
    if (demoNoticeEl) demoNoticeEl.classList.add('hidden');
  } else {
    // Sin pago externo o mock
    if (externalPaySection) externalPaySection.classList.add('hidden');
    els.customAmount.classList.remove('hidden');
    const demoNoticeEl = els.driverPayView.querySelector('.demo-notice');
    if (demoNoticeEl) {
      demoNoticeEl.classList.remove('hidden');
      demoNoticeEl.textContent = driver.isMock
        ? '🧪 Modo demo — el pago no es real'
        : 'Este conductor aún no tiene método de pago configurado.';
    }
    els.customAmount.value = '';
    els.tipChips.innerHTML = '';
    for (const amount of TIP_CHIP_AMOUNTS) {
      // ... (lógica existente de chips)
    }
    updatePayButton();
  }
}
```

### 2.4 Actualizar `handleTipPayment()`

```javascript
async function handleTipPayment() {
  if (!selectedDriver || selectedTipAmount <= 0) return;

  // Conductor real con pago externo (PayPal, etc.)
  if (!selectedDriver.isMock && selectedDriver.payment_url) {
    let payUrl = selectedDriver.payment_url;
    // Añadir importe al link PayPal.me si el usuario seleccionó uno
    if (selectedTipAmount > 0 && payUrl.includes('paypal.me')) {
      payUrl = `${payUrl.replace(/\/$/, '')}/${selectedTipAmount.toFixed(2)}`;
    }
    window.open(payUrl, '_blank', 'noopener');
    return;
  }

  // Conductor real con Stripe (aparcado, funciona si charges_enabled)
  const slug = selectedDriver.tip_link_slug || selectedDriver.slug;
  if (slug && client && !selectedDriver.isMock) {
    // ... (lógica existente de Stripe Checkout)
  }

  // MOCK_DRIVER — simulación
  const driverName = selectedDriver.display_name || selectedDriver.name || 'el conductor';
  els.payTipBtn.disabled = true;
  els.payTipBtn.textContent = 'Procesando...';
  setTimeout(() => {
    els.confirmMsg.textContent = `¡Propina de ${Number(selectedTipAmount).toFixed(2).replace('.', ',')} € enviada a ${driverName}!`;
    els.payConfirm.classList.remove('hidden');
    els.payTipBtn.classList.add('hidden');
  }, 1500);
}
```

### 2.5 Actualizar `loadDriverProfiles()` (panel admin)

Añadir campos al SELECT:
```javascript
.select('id, driver_id, display_name, vehicle_info, route_info, stripe_status, charges_enabled, payouts_enabled, tip_link_slug, public_url, is_active, is_visible, payment_provider, payment_url, payment_instructions')
```

### 2.6 Actualizar `openEditDriverDialog()`

```javascript
function openEditDriverDialog(dataset) {
  els.editDriverId.value = dataset.driverId;
  els.editDriverName.value = dataset.displayName || '';
  els.editDriverVehicle.value = dataset.vehicle || '';
  els.editDriverRoute.value = dataset.route || '';
  els.editDriverVisible.checked = dataset.visible === '1';
  els.editPaymentProvider.value = dataset.paymentProvider || '';
  els.editPaymentUrl.value = dataset.paymentUrl || '';
  els.editPaymentInstructions.value = dataset.paymentInstructions || '';
  els.editDriverDialog.showModal();
}
```

### 2.7 Actualizar `saveEditDriver()`

Añadir campos al objeto `updates`:
```javascript
const updates = {
  display_name: els.editDriverName.value.trim(),
  vehicle_info: els.editDriverVehicle.value.trim() || null,
  route_info: els.editDriverRoute.value.trim() || null,
  is_visible: els.editDriverVisible.checked,
  payment_provider: els.editPaymentProvider.value || null,
  payment_url: els.editPaymentUrl.value.trim() || null,
  payment_instructions: els.editPaymentInstructions.value.trim() || null,
};
```

### 2.8 Actualizar `renderDriverProfiles()`

Añadir `data-payment-provider`, `data-payment-url`, `data-payment-instructions` al botón "Editar" y mostrar badge de proveedor:

```javascript
// Badge de proveedor (junto al badge de stripe_status)
const providerLabel = driver.payment_provider === 'paypal' ? 'PayPal' : null;
const providerBadgeHtml = providerLabel
  ? `<span class="payment-badge payment-${escapeHtml(driver.payment_provider)}">${escapeHtml(providerLabel)}</span>`
  : '';

// En el botón Editar añadir data attributes:
data-payment-provider="${escapeHtml(driver.payment_provider || '')}"
data-payment-url="${escapeHtml(driver.payment_url || '')}"
data-payment-instructions="${escapeHtml(driver.payment_instructions || '')}"
```

---

## Paso 3: `index.html`

### 3.1 Añadir sección de pago externo en `#driverPayView`

Añadir después del `<div class="qr-box">`:

```html
<!-- Sprint 3A: sección de pago externo -->
<div class="external-pay-section hidden">
  <p class="payment-instructions help"></p>
  <button class="btn primary external-pay-btn" type="button">Pagar →</button>
  <p class="payment-provider-notice help">
    🔗 El pago se completa en el proveedor externo. Esta app no procesa ni registra la transacción.
  </p>
</div>
```

### 3.2 Ampliar `#editDriverDialog`

Añadir antes de `<div class="dialog-actions">`:

```html
<label for="editPaymentProvider">Proveedor de pago</label>
<select id="editPaymentProvider">
  <option value="">Sin configurar</option>
  <option value="paypal">PayPal</option>
</select>

<label for="editPaymentUrl">Enlace de pago</label>
<input id="editPaymentUrl" type="url" maxlength="300" placeholder="https://paypal.me/tu_usuario" />

<label for="editPaymentInstructions">Instrucciones para el cliente</label>
<textarea id="editPaymentInstructions" maxlength="200" rows="2" placeholder="Ej. Pon tu nombre en el concepto"></textarea>
```

### 3.3 Añadir referencias en `els` (app.js)

```javascript
editPaymentProvider: $('#editPaymentProvider'),
editPaymentUrl: $('#editPaymentUrl'),
editPaymentInstructions: $('#editPaymentInstructions'),
```

---

## Paso 4: `style.css`

```css
.payment-badge {
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.payment-paypal { background: #009cde; color: #fff; }
.payment-none   { background: #f1f1f1; color: #555; }

.external-pay-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.external-pay-btn {
  width: 100%;
  padding: 16px;
  font-size: 17px;
  background: #009cde;  /* azul PayPal */
}
.external-pay-btn:hover { background: #007ab5; }

.payment-provider-notice {
  text-align: center;
  font-size: 12px;
}

.payment-instructions {
  text-align: center;
  font-style: italic;
}
```

---

## Archivos a NO modificar

- Edge Functions de Stripe Connect
- `supabase.sql` (ejecutar el ALTER via SQL Editor, no en el archivo del repo todavía)
- Columnas Stripe existentes

## Nota sobre Stripe Connect aparcado

Los botones "Onboarding", "Actualizar estado" y "Test 1€" del panel admin pueden mantenerse o envolverse en una sección colapsable "Stripe Connect (avanzado)". No eliminarlos.
