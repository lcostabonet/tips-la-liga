# Sprint 3C Handoff Dev: Autoservicio de enlace de pago para conductores

## Contexto
Sprint 3B implementó el panel admin con validación en tiempo real, QR preview y botón "Probar →". Sprint 3C replica ese patrón para que el conductor gestione su propio enlace sin intermediario. Sin cambios en Supabase SQL ni Edge Functions. `isValidPaymentUrl()` y `VALID_PAYPAL_DOMAINS` ya existen en `app.js` y se reutilizan tal cual.

---

## Paso 1: `index.html`

### 1.1 — Botón en el topbar

Añadir `#driverLinkBtn` entre `#adminBtn` y `#userBox`:

```html
<button id="adminBtn" class="btn ghost admin-btn hidden" type="button">🚌 Conductores</button>
<button id="driverLinkBtn" class="btn ghost driver-link-btn hidden" type="button">🔗 Mi enlace</button>
<div id="userBox" class="user-box hidden">
```

### 1.2 — Nueva sección `#driverSelfSection`

Añadir después de `#adminDriversSection` y antes de `#editDriverDialog`:

```html
<section id="driverSelfSection" class="hidden">
  <div class="section-title driver-self-header">
    <button id="backFromSelfBtn" class="btn ghost" type="button">← Volver</button>
    <h2>🔗 Mi enlace de propinas</h2>
  </div>

  <div id="driverSelfContent">
    <!-- Se rellena desde JS si hay perfil -->
  </div>
</section>
```

El contenido de `#driverSelfContent` se renderiza desde `showDriverSelfSection()` para evitar IDs duplicados entre el form del admin y el del conductor. Ver Paso 3.4.

---

## Paso 2: `style.css`

Añadir bloque Sprint 3C al final del archivo:

```css
/* ===== Sprint 3C: Autoservicio de enlace de pago ===== */

.driver-link-btn {
  white-space: nowrap;
}

.driver-self-header {
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.driver-self-header h2 {
  margin: 0;
  flex: 1;
}

.driver-self-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 22px;
  box-shadow: var(--shadow);
  max-width: 560px;
}

.driver-self-name {
  font-size: 17px;
  font-weight: 900;
  margin-bottom: 4px;
}

.disclaimer-box {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff7d7;
  border: 1px solid #ffd86a;
  color: #5f4100;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.5;
}
```

Las clases `.url-validation-hint`, `.url-valid`, `.url-invalid`, `.url-test-row`, `.btn-sm`, `.qr-preview-box`, `.provider-select-row` ya existen desde Sprint 3B — no redefinir.

---

## Paso 3: `app.js`

### 3.1 — Nueva variable de estado

Añadir junto a las demás variables globales:

```javascript
let driverSelfProfile = null;
```

### 3.2 — Nuevas referencias en `els`

Añadir al final del objeto `els`:

```javascript
driverLinkBtn: $("#driverLinkBtn"),
driverSelfSection: $("#driverSelfSection"),
backFromSelfBtn: $("#backFromSelfBtn"),
driverSelfContent: $("#driverSelfContent"),
```

### 3.3 — Nueva función `loadDriverSelfProfile()`

```javascript
async function loadDriverSelfProfile() {
  if (!client || !currentUser) return;
  try {
    const { data, error } = await client
      .from("driver_payment_profiles")
      .select("driver_id, display_name, payment_provider, payment_url, payment_instructions, is_visible")
      .eq("driver_id", currentUser.id)
      .maybeSingle();
    if (error) throw error;
    driverSelfProfile = data || null;
  } catch {
    driverSelfProfile = null;
  }
}
```

Notas:
- `.maybeSingle()` devuelve `null` (no error) si no existe fila, a diferencia de `.single()` que lanzaría error.
- Solo selecciona los campos que el conductor puede leer/editar. No selecciona `stripe_account_id` ni campos sensibles.

### 3.4 — Nueva función `showDriverSelfSection()`

```javascript
function showDriverSelfSection() {
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.remove("hidden");

  const p = driverSelfProfile;

  els.driverSelfContent.innerHTML = `
    <div class="driver-self-card">
      <form id="driverSelfForm" class="form compact">
        <p class="driver-self-name">${escapeHtml(p.display_name)}</p>

        <label for="selfPaymentProvider">Proveedor de pago</label>
        <div class="provider-select-row">
          <select id="selfPaymentProvider">
            <option value="">Sin configurar</option>
            <option value="paypal"${p.payment_provider === "paypal" ? " selected" : ""}>PayPal</option>
          </select>
          <span id="selfProviderBadge" class="payment-badge payment-none hidden"></span>
        </div>

        <label for="selfPaymentUrl">Enlace de pago</label>
        <input id="selfPaymentUrl" type="url" maxlength="300"
               placeholder="https://paypal.me/tu_usuario"
               value="${escapeHtml(p.payment_url || "")}" />

        <div class="url-validation-hint" id="selfUrlValidationHint"></div>

        <div class="url-test-row">
          <button id="selfTestLinkBtn" class="btn ghost btn-sm" type="button" disabled>Probar enlace →</button>
        </div>

        <div class="qr-preview-box hidden" id="selfQrPreview">
          <img id="selfQrPreviewImg" src="" alt="Previsualización QR" width="120" height="120" loading="lazy" />
          <p class="help" style="font-size:11px;margin:0">Previsualización del QR</p>
        </div>

        <label for="selfPaymentInstructions">Instrucciones para el cliente (opcional)</label>
        <textarea id="selfPaymentInstructions" maxlength="200" rows="2"
                  placeholder="Ej. Pon tu nombre en el concepto"
                  style="resize:vertical">${escapeHtml(p.payment_instructions || "")}</textarea>

        <label class="checkbox-label">
          <input id="selfDriverVisible" type="checkbox"${p.is_visible ? " checked" : ""} />
          Visible en "Dar propina"
        </label>

        <div class="disclaimer-box">
          Tips La Liga no procesa pagos. El pago se realiza fuera de la app y llega directamente a ti.
        </div>

        <div class="dialog-actions" style="margin-top:8px">
          <button id="cancelSelfBtn" class="btn ghost" type="button">Cancelar</button>
          <button class="btn primary" type="submit">Guardar</button>
        </div>
      </form>
    </div>
  `;

  // Registrar listeners sobre los elementos recién creados
  document.getElementById("driverSelfForm").addEventListener("submit", saveDriverSelfProfile);
  document.getElementById("cancelSelfBtn").addEventListener("click", hideDriverSelfSection);
  document.getElementById("selfPaymentUrl").addEventListener("input", updateSelfUrlPreview);
  document.getElementById("selfPaymentProvider").addEventListener("change", updateSelfUrlPreview);
  document.getElementById("selfTestLinkBtn").addEventListener("click", () => {
    const url = document.getElementById("selfPaymentUrl").value.trim();
    if (url) window.open(url, "_blank", "noopener");
  });

  updateSelfUrlPreview();
}
```

Nota: el formulario se renderiza con `innerHTML` en cada apertura para evitar conflictos de IDs con el dialog del admin (`editPaymentProvider`, etc.). Los listeners se registran sobre los elementos recién creados.

### 3.5 — Nueva función `hideDriverSelfSection()`

```javascript
function hideDriverSelfSection() {
  els.driverSelfSection.classList.add("hidden");
  if (currentUser) els.appSection.classList.remove("hidden");
  else els.authSection.classList.remove("hidden");
}
```

### 3.6 — Timer y función `updateSelfUrlPreview()`

```javascript
let selfQrPreviewTimer = null;

function updateSelfUrlPreview() {
  const providerEl = document.getElementById("selfPaymentProvider");
  const urlEl = document.getElementById("selfPaymentUrl");
  const hintEl = document.getElementById("selfUrlValidationHint");
  const testBtn = document.getElementById("selfTestLinkBtn");
  const badgeEl = document.getElementById("selfProviderBadge");
  const qrBox = document.getElementById("selfQrPreview");
  const qrImg = document.getElementById("selfQrPreviewImg");

  if (!providerEl || !urlEl) return;

  const provider = providerEl.value;
  const url = urlEl.value.trim();
  const valid = isValidPaymentUrl(provider, url);

  hintEl.className = "url-validation-hint";
  if (valid === null) {
    hintEl.textContent = "";
  } else if (valid) {
    hintEl.classList.add("url-valid");
    hintEl.textContent = "✓ Enlace válido";
  } else {
    hintEl.classList.add("url-invalid");
    hintEl.textContent = "✗ El enlace no parece de PayPal";
  }

  testBtn.disabled = !url || valid === false;

  if (provider === "paypal") {
    badgeEl.textContent = "PayPal";
    badgeEl.className = "payment-badge payment-paypal";
    badgeEl.classList.remove("hidden");
  } else if (provider) {
    badgeEl.textContent = provider;
    badgeEl.className = "payment-badge payment-none";
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }

  clearTimeout(selfQrPreviewTimer);
  if (url && valid !== false) {
    selfQrPreviewTimer = setTimeout(() => {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
      qrBox.classList.remove("hidden");
    }, 500);
  } else {
    qrBox.classList.add("hidden");
    qrImg.src = "";
  }
}
```

Nota: usa `document.getElementById()` en lugar de `els.*` porque estos elementos se crean dinámicamente en `showDriverSelfSection()`. La guarda `if (!providerEl || !urlEl) return` previene errores si se llama antes de renderizar.

### 3.7 — Nueva función `saveDriverSelfProfile()`

```javascript
async function saveDriverSelfProfile(event) {
  event.preventDefault();
  const paymentProvider = document.getElementById("selfPaymentProvider").value || null;
  const paymentUrl = document.getElementById("selfPaymentUrl").value.trim() || null;

  if (paymentProvider === "paypal" && paymentUrl) {
    if (!isValidPaymentUrl(paymentProvider, paymentUrl)) {
      toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
      return;
    }
  }

  const updates = {
    payment_provider: paymentProvider,
    payment_url: paymentUrl,
    payment_instructions: document.getElementById("selfPaymentInstructions").value.trim() || null,
    is_visible: document.getElementById("selfDriverVisible").checked,
  };

  try {
    const { error } = await client
      .from("driver_payment_profiles")
      .update(updates)
      .eq("driver_id", currentUser.id);
    if (error) throw error;
    driverSelfProfile = { ...driverSelfProfile, ...updates };
    hideDriverSelfSection();
    toast("Enlace guardado.");
  } catch (err) {
    toast(err.message || "Error al guardar.");
  }
}
```

Notas:
- El UPDATE usa `.eq("driver_id", currentUser.id)` — la RLS `dpp_conductor_update_own` lo limita a la fila propia.
- No se modifica `display_name` ni campos Stripe.
- Tras guardar, actualiza `driverSelfProfile` en memoria para que la próxima apertura muestre los valores guardados sin necesidad de recargar desde DB.

### 3.8 — Actualizar `onAuthStateChanged()`

Añadir la carga del perfil propio y la visibilidad del botón:

```javascript
// Al hacer login (dentro del bloque try, tras loadProfile()):
await loadDriverSelfProfile();
if (driverSelfProfile) els.driverLinkBtn.classList.remove("hidden");

// Al hacer logout (dentro del bloque if (!currentUser)):
driverSelfProfile = null;
els.driverLinkBtn.classList.add("hidden");
```

### 3.9 — Actualizar `showTipSection()` y `showAdminSection()`

Añadir `els.driverSelfSection.classList.add("hidden")` al inicio de ambas funciones, igual que hacen con las demás secciones.

### 3.10 — Añadir listener en `setupEvents()`

```javascript
els.driverLinkBtn.addEventListener("click", showDriverSelfSection);
els.backFromSelfBtn.addEventListener("click", hideDriverSelfSection);
```

---

## Consideraciones de diseño

### ¿Por qué renderizar el form con innerHTML y no en HTML estático?
El form de autoservicio usa los mismos IDs lógicos que podrían colisionar con el dialog del admin si se declararan estáticamente (`selfPaymentProvider` vs `editPaymentProvider` son distintos, pero es más seguro renderizar bajo demanda para que el DOM no tenga duplicados invisibles). Además, inicializar los valores directamente en el HTML del `innerHTML` simplifica el prellenado.

### ¿Por qué `.maybeSingle()` en lugar de `.single()`?
`.single()` lanza error PostgreSQL si no encuentra fila. `.maybeSingle()` devuelve `null` silenciosamente, lo que permite distinguir "conductor sin perfil" de "error de red" sin try/catch especial.

### ¿Por qué no mostrar el botón a conductores sin perfil?
Si el botón apareciese siempre, habría que gestionar el caso "no tienes perfil aún" dentro de la sección. Ocultar el botón directamente es más limpio: el conductor sin perfil simplemente no ve la opción hasta que el admin cree su fila.

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Lógica de "Dar propina"
- Panel admin (salvo añadir `driverSelfSection` a la lista de secciones a ocultar en `showAdminSection()`)
