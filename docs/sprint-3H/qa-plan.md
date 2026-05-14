# Sprint 3H QA Plan: Diseño profesional y experiencia bilingüe

## Setup
- Cuenta A: usuario logueado sin perfil de conductor.
- Cuenta B: usuario logueado con perfil Y con métodos PayPal + Revolut en `driver_payment_methods`.
- Cuenta C: admin.
- Sin sesión: usuario anónimo (cliente).

---

## T01 — Toggle ES/EN visible y funcional

| Paso | Resultado esperado |
|---|---|
| Abrir "💸 Dar propina" (cualquier estado de sesión) | Toggle ES/EN visible en el encabezado |
| Estado inicial | Botón ES activo (fondo oscuro), EN inactivo |
| Pulsar EN | Botón EN activo, ES inactivo |
| Pulsar ES | Botón ES activo de nuevo |
| Verificar en "Mi enlace" | Toggle NO aparece |
| Verificar en panel admin | Toggle NO aparece |
| Verificar en login | Toggle NO aparece |

---

## T02 — Traducción de la lista de conductores

| Paso | Resultado esperado |
|---|---|
| Abrir "Dar propina" en ES | Cabecera "Elige un conductor" |
| Cambiar a EN | Cabecera "Choose a driver" |
| En ES, sin conductores | "No hay conductores disponibles en este momento." |
| En EN, sin conductores | "No drivers available right now." |
| En ES, cargando | "Cargando conductores..." |
| En EN, cargando | "Loading drivers..." |
| En ES, tarjeta de conductor | Botón "Dar propina" |
| En EN, tarjeta de conductor | Botón "Leave a tip" |

---

## T03 — Traducción de la vista de pago (conductor con PayPal + Revolut)

| Paso | Resultado esperado |
|---|---|
| Seleccionar conductor con 2 métodos (Cuenta B) en ES | Trust notice "🔒 La propina va directamente al conductor" |
| Cambiar a EN | Trust notice "🔒 Your tip goes directly to the driver" |
| En ES | QR hint "Escanea el QR o pulsa el botón" |
| En EN | QR hint "Scan the QR code or tap the button" |
| En ES | Botón PayPal "Pagar con PayPal →" |
| En EN | Botón PayPal "Pay with PayPal →" |
| En ES | Botón Revolut "Pagar con Revolut →" |
| En EN | Botón Revolut "Pay with Revolut →" |
| En ES | Provider notice en español |
| En EN | Provider notice en inglés |

---

## T04 — Traducción del botón de pago y confirmación

| Paso | Resultado esperado |
|---|---|
| Conductor sin métodos externos (demo/Stripe) en ES | Botón desactivado "Selecciona un importe" |
| En EN | Botón desactivado "Select an amount" |
| Seleccionar chip de 5 € en ES | Botón "Pagar 5,00 €" |
| Seleccionar chip de 5 € en EN | Botón "Pay 5,00 €" |
| Completar pago (demo) en ES | Mensaje de confirmación en español |
| Completar pago (demo) en EN | Mensaje de confirmación en inglés |
| Botón "Dar otra propina" en ES | Texto español |
| Botón "Leave another tip" en EN | Texto inglés |

---

## T05 — Mensajes de estado en la vista de pago

| Paso | Resultado esperado |
|---|---|
| Conductor mock en ES | "🧪 Modo demo — el pago no es real" |
| Conductor mock en EN | "🧪 Demo mode — payment is not real" |
| Conductor con slug Stripe, sin payment_methods ni payment_url, en ES | "🧪 Modo test — el pago es de prueba con Stripe" |
| Conductor con slug Stripe, sin payment_methods ni payment_url, en EN | "🧪 Test mode — this is a Stripe test payment" |
| Conductor sin métodos activos ni legacy en ES | "Sin método de pago configurado aún." |
| Conductor sin métodos activos ni legacy en EN | "No payment method configured yet." |

---

## T06 — Persistencia del idioma al navegar dentro de "Dar propina"

| Paso | Resultado esperado |
|---|---|
| Cambiar a EN en la lista de conductores | EN activo |
| Seleccionar un conductor | Vista de pago en inglés |
| Pulsar "← Conductores" | Lista en inglés (toggle sigue en EN) |
| Seleccionar otro conductor | Vista de pago en inglés |
| Pulsar "← Volver" (salir de "Dar propina") | Sale de la sección |
| Volver a entrar en "Dar propina" | Toggle en ES (idioma por defecto) |

---

## T07 — El `.demo-badge` ha sido eliminado

| Paso | Resultado esperado |
|---|---|
| Abrir "Dar propina" (cualquier usuario) | NO aparece badge "🧪 Demo" en el encabezado |
| Verificar HTML | `<span class="demo-badge">` ausente de `#tipDriverSection` |

---

## T08 — Diseño: CTA más prominente

| Paso | Resultado esperado |
|---|---|
| Ver topbar en escritorio | Botón "💸 Dar propina" más grande que los demás botones |
| Ver topbar en móvil (375px) | Botón visible y con área táctil generosa |
| Hover sobre el botón | Sombra dorada visible |

---

## T09 — Diseño: trust notice y payment-method-block

| Paso | Resultado esperado |
|---|---|
| Abrir vista de pago de conductor con métodos | Trust notice visible entre nombre del conductor y QR |
| Hover sobre un bloque de método | Borde dorado visible |
| Bloque de pago más espacioso | `padding: 24px 20px` — visualmente más cómodo |

---

## T10 — Multi-método PayPal + Revolut sigue funcionando

| Paso | Resultado esperado |
|---|---|
| Conductor con PayPal y Revolut en ES | Dos bloques, cada uno con QR propio y botón en español |
| Mismo conductor en EN | Dos bloques con botones en inglés — QR sin cambios |
| Pulsar "Pay with PayPal →" | `window.open(paypal_url, "_blank", "noopener")` |
| Pulsar "Pay with Revolut →" | `window.open(revolut_url, "_blank", "noopener")` |

---

## T11 — Panel admin sin regresiones (Cuenta C)

| Paso | Resultado esperado |
|---|---|
| Abrir "🚌 Conductores" | Panel en español — sin cambios |
| Editar conductor — dialog | En español — sin cambios |
| Gestionar métodos de pago | En español — sin cambios |

---

## T12 — "Mi enlace" sin regresiones (Cuenta B)

| Paso | Resultado esperado |
|---|---|
| Abrir "🔗 Mi enlace" | Sección en español — sin cambios |
| Toggle de visibilidad | Funciona |
| Lista de métodos | En español |
| Añadir / editar / eliminar método | Funciona |

---

## T13 — Login/logout y autenticación sin regresiones

| Paso | Resultado esperado |
|---|---|
| Login | Funciona, mensajes en español |
| Registro | Funciona |
| Logout mientras "Dar propina" abierto | Sección se oculta correctamente |

---

## T14 — Seguridad

| Check | Resultado esperado |
|---|---|
| Sin claves secretas en `STRINGS` | Solo cadenas de texto UI |
| Sin URLs hardcodeadas de pago | `payment_url` siempre de la DB |
| Sin PayPal API ni Revolut API | Solo `window.open()` |
| Sin procesamiento de pagos | Sin fetch a APIs de pago |
| `supabase.sql` no modificado | `git diff HEAD -- supabase.sql` → 0 |
| Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → 0 |
