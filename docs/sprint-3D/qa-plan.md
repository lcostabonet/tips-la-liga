# Sprint 3D QA Plan: Múltiples métodos de pago externos

## Setup
- DB: tabla `driver_payment_methods` creada, migración ejecutada, vista actualizada.
- Al menos 1 conductor con PayPal **y** Revolut configurados en `driver_payment_methods`.
- Al menos 1 conductor con solo PayPal (para verificar flujo de un método).
- Al menos 1 conductor sin métodos pero con `payment_url` legacy (para verificar compatibilidad).
- Sesión de admin activa (`lluis15basket@hotmail.es`).
- Sesión de conductor normal activa (con perfil propio).

---

## T01 — "Dar propina" con conductor multi-método (PayPal + Revolut)

| Paso | Resultado esperado |
|---|---|
| Abrir "Dar propina", seleccionar conductor | Sección de pago visible |
| Verificar QR | QR del primer método (`display_order` más bajo) |
| Verificar botones | "Pagar con PayPal →" (azul) y "Pagar con Revolut →" (violeta) ambos visibles |
| Pulsar "Pagar con PayPal →" | Nueva pestaña con PayPal + QR actualizado a URL de PayPal |
| Pulsar "Pagar con Revolut →" | Nueva pestaña con Revolut + QR actualizado a URL de Revolut |
| DevTools → Network | Solo `window.open`, sin fetch a APIs externas |

---

## T02 — "Dar propina" con conductor de un solo método

| Paso | Resultado esperado |
|---|---|
| Seleccionar conductor con solo PayPal | Un botón "Pagar con PayPal →" visible |
| Verificar QR | QR de la URL de PayPal |
| Pulsar botón | Nueva pestaña PayPal |

---

## T03 — Compatibilidad regresiva (conductor legacy Sprint 3A)

| Paso | Resultado esperado |
|---|---|
| Conductor con `payment_url` en columnas legacy pero sin fila en `driver_payment_methods` | Botón "Pagar con PayPal →" visible (flujo Sprint 3A) |
| Verificar QR | QR de `payment_url` legacy |
| Pulsar botón | Nueva pestaña PayPal |

---

## T04 — "Dar propina" con conductor sin método

| Paso | Resultado esperado |
|---|---|
| Conductor sin `payment_methods` y sin `payment_url` | Aviso "Sin método configurado" |
| No hay botones de pago | Correcto |

---

## T05 — Validación de dominio Revolut

| Paso | Resultado esperado |
|---|---|
| En formulario de método, proveedor Revolut, URL `https://revolut.me/usuario` | Indicador verde "✓ Enlace válido" |
| URL `https://otro-sitio.com` con Revolut | Indicador rojo |
| URL `https://app.revolut.com/pay/123` | Indicador verde |
| Intentar guardar URL inválida Revolut | Toast de error, sin guardar |

---

## T06 — Validación de dominio PayPal (sin regresión Sprint 3A)

| Paso | Resultado esperado |
|---|---|
| Proveedor PayPal, URL `https://paypal.me/usuario` | Verde |
| URL `https://otro-sitio.com` con PayPal | Rojo |
| URL `http://paypal.me/usuario` (sin https) | Rojo |
| `https://paypal.me` (sin barra) | Rojo |

---

## T07 — Panel admin: añadir método a un conductor

| Paso | Resultado esperado |
|---|---|
| Abrir panel admin, pulsar "Métodos de pago" en un conductor | Sección de métodos abre con lista actual |
| Pulsar "+ Añadir método" | Formulario aparece debajo |
| Seleccionar Revolut, introducir URL válida | Indicador verde, QR preview visible |
| Pulsar "Añadir método" | Toast "Método añadido.", lista actualizada |
| Verificar en "Dar propina" | Nuevo método aparece como botón |

---

## T08 — Panel admin: editar método existente

| Paso | Resultado esperado |
|---|---|
| Pulsar "Editar" en método existente | Formulario prellenado con datos del método |
| Cambiar URL a una válida del mismo proveedor | Indicador verde |
| Guardar | Toast "Método actualizado.", lista actualizada |
| Volver a abrir "Dar propina" | QR y botón usan la nueva URL |

---

## T09 — Panel admin: eliminar método

| Paso | Resultado esperado |
|---|---|
| Pulsar "Eliminar" en un método | Dialog de confirmación |
| Confirmar | Método desaparece de la lista |
| Verificar "Dar propina" | Botón del método eliminado no aparece |
| Si era el último método | Conductor pasa a flujo legacy o sin método |

---

## T10 — Panel admin: evitar dos métodos del mismo proveedor

| Paso | Resultado esperado |
|---|---|
| Conductor ya tiene PayPal configurado | Intentar añadir un segundo PayPal |
| Guardar | Toast de error de unicidad (constraint `uq_driver_payment_method_provider`) |
| Verificar DB | Solo un PayPal por conductor |

---

## T11 — "Mi enlace": conductor gestiona sus propios métodos

| Paso | Resultado esperado |
|---|---|
| Conductor logueado pulsa "🔗 Mi enlace" | Lista de sus métodos actuales |
| Añadir Revolut | Toast "Método añadido." |
| Editar PayPal con nueva URL | Toast "Método actualizado." |
| Eliminar un método | Método desaparece de su "Dar propina" |
| Intentar editar método de otro conductor (acceso directo) | RLS bloquea, error |

---

## T12 — "Mi enlace": usuario sin perfil de conductor

| Paso | Resultado esperado |
|---|---|
| Login con usuario sin fila en `driver_payment_profiles` | Botón "🔗 Mi enlace" NO visible |

---

## T13 — Seguridad

- Sin `paypal_secret`, `revolut_secret`, `sk_`, `pk_live_` en código fuente.
- `window.open()` es la única acción al pulsar un botón de método — sin fetch.
- RLS: conductor no puede modificar métodos de otro conductor aunque conozca el `method_id`.
- `dpm_admin_all` solo activo para el email admin.
- Vista `public_driver_profiles` no expone `driver_id` ni `stripe_account_id`.

---

## T14 — Sin regresiones

| Componente | Verificar |
|---|---|
| Login/registro | Funcionan |
| Rankings y propinas CRUD | Funcionan |
| Panel admin (Onboarding/Refresh/Test 1€) | Funcionan |
| Stripe Connect aparcado | Sin cambios |
| Conductores legacy Sprint 3A | Siguen recibiendo propinas via `payment_url` |

---

## T15 — Responsive y UX

| Elemento | Verificar |
|---|---|
| Múltiples botones de método en móvil (375px) | Sin desbordamiento horizontal |
| Lista de métodos en admin | Legible en móvil |
| QR se actualiza al cambiar método | Sin delay perceptible (inmediato, no usa debounce) |
| Badge de proveedor en formulario de método | Correcto para PayPal y Revolut |
