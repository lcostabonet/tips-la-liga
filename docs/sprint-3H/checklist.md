# Sprint 3H Checklist

## app.js

### i18n — Estructura base
- [ ] Variable `let currentLang = 'es'` declarada
- [ ] Constante `STRINGS` con claves `es` y `en`
- [ ] `STRINGS.es` tiene exactamente las mismas claves que `STRINGS.en`
- [ ] Función `t(key)` retorna `STRINGS[currentLang][key]`
- [ ] Función `setLang(lang)` actualiza `currentLang`
- [ ] `setLang()` actualiza clases `.lang-btn.active`
- [ ] `setLang()` re-renderiza `showDriverPayView(selectedDriver)` si la vista de pago está activa
- [ ] `setLang()` llama a `renderDriverList()` si la lista de conductores está activa

### i18n — providerLabel()
- [ ] `providerLabel("paypal")` devuelve `t("payWithPaypal")`
- [ ] `providerLabel("revolut")` devuelve `t("payWithRevolut")`
- [ ] Otros proveedores usan `t("payWith")(name)`

### i18n — renderDriverList()
- [ ] Texto "Cargando..." usa `t("loading")`
- [ ] Texto "No hay conductores..." usa `t("noDrivers")`
- [ ] Botón de tarjeta usa `t("tipBtn")`

### i18n — showDriverPayView()
- [ ] Trust notice (`#tipTrustNotice`) usa `t("directToDriver")`
- [ ] QR hint (`.qr-hint`) usa `t("scanOrTap")`
- [ ] Demo notice usa `t("demoNotice")`
- [ ] Test notice usa `t("testNotice")`
- [ ] No-method notice usa `t("noMethodNotice")`
- [ ] Provider notice (`.payment-provider-notice`) usa `t("providerNotice")`
- [ ] Legacy button usa `t("payWithPaypal")` o `t("payWith")(name)`

### i18n — updatePayButton()
- [ ] Estado disabled usa `t("selectAmount")`
- [ ] Estado activo usa `t("payBtnActive")(amount)`

### i18n — handleTipPayment()
- [ ] Mensaje de confirmación (`confirmMsg`) usa `t("tipSent")(driverName)`
- [ ] Botón "Dar otra propina" (`newTipBtn.textContent`) usa `t("anotherTip")`

### i18n — setupEvents()
- [ ] Listener en `.lang-toggle` registrado
- [ ] Click en `.lang-btn` llama a `setLang(btn.dataset.lang)`

---

## index.html

### Cambios en #tipDriverSection
- [ ] `.demo-badge` eliminado del `.tip-driver-header`
- [ ] `.lang-toggle` añadido al `.tip-driver-header`
- [ ] Dos `.lang-btn` con `data-lang="es"` y `data-lang="en"`
- [ ] El botón ES tiene clase `active` por defecto
- [ ] `<p id="tipTrustNotice" class="tip-trust-notice"></p>` añadido entre `.driver-pay-header` y `.qr-box`
- [ ] `.qr-hint` vacío (texto dinámico desde JS)

---

## style.css — Bloque Sprint 3H

- [ ] `.tip-tab` override: `padding: 14px 28px`, `font-size: 16px`, `min-height: 52px`, `box-shadow`
- [ ] `.tip-tab:hover`: box-shadow mayor, `transform: translateY(-1px)`
- [ ] `.lang-toggle`: flex, gap 4px
- [ ] `.lang-btn`: definido con `min-height: 44px`
- [ ] `.lang-btn.active`: fondo `--primary`, texto blanco
- [ ] `.lang-btn:not(.active):hover`: borde gold
- [ ] `.tip-trust-notice`: flex centrado, 13px, muted
- [ ] `.payment-method-block` override: `padding: 24px 20px`, `border-width: 2px`, `border-radius: 24px`
- [ ] `.payment-method-block:hover`: border-color gold, box-shadow
- [ ] `.payment-method-name` override: `font-size: 16px`, `font-weight: 800`
- [ ] `.payment-provider-notice` override: `border-top`, `padding-top: 12px`

---

## Verificación funcional

### Toggle ES/EN
- [ ] Cambiar a EN traduce: "Leave a tip", "Choose a driver", "Leave another tip"
- [ ] Cambiar a EN traduce botones: "Pay with PayPal →", "Pay with Revolut →"
- [ ] Cambiar a EN traduce: trust notice, QR hint, provider notice
- [ ] Cambiar a ES vuelve al español completo
- [ ] El toggle funciona en la vista de lista de conductores
- [ ] El toggle funciona en la vista de pago de conductor
- [ ] El toggle NO aparece en admin, "Mi enlace" ni login

### Flujo de pago
- [ ] PayPal multi-método: QR + botón "Pagar con PayPal →" / "Pay with PayPal →"
- [ ] Revolut multi-método: QR + botón "Pagar con Revolut →" / "Pay with Revolut →"
- [ ] Conductor sin métodos: texto correcto en ES y EN
- [ ] Conductor mock: demo notice correcto en ES y EN
- [ ] Botón de pago: "Selecciona un importe" / "Select an amount"
- [ ] Botón activo: "Pagar X €" / "Pay X €"
- [ ] Confirmación: texto de envío en ES y EN

### Diseño
- [ ] CTA "💸 Dar propina" más grande y visible
- [ ] Trust notice visible bajo el nombre del conductor
- [ ] `.payment-method-block` con hover dorado
- [ ] `.demo-badge` ausente para todos los usuarios

---

## No-regresiones

- [ ] Login/registro funcionan
- [ ] Rankings y propinas CRUD funcionan
- [ ] Panel admin "Conductores" sigue en español
- [ ] "Mi enlace" sigue en español
- [ ] Botón "Cancelar" en formularios funciona
- [ ] Logout limpia correctamente

---

## Archivos NO modificados

- [ ] `supabase.sql` intacto
- [ ] `supabase/functions/**` intacto
- [ ] Sin PayPal API ni Revolut API
- [ ] Sin claves secretas añadidas
