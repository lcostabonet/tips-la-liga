# Sprint 3B Handoff Dev: Mejoras UX en el panel admin

## Contexto
Sprint 3A añadió el dialog de edición con los campos `payment_provider`, `payment_url`, `payment_instructions`. Sprint 3B enriquece ese dialog con validación en tiempo real, previsualización del QR y botón de prueba. Sin cambios en Supabase ni Edge Functions.

---

## Paso 1: `index.html` — ampliar el dialog de edición

Buscar el bloque `#editDriverDialog` actual y añadir los elementos nuevos entre el campo `editPaymentUrl` y el campo `editPaymentInstructions`:

```html
<!-- Sprint 3B: validación + preview inline -->
<div class="url-validation-hint" id="urlValidationHint"></div>

<div class="url-test-row">
  <button id="testLinkBtn" class="btn ghost btn-sm" type="button" disabled>Probar →</button>
</div>

<div class="qr-preview-box hidden" id="editQrPreview">
  <img id="editQrPreviewImg" src="" alt="Previsualización QR" width="120" height="120" loading="lazy" />
  <p class="help" style="font-size:11px;margin:0">Previsualización del QR</p>
</div>
```

Añadir también un badge dinámico junto al selector de proveedor:

```html
<label for="editPaymentProvider">Proveedor de pago</label>
<div class="provider-select-row">
  <select id="editPaymentProvider">
    <option value="">Sin configurar</option>
    <option value="paypal">PayPal</option>
  </select>
  <span id="editProviderBadge" class="payment-badge payment-none hidden"></span>
</div>
```

---

## Paso 2: `style.css` — nuevos estilos Sprint 3B

```css
/* ===== Sprint 3B: Validación y preview en dialog ===== */

.url-validation-hint {
  font-size: 13px;
  font-weight: 700;
  min-height: 18px;
}
.url-valid   { color: var(--success); }
.url-invalid { color: var(--danger); }

.url-test-row {
  display: flex;
  justify-content: flex-end;
}

.btn-sm {
  font-size: 13px;
  padding: 6px 12px;
}

.qr-preview-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid var(--line);
  border-radius: 14px;
}

.qr-preview-box img {
  border-radius: 8px;
  border: 1px solid var(--line);
  background: white;
}

.provider-select-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.provider-select-row select {
  flex: 1;
}
```

---

## Paso 3: `app.js` — nueva lógica de preview

### 3.1 Nuevas referencias en `els`

```javascript
testLinkBtn: $("#testLinkBtn"),
urlValidationHint: $("#urlValidationHint"),
editQrPreview: $("#editQrPreview"),
editQrPreviewImg: $("#editQrPreviewImg"),
editProviderBadge: $("#editProviderBadge"),
```

### 3.2 Constante de dominios (extraída de `saveEditDriver` para reutilizar)

Mover la lista `validPaypalDomains` fuera de `saveEditDriver` para compartirla:

```javascript
const VALID_PAYPAL_DOMAINS = [
  "https://paypal.me/",
  "https://www.paypal.me/",
  "https://paypal.com/",
  "https://www.paypal.com/",
];

function isValidPaymentUrl(provider, url) {
  if (!url) return null;           // null = sin URL (neutro)
  if (provider !== "paypal") return true;  // otros proveedores: cualquier URL
  return VALID_PAYPAL_DOMAINS.some((d) => url.startsWith(d));
}
```

### 3.3 Función `updatePaymentUrlPreview()`

```javascript
let qrPreviewTimer = null;

function updatePaymentUrlPreview() {
  const provider = els.editPaymentProvider.value;
  const url = els.editPaymentUrl.value.trim();
  const valid = isValidPaymentUrl(provider, url);

  // --- Indicador de validación ---
  els.urlValidationHint.className = "url-validation-hint";
  if (valid === null) {
    els.urlValidationHint.textContent = "";
  } else if (valid) {
    els.urlValidationHint.classList.add("url-valid");
    els.urlValidationHint.textContent = "✓ Enlace válido";
  } else {
    els.urlValidationHint.classList.add("url-invalid");
    els.urlValidationHint.textContent = "✗ El enlace no parece de PayPal";
  }

  // --- Botón "Probar →" ---
  els.testLinkBtn.disabled = !url || valid === false;

  // --- Badge de proveedor ---
  if (provider === "paypal") {
    els.editProviderBadge.textContent = "PayPal";
    els.editProviderBadge.className = "payment-badge payment-paypal";
    els.editProviderBadge.classList.remove("hidden");
  } else if (provider) {
    els.editProviderBadge.textContent = provider;
    els.editProviderBadge.className = "payment-badge payment-none";
    els.editProviderBadge.classList.remove("hidden");
  } else {
    els.editProviderBadge.classList.add("hidden");
  }

  // --- QR preview con debounce 500 ms ---
  clearTimeout(qrPreviewTimer);
  if (url && valid !== false) {
    qrPreviewTimer = setTimeout(() => {
      els.editQrPreviewImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
      els.editQrPreview.classList.remove("hidden");
    }, 500);
  } else {
    els.editQrPreview.classList.add("hidden");
    els.editQrPreviewImg.src = "";
  }
}
```

### 3.4 Actualizar `saveEditDriver()` para reutilizar `isValidPaymentUrl()`

Reemplazar el bloque de validación actual por:

```javascript
if (paymentProvider === "paypal" && paymentUrl) {
  if (!isValidPaymentUrl(paymentProvider, paymentUrl)) {
    toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
    return;
  }
}
```

### 3.5 Actualizar `openEditDriverDialog()` para inicializar el preview

Añadir al final de la función, antes de `showModal()`:

```javascript
updatePaymentUrlPreview();
```

### 3.6 Event listeners en `setupEvents()`

```javascript
els.editPaymentUrl.addEventListener("input", updatePaymentUrlPreview);
els.editPaymentProvider.addEventListener("change", updatePaymentUrlPreview);
els.testLinkBtn.addEventListener("click", () => {
  const url = els.editPaymentUrl.value.trim();
  if (url) window.open(url, "_blank", "noopener");
});
```

---

## Consideraciones de rendimiento

- El debounce de 500 ms en el QR preview evita una request por cada pulsación de tecla.
- El QR solo se genera si la URL es válida (o neutral para proveedores no-PayPal).
- El `src` se vacía al ocultar el preview para no mantener la imagen en memoria innecesariamente.

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Sección "Dar propina" (no afectada por estos cambios)
