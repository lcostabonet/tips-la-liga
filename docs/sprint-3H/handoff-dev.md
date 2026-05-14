# Sprint 3H Handoff Dev

## Orden de implementación

1. `app.js` — STRINGS + t() + setLang() (base)
2. `app.js` — aplicar t() a funciones del flujo público
3. `index.html` — toggle, trust notice, eliminar demo-badge
4. `style.css` — bloque Sprint 3H
5. `app.js` — listener del toggle en setupEvents()

---

## app.js — Cambio 1: STRINGS, currentLang, t(), setLang()

Añadir **después de la declaración de `MOCK_DRIVERS`** (línea ~734), antes de `TIP_CHIP_AMOUNTS`:

```javascript
// ===== Sprint 3H: i18n =====
let currentLang = 'es';

const STRINGS = {
  es: {
    leaveATip:      "💸 Dar propina",
    chooseDriver:   "Elige un conductor",
    directToDriver: "🔒 La propina va directamente al conductor",
    scanOrTap:      "Escanea el QR o pulsa el botón",
    tipBtn:         "Dar propina",
    noDrivers:      "No hay conductores disponibles en este momento.",
    loading:        "Cargando conductores...",
    selectAmount:   "Selecciona un importe",
    payBtnActive:   (a) => `Pagar ${a} €`,
    anotherTip:     "Dar otra propina",
    tipSent:        (n) => `¡Propina enviada a ${n}!`,
    demoNotice:     "🧪 Modo demo — el pago no es real",
    testNotice:     "🧪 Modo test — el pago es de prueba con Stripe",
    noMethodNotice: "Sin método de pago configurado aún.",
    providerNotice: "🔗 El pago se completa en el proveedor externo. Esta app no procesa ni registra la transacción.",
    payWithPaypal:  "Pagar con PayPal →",
    payWithRevolut: "Pagar con Revolut →",
    payWith:        (n) => `Pagar con ${n} →`,
  },
  en: {
    leaveATip:      "💸 Leave a tip",
    chooseDriver:   "Choose a driver",
    directToDriver: "🔒 Your tip goes directly to the driver",
    scanOrTap:      "Scan the QR code or tap the button",
    tipBtn:         "Leave a tip",
    noDrivers:      "No drivers available right now.",
    loading:        "Loading drivers...",
    selectAmount:   "Select an amount",
    payBtnActive:   (a) => `Pay ${a} €`,
    anotherTip:     "Leave another tip",
    tipSent:        (n) => `Tip sent to ${n}!`,
    demoNotice:     "🧪 Demo mode — payment is not real",
    testNotice:     "🧪 Test mode — this is a Stripe test payment",
    noMethodNotice: "No payment method configured yet.",
    providerNotice: "🔗 Payment is completed on the external provider. This app does not process or record the transaction.",
    payWithPaypal:  "Pay with PayPal →",
    payWithRevolut: "Pay with Revolut →",
    payWith:        (n) => `Pay with ${n} →`,
  },
};

function t(key) {
  return STRINGS[currentLang][key];
}

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  if (!els.driverPayView.classList.contains("hidden") && selectedDriver) {
    showDriverPayView(selectedDriver);
  } else {
    renderDriverList();
  }
}
```

---

## app.js — Cambio 2: providerLabel() — hacer language-aware

```javascript
// ANTES:
function providerLabel(provider) {
  return { paypal: "Pagar con PayPal →", revolut: "Pagar con Revolut →" }[provider]
    || `Pagar con ${providerDisplayName(provider)} →`;
}

// DESPUÉS:
function providerLabel(provider) {
  if (provider === "paypal")  return t("payWithPaypal");
  if (provider === "revolut") return t("payWithRevolut");
  return t("payWith")(providerDisplayName(provider));
}
```

---

## app.js — Cambio 3: renderDriverList()

```javascript
// ANTES (línea ~769):
els.driverList.innerHTML = "<p class='help' style='padding:16px'>Cargando conductores...</p>";

// DESPUÉS:
els.driverList.innerHTML = `<p class='help' style='padding:16px'>${t("loading")}</p>`;
```

```javascript
// ANTES (línea ~776):
els.driverList.innerHTML = "<p class='help' style='padding:16px'>No hay conductores disponibles en este momento.</p>";

// DESPUÉS:
els.driverList.innerHTML = `<p class='help' style='padding:16px'>${t("noDrivers")}</p>`;
```

```javascript
// ANTES (línea ~790):
<button class="btn primary" type="button">Dar propina</button>

// DESPUÉS:
<button class="btn primary" type="button">${t("tipBtn")}</button>
```

---

## app.js — Cambio 4: showDriverPayView() — trust notice + textos

**4a — Trust notice**: inmediatamente después de `els.payDriverBio.textContent = driverBio;` (línea ~823), añadir:
```javascript
const trustEl = document.getElementById("tipTrustNotice");
if (trustEl) trustEl.textContent = t("directToDriver");
```

**4b — QR hint**: buscar la línea que establece el texto del `.qr-hint`:
```javascript
// El .qr-hint es un elemento estático en HTML con texto "Escanea el QR o elige un importe"
// Sprint 3H lo actualiza dinámicamente:
const qrHintEl = els.driverPayView.querySelector(".qr-hint");
if (qrHintEl) qrHintEl.textContent = t("scanOrTap");
```
Añadir después de `if (mainQrHint) mainQrHint.classList.remove("hidden");` (línea ~833).

**4c — Demo/test/no-method notice**: ya usa `demoNoticeEl.textContent`. Cambiar las tres cadenas:
```javascript
// ANTES:
demoNoticeEl.textContent = driver.isMock
  ? "🧪 Modo demo — el pago no es real"
  : (driver.tip_link_slug || driver.slug)
    ? "🧪 Modo test — el pago es de prueba con Stripe"
    : "Sin método de pago configurado aún.";

// DESPUÉS:
demoNoticeEl.textContent = driver.isMock
  ? t("demoNotice")
  : (driver.tip_link_slug || driver.slug)
    ? t("testNotice")
    : t("noMethodNotice");
```

**4d — Provider notice**: el texto del `.payment-provider-notice` está en `index.html` como texto estático.
En `showDriverPayView()`, añadir después de construir `externalPaySection`:
```javascript
const providerNoticeEl = els.driverPayView.querySelector(".payment-provider-notice");
if (providerNoticeEl) providerNoticeEl.textContent = t("providerNotice");
```

**4e — Legacy button label**: dentro del bloque `else` (flujo legacy):
```javascript
// ANTES:
legacyBtn.textContent = driver.payment_provider === "paypal" ? "Pagar con PayPal →" : "Pagar →";

// DESPUÉS:
legacyBtn.textContent = driver.payment_provider === "paypal"
  ? t("payWithPaypal")
  : t("payWith")(driver.payment_provider || "");
```

---

## app.js — Cambio 5: updatePayButton()

```javascript
// ANTES:
els.payTipBtn.textContent = "Selecciona un importe";
// y:
els.payTipBtn.textContent = `Pagar ${selectedTipAmount.toFixed(2).replace(".", ",")} €`;

// DESPUÉS:
els.payTipBtn.textContent = t("selectAmount");
// y:
els.payTipBtn.textContent = t("payBtnActive")(selectedTipAmount.toFixed(2).replace(".", ","));
```

---

## app.js — Cambio 6: handleTipPayment() — mensaje de confirmación

```javascript
// ANTES (línea ~964):
els.confirmMsg.textContent = `¡Propina de ${Number(selectedTipAmount).toFixed(2).replace(".", ",")} € enviada a ${driverName}!`;

// DESPUÉS:
els.confirmMsg.textContent = t("tipSent")(driverName);
```

También actualizar el botón "Dar otra propina" al mostrar la confirmación:
```javascript
els.newTipBtn.textContent = t("anotherTip");
```
Añadir en el mismo bloque `setTimeout` donde se muestra `payConfirm`.

---

## app.js — Cambio 7: setupEvents() — listener del toggle

Añadir al final de `setupEvents()`:

```javascript
// Sprint 3H: toggle de idioma
document.querySelector(".lang-toggle")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (btn?.dataset.lang) setLang(btn.dataset.lang);
});
```

---

## index.html — Cambio 1: Toggle ES/EN en .tip-driver-header

```html
<!-- ANTES: -->
<div class="tip-driver-header">
  <button id="backToAppBtn" class="btn ghost" type="button">← Volver</button>
  <h2>Elige un conductor</h2>
  <span class="demo-badge">🧪 Demo</span>
</div>

<!-- DESPUÉS: -->
<div class="tip-driver-header">
  <button id="backToAppBtn" class="btn ghost" type="button">← Volver</button>
  <h2>Elige un conductor</h2>
  <div class="lang-toggle">
    <button class="lang-btn active" data-lang="es" type="button">ES</button>
    <button class="lang-btn" data-lang="en" type="button">EN</button>
  </div>
</div>
```

Cambios: eliminar `.demo-badge`, añadir `.lang-toggle`.

---

## index.html — Cambio 2: Trust notice en #driverPayView

```html
<!-- ANTES: -->
<div class="driver-pay-header">
  ...
</div>

<div class="qr-box">

<!-- DESPUÉS: -->
<div class="driver-pay-header">
  ...
</div>

<p id="tipTrustNotice" class="tip-trust-notice"></p>

<div class="qr-box">
```

El texto se rellena desde JS en `showDriverPayView()`.

---

## index.html — Cambio 3: Actualizar texto estático de .qr-hint

El `.qr-hint` tiene texto estático `"Escanea el QR o elige un importe"`. Sprint 3H lo actualiza dinámicamente desde JS (ver app.js Cambio 4b), por lo que el texto HTML es solo el placeholder:

```html
<!-- ANTES: -->
<p class="help qr-hint">Escanea el QR o elige un importe</p>

<!-- DESPUÉS: -->
<p class="help qr-hint"></p>
```

---

## style.css — Bloque Sprint 3H

Añadir al final del archivo:

```css
/* ===== Sprint 3H: Diseño profesional y bilingüe ===== */

.tip-tab {
  padding: 14px 28px;
  font-size: 16px;
  min-height: 52px;
  letter-spacing: -0.3px;
  box-shadow: 0 4px 14px rgba(244, 197, 66, 0.4);
  transition: box-shadow 0.15s, transform 0.15s;
}

.tip-tab:hover {
  background: #e8b830;
  box-shadow: 0 6px 20px rgba(244, 197, 66, 0.55);
  transform: translateY(-1px);
}

.lang-toggle {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.lang-btn {
  border: 1px solid var(--line);
  background: #fffaf0;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  color: var(--text);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.lang-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.lang-btn:not(.active):hover {
  border-color: var(--gold);
}

.tip-trust-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  text-align: center;
  margin: 0 0 16px;
}

.payment-method-block {
  padding: 24px 20px;
  border-width: 2px;
  border-radius: 24px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.payment-method-block:hover {
  border-color: var(--gold);
  box-shadow: 0 4px 16px rgba(244, 197, 66, 0.2);
}

.payment-method-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.2px;
}

.payment-provider-notice {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: 4px;
}
```

---

## Verificación post-implementación

- [ ] Toggle ES/EN visible en "Dar propina" (lista y vista de pago)
- [ ] Pulsar EN traduce todos los textos públicos
- [ ] Pulsar ES vuelve al español
- [ ] Trust notice "🔒 ..." visible bajo el nombre del conductor
- [ ] QR hint muestra texto en idioma correcto
- [ ] Botones de pago "Pay with PayPal →" en EN
- [ ] `.demo-badge` ausente del HTML
- [ ] CTA "💸 Dar propina" en topbar más grande
- [ ] `.payment-method-block` con hover dorado
- [ ] `supabase.sql`, Edge Functions, `index.html` (salvo 3 cambios), intactos en lo demás
