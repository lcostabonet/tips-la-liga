# Sprint 3F QA Plan: Estabilización legacy y limpieza de código

## Setup
- Cuenta A: usuario logueado **sin** fila en `driver_payment_profiles`.
- Cuenta B: usuario logueado **con** perfil Y con métodos en `driver_payment_methods`.
- Cuenta B2: usuario logueado **con** perfil pero **sin** métodos en `driver_payment_methods`.
- Cuenta C: admin (`lluis15basket@hotmail.es`).

---

## T01 — Código muerto eliminado (análisis estático)

| Paso | Resultado esperado |
|---|---|
| Grep `selfQrPreviewTimer` en `app.js` | 0 coincidencias |
| Grep `updateSelfUrlPreview` en `app.js` | 0 coincidencias |
| Grep `saveDriverSelfProfile` en `app.js` | 0 coincidencias |
| Grep `selfPaymentProvider` en `app.js` | 0 coincidencias |
| Grep `selfPaymentUrl` en `app.js` | 0 coincidencias |
| Grep `selfTestLinkBtn` en `app.js` | 0 coincidencias |

---

## T02 — SELECT de `loadDriverSelfProfile()` ajustado

| Paso | Resultado esperado |
|---|---|
| Leer `loadDriverSelfProfile()` en `app.js` | SELECT contiene `id, driver_id, display_name, is_visible` |
| Verificar que `payment_provider` no está en el SELECT | Ausente |
| Verificar que `payment_url` no está en el SELECT | Ausente |
| Verificar que `payment_instructions` no está en el SELECT | Ausente |
| `showDriverSelfSection()` muestra `display_name` correctamente | `driverSelfProfile.display_name` accesible |
| Toggle "Visible" funciona | `driverSelfProfile.is_visible` accesible |
| Lista de métodos carga correctamente | `driverSelfProfile.id` accesible para `loadSelfMethods()` |

---

## T03 — Estado vacío en "Mi enlace" (Cuenta B2 — perfil sin métodos)

| Paso | Resultado esperado |
|---|---|
| Login con Cuenta B2 (perfil existe, sin métodos) | Botón "🔗 Mi enlace" visible |
| Pulsar "🔗 Mi enlace" | Sección abre |
| Verificar área de métodos | Mensaje contiene "Añade PayPal o Revolut" |
| Mensaje referencia "Dar propina" | Texto orienta al conductor |
| Botón "+ Añadir método" visible | Aparece debajo del mensaje vacío |
| Añadir un método | Lista se actualiza correctamente |

---

## T04 — Estado vacío en "Mi enlace" (Cuenta A — sin perfil)

| Paso | Resultado esperado |
|---|---|
| Login con Cuenta A | Botón "🎫 Crear mi perfil" visible |
| Crear perfil | "Mi enlace" abre automáticamente |
| Lista de métodos vacía | Mensaje "Añade PayPal o Revolut" visible |
| Botón "+ Añadir método" visible | Disponible para añadir el primer método |

---

## T05 — Mensaje en "Dar propina" para conductor sin métodos

| Paso | Resultado esperado |
|---|---|
| Pulsar "💸 Dar propina" | Pantalla de selección de conductor |
| Conductor con `payment_methods` activos | Bloques PayPal / Revolut visibles con QR y botón |
| Conductor sin `payment_methods` y sin `payment_url` | Texto "Sin método de pago configurado aún." |
| Conductor mock | "🧪 Modo demo — el pago no es real" |
| Conductor con slug Stripe pero sin payment_url ni métodos | "🧪 Modo test — el pago es de prueba con Stripe" |

---

## T06 — Condición Stripe en `handleTipPayment()` (análisis estático)

| Paso | Resultado esperado |
|---|---|
| Leer `handleTipPayment()` en `app.js` | Condición Stripe incluye `!selectedDriver.payment_methods?.length` |
| Conductor con `payment_methods` → `payTipBtn` oculto | No se puede invocar `handleTipPayment()` |
| Conductor sin `payment_methods` ni `payment_url`, con slug | Condición Stripe verdadera → rama Stripe activa |
| Conductor sin `payment_methods`, con `payment_url` | `!payment_url` = false → Stripe no activa ✓ |

---

## T07 — Flujo legacy sigue operativo

| Paso | Resultado esperado |
|---|---|
| Conductor con `payment_url` legacy (sin `payment_methods`) | QR del `payment_url`, botón "Pagar con PayPal →" |
| `externalPayBtn` en listener de `setupEvents()` | Usa `selectedDriver.payment_url` → correcto para legacy |
| `loadPublicDrivers()` sigue pidiendo `payment_url` | SELECT incluye campos legacy |
| `renderDriverList()` propaga `payment_url` en `normalized` | Campo disponible en `selectedDriver` |

---

## T08 — Panel admin sin regresiones (Cuenta C)

| Paso | Resultado esperado |
|---|---|
| Abrir "🚌 Conductores" | Lista de conductores con badge de proveedor |
| Botón "Editar" → dialog | Campos `payment_provider`, `payment_url`, `payment_instructions` prellenados |
| Guardar cambios | UPDATE en `driver_payment_profiles` correcto |
| Botón "Métodos de pago" | Abre sección de gestión de métodos del conductor |
| Añadir / editar / eliminar método desde admin | Funciona correctamente |

---

## T09 — Sin regresiones generales

| Componente | Verificar |
|---|---|
| Login/registro | Funcionan |
| Rankings y propinas CRUD | Funcionan |
| Botón "Cancelar" en creación de perfil | Funciona (Sprint 3E) |
| Toggle "Visible en Dar propina" | Funciona |
| Logout | Limpia todas las secciones |
| `supabase.sql` | Sin cambios |
| Edge Functions | Sin cambios |

---

## T10 — Seguridad

| Check | Resultado esperado |
|---|---|
| Grep `sk_\|pk_live_\|client_secret` en `app.js` | 0 coincidencias |
| Grep `api\.paypal\|api\.revolut` en `app.js` | 0 coincidencias |
| Sin procesamiento de pagos interno | Solo `window.open()` |
| `supabase.sql` no modificado | `git diff HEAD -- supabase.sql` → 0 líneas |
| Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → 0 líneas |
