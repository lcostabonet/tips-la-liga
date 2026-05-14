# Sprint 3D Handoff Dev: Múltiples métodos de pago externos

## Contexto
Sprint 3A añadió un único método de pago por conductor. Sprint 3D introduce `driver_payment_methods` (N métodos por conductor), actualiza la vista pública con un JSON array de métodos y adapta toda la UI. Sin cambios en Edge Functions. Las columnas legacy (`payment_provider/url/instructions`) se mantienen para compatibilidad hasta Sprint 3E.

---

## Paso 1: `supabase.sql`

Ver `docs/sprint-3D/database-plan.md` para el SQL completo. Resumen de bloques a añadir al final del archivo:

1. Tabla `driver_payment_methods` con trigger `updated_at`.
2. Constraints idempotentes: `uq_driver_payment_method_provider` + `dpm_url_valid`.
3. 5 políticas RLS + `dpm_admin_all`.
4. `grant` a `authenticated`.
5. Vista `public_driver_profiles` recreada con columna `payment_methods` JSON.

La migración de datos se ejecuta en el SQL Editor por separado (ver `migration-plan.md`).

---

## Paso 2: `app.js` — validación de dominios

### 2.1 Reemplazar `VALID_PAYPAL_DOMAINS` e `isValidPaymentUrl()`

```javascript
// Eliminar:
const VALID_PAYPAL_DOMAINS = [ ... ];

// Añadir:
const VALID_PAYMENT_DOMAINS = {
  paypal:  ["https://paypal.me/", "https://www.paypal.me/",
            "https://paypal.com/", "https://www.paypal.com/"],
  revolut: ["https://revolut.me/", "https://app.revolut.com/"],
};

// Reemplazar función isValidPaymentUrl() por:
function isValidPaymentUrl(provider, url) {
  if (!url) return null;
  const domains = VALID_PAYMENT_DOMAINS[provider];
  if (!domains) return true;
  return domains.some((d) => url.startsWith(d));
}
```

No cambia la firma de `isValidPaymentUrl()`. Todos los callers existentes (`saveEditDriver`, `saveDriverSelfProfile`, `updatePaymentUrlPreview`, `updateSelfUrlPreview`) siguen funcionando sin modificación.

---

## Paso 3: `app.js` — carga de métodos

### 3.1 `loadPublicDrivers()` — añadir `payment_methods` al SELECT

```javascript
.select("id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions, payment_methods")
```

### 3.2 `renderDriverList()` — propagar `payment_methods`

En el objeto `normalized`:
```javascript
payment_methods: driver.payment_methods || null,
```

### 3.3 Nuevas funciones de gestión

```javascript
async function loadDriverMethods(driverId) {
  const { data, error } = await client
    .from("driver_payment_methods")
    .select("id, provider, payment_url, instructions, is_active, display_order")
    .eq("driver_id", driverId)
    .order("display_order")
    .order("created_at");
  if (error) throw error;
  return data || [];
}

async function loadSelfMethods() {
  if (!client || !currentUser) return [];
  try {
    return await loadDriverMethods(currentUser.id);
  } catch {
    return [];
  }
}

async function insertDriverMethod(driverId, { provider, payment_url, instructions }) {
  const { error } = await client
    .from("driver_payment_methods")
    .insert({ driver_id: driverId, provider, payment_url, instructions });
  if (error) throw error;
}

async function updateDriverMethod(methodId, { provider, payment_url, instructions, is_active }) {
  const { error } = await client
    .from("driver_payment_methods")
    .update({ provider, payment_url, instructions, is_active })
    .eq("id", methodId);
  if (error) throw error;
}

async function deleteDriverMethod(methodId) {
  const { error } = await client
    .from("driver_payment_methods")
    .delete()
    .eq("id", methodId);
  if (error) throw error;
}
```

---

## Paso 4: `app.js` — "Dar propina"

### 4.1 Actualizar `showDriverPayView(driver)`

Añadir lógica multi-método antes del flujo legacy:

```javascript
const methods = driver.payment_methods;  // array o null
const hasMultiMethod = Array.isArray(methods) && methods.length > 0;
const hasExternalPay = !driver.isMock && (hasMultiMethod || !!driver.payment_url);

if (hasMultiMethod) {
  // Flujo Sprint 3D
  const firstMethod = methods[0];
  els.driverQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(firstMethod.payment_url)}`;

  externalPaySection.classList.remove("hidden");
  const instrEl = externalPaySection.querySelector(".payment-instructions");
  if (instrEl) instrEl.textContent = firstMethod.instructions || "";

  const methodsList = externalPaySection.querySelector(".payment-methods-list");
  methodsList.innerHTML = "";
  for (const method of methods) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn payment-method-btn ${method.provider}`;
    btn.textContent = providerLabel(method.provider);
    btn.addEventListener("click", () => {
      els.driverQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(method.payment_url)}`;
      if (instrEl) instrEl.textContent = method.instructions || "";
      window.open(method.payment_url, "_blank", "noopener");
    });
    methodsList.appendChild(btn);
  }
  // Ocultar chips y botón principal
  els.tipChips.innerHTML = "";
  els.customAmount.classList.add("hidden");
  els.payTipBtn.classList.add("hidden");
  if (demoNoticeEl) demoNoticeEl.classList.add("hidden");

} else if (!driver.isMock && driver.payment_url) {
  // Flujo legacy Sprint 3A — sin cambios
  // ...
}
```

### 4.2 Nueva función helper `providerLabel(provider)`

```javascript
function providerLabel(provider) {
  const labels = { paypal: "Pagar con PayPal →", revolut: "Pagar con Revolut →" };
  return labels[provider] || `Pagar con ${provider} →`;
}
```

---

## Paso 5: `app.js` — Panel admin: sección de métodos

### 5.1 Variables y `els` nuevos

```javascript
let currentAdminMethodsDriverId = null;

// En els:
driverMethodsSection: $("#driverMethodsSection"),
backFromMethodsBtn:   $("#backFromMethodsBtn"),
driverMethodsContent: $("#driverMethodsContent"),
```

### 5.2 `showDriverMethodsSection(driverDataset)`

```javascript
async function showDriverMethodsSection(driverDataset) {
  currentAdminMethodsDriverId = driverDataset.driverId;
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.remove("hidden");

  const methods = await loadDriverMethods(driverDataset.driverId);
  renderMethodList(methods, els.driverMethodsContent, driverDataset.driverId, driverDataset.displayName);
}

function hideDriverMethodsSection() {
  els.driverMethodsSection.classList.add("hidden");
  if (currentUser) showAdminSection();
}
```

### 5.3 `renderMethodList(methods, container, driverId, driverName)`

```javascript
function renderMethodList(methods, container, driverId, driverName) {
  container.innerHTML = `<h3 style="margin-bottom:16px">${escapeHtml(driverName || "Conductor")}</h3>`;
  if (!methods.length) {
    container.innerHTML += `<p class="help">Sin métodos configurados.</p>`;
  }
  for (const m of methods) {
    const item = document.createElement("div");
    item.className = "method-list-item";
    item.innerHTML = `
      <span class="payment-badge payment-${escapeHtml(m.provider)}">${escapeHtml(providerLabel(m.provider).replace(" →", "").replace("Pagar con ", ""))}</span>
      <span class="method-url help">${escapeHtml(m.payment_url)}</span>
      <span class="method-status ${m.is_active ? "flag-ok" : "flag-no"}">${m.is_active ? "Activo" : "Inactivo"}</span>
      <div class="method-actions">
        <button class="btn ghost" data-method-id="${escapeHtml(m.id)}" data-action="edit-method">Editar</button>
        <button class="btn danger" data-method-id="${escapeHtml(m.id)}" data-action="delete-method">Eliminar</button>
      </div>
    `;
    container.appendChild(item);
  }
  const addBtn = document.createElement("button");
  addBtn.className = "btn ghost";
  addBtn.type = "button";
  addBtn.textContent = "+ Añadir método";
  addBtn.addEventListener("click", () => showMethodForm(null, driverId, container));
  container.appendChild(addBtn);

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "delete-method") {
      if (!confirm("¿Eliminar este método de pago?")) return;
      await deleteDriverMethod(btn.dataset.methodId);
      const methods2 = await loadDriverMethods(driverId);
      renderMethodList(methods2, container, driverId, driverName);
    }
    if (btn.dataset.action === "edit-method") {
      showMethodForm(btn.dataset.methodId, driverId, container, driverName);
    }
  });
}
```

### 5.4 `showMethodForm(methodId, driverId, listContainer, driverName)`

Renderiza un formulario inline debajo de la lista. Si `methodId` es null, es creación; si tiene valor, es edición.

```javascript
async function showMethodForm(methodId, driverId, listContainer, driverName) {
  // Cargar datos si es edición
  let existing = null;
  if (methodId) {
    const methods = await loadDriverMethods(driverId);
    existing = methods.find(m => m.id === methodId) || null;
  }

  const formEl = document.createElement("div");
  formEl.className = "driver-self-card";
  formEl.style.marginTop = "16px";
  formEl.innerHTML = `
    <form id="methodForm" class="form compact">
      <label for="mProvider">Proveedor</label>
      <div class="provider-select-row">
        <select id="mProvider">
          <option value="paypal"${existing?.provider === "paypal" ? " selected" : ""}>PayPal</option>
          <option value="revolut"${existing?.provider === "revolut" ? " selected" : ""}>Revolut</option>
        </select>
        <span id="mProviderBadge" class="payment-badge payment-none hidden"></span>
      </div>
      <label for="mUrl">Enlace de pago</label>
      <input id="mUrl" type="url" maxlength="300"
             placeholder="https://paypal.me/... o https://revolut.me/..."
             value="${escapeHtml(existing?.payment_url || "")}" />
      <div class="url-validation-hint" id="mUrlHint"></div>
      <div class="url-test-row">
        <button id="mTestBtn" class="btn ghost btn-sm" type="button" disabled>Probar →</button>
      </div>
      <div class="qr-preview-box hidden" id="mQrPreview">
        <img id="mQrImg" src="" alt="QR preview" width="120" height="120" loading="lazy" />
      </div>
      <label for="mInstructions">Instrucciones (opcional)</label>
      <textarea id="mInstructions" maxlength="200" rows="2" style="resize:vertical">${escapeHtml(existing?.instructions || "")}</textarea>
      <label class="checkbox-label">
        <input id="mIsActive" type="checkbox"${(existing?.is_active !== false) ? " checked" : ""} />
        Activo
      </label>
      <div class="dialog-actions" style="margin-top:8px">
        <button id="mCancelBtn" class="btn ghost" type="button">Cancelar</button>
        <button class="btn primary" type="submit">${methodId ? "Guardar cambios" : "Añadir método"}</button>
      </div>
    </form>
  `;

  listContainer.appendChild(formEl);

  // Preview listeners
  const providerEl = document.getElementById("mProvider");
  const urlEl = document.getElementById("mUrl");
  providerEl.addEventListener("change", updateMethodFormPreview);
  urlEl.addEventListener("input", updateMethodFormPreview);
  document.getElementById("mTestBtn").addEventListener("click", () => {
    const url = urlEl.value.trim();
    if (url) window.open(url, "_blank", "noopener");
  });
  document.getElementById("mCancelBtn").addEventListener("click", () => {
    formEl.remove();
  });
  document.getElementById("methodForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const provider = providerEl.value;
    const url = urlEl.value.trim();
    if (!url) { toast("La URL es obligatoria."); return; }
    if (!isValidPaymentUrl(provider, url)) {
      toast(`La URL no es válida para el proveedor ${provider}.`);
      return;
    }
    const payload = {
      provider,
      payment_url: url,
      instructions: document.getElementById("mInstructions").value.trim() || null,
      is_active: document.getElementById("mIsActive").checked,
    };
    try {
      if (methodId) {
        await updateDriverMethod(methodId, payload);
      } else {
        await insertDriverMethod(driverId, payload);
      }
      const methods2 = await loadDriverMethods(driverId);
      renderMethodList(methods2, listContainer, driverId, driverName);
      formEl.remove();
      toast(methodId ? "Método actualizado." : "Método añadido.");
    } catch (err) {
      toast(err.message || "Error al guardar.");
    }
  });

  updateMethodFormPreview();
}
```

### 5.5 `updateMethodFormPreview()`

Misma lógica que `updatePaymentUrlPreview()` / `updateSelfUrlPreview()` pero para los elementos `mProvider`, `mUrl`, `mUrlHint`, `mTestBtn`, `mProviderBadge`, `mQrPreview`, `mQrImg`.

```javascript
let methodFormPreviewTimer = null;

function updateMethodFormPreview() {
  const providerEl = document.getElementById("mProvider");
  const urlEl = document.getElementById("mUrl");
  if (!providerEl || !urlEl) return;
  // ... mismo patrón que updateSelfUrlPreview()
}
```

---

## Paso 6: `app.js` — "Mi enlace" actualizado

`showDriverSelfSection()` sustituye el formulario de campo único por `renderMethodList()` para los métodos propios del conductor, más un botón "Añadir método" que llama `showMethodForm(null, currentUser.id, ...)`.

`saveDriverSelfProfile()` ya no se usa. Las operaciones pasan a `insertDriverMethod` / `updateDriverMethod` / `deleteDriverMethod`.

Los listeners del `cancelSelfBtn` y `backFromSelfBtn` siguen igual.

---

## Paso 7: `app.js` — `renderDriverProfiles()` (panel admin)

Añadir botón "Métodos de pago" en el bloque de acciones de cada conductor:

```javascript
<button class="btn ghost" data-action="methods"
  data-driver-id="${escapeHtml(driver.driver_id)}"
  data-display-name="${escapeHtml(driver.display_name)}">
  Métodos de pago
</button>
```

Añadir handler en el event listener delegado del card:
```javascript
if (action === "methods") openDriverMethodsSection(btn.dataset);
```

---

## Paso 8: `index.html`

### 8.1 Nueva sección `#driverMethodsSection`

Añadir después de `#driverSelfSection`:

```html
<section id="driverMethodsSection" class="hidden">
  <div class="section-title driver-self-header">
    <button id="backFromMethodsBtn" class="btn ghost" type="button">← Volver</button>
    <h2>🔗 Métodos de pago del conductor</h2>
  </div>
  <div id="driverMethodsContent"></div>
</section>
```

### 8.2 `.external-pay-section` en `#driverPayView`

Sustituir el contenido del `.external-pay-section` para incluir `.payment-methods-list`:

```html
<div class="external-pay-section hidden">
  <p class="payment-instructions help"></p>
  <div class="payment-methods-list"></div>
  <p class="payment-provider-notice help">
    🔗 El pago se completa en el proveedor externo. Esta app no procesa ni registra la transacción.
  </p>
</div>
```

---

## Paso 9: `style.css`

```css
/* ===== Sprint 3D: Múltiples métodos de pago ===== */

.payment-methods-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0;
}

.payment-method-btn {
  width: 100%;
  padding: 16px;
  font-size: 17px;
  font-weight: 800;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.payment-method-btn.paypal  { background: #009cde; color: #fff; }
.payment-method-btn.paypal:hover  { background: #007ab5; }
.payment-method-btn.revolut { background: #7c3aed; color: #fff; }
.payment-method-btn.revolut:hover { background: #6d28d9; }

.method-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fffdf9;
  flex-wrap: wrap;
}

.method-url {
  flex: 1;
  word-break: break-all;
  font-size: 13px;
}

.method-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.method-actions .btn {
  font-size: 12px;
  padding: 6px 10px;
}
```

---

## Archivos a NO modificar
- `supabase/functions/**`
- Stripe Connect
