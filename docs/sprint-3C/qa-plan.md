# Sprint 3C QA Plan: Autoservicio de enlace de pago para conductores

## Setup
- Sesión de conductor activa (usuario con fila en `driver_payment_profiles`).
- Al menos 1 conductor con `payment_provider = 'paypal'` y `payment_url` configurados.
- Al menos 1 usuario sin fila en `driver_payment_profiles` (para T09).
- Sesión de admin disponible para verificar que el panel admin sigue funcionando (T10).

---

## T01 — Visibilidad del botón "🔗 Mi enlace"

| Paso | Resultado esperado |
|---|---|
| Login con conductor que tiene perfil | Botón "🔗 Mi enlace" visible en topbar |
| Login con usuario sin perfil de conductor | Botón NO aparece |
| Logout | Botón desaparece |
| Login de nuevo | Botón reaparece si el conductor tiene perfil |

---

## T02 — Abrir sección con conductor con PayPal configurado

| Paso | Resultado esperado |
|---|---|
| Pulsar "🔗 Mi enlace" | Sección abre con `display_name` del conductor visible (solo lectura) |
| Verificar selector de proveedor | Prellenado con "PayPal" |
| Verificar badge | Badge azul "PayPal" visible desde el inicio |
| Verificar campo URL | Prellenado con la URL actual del conductor |
| Verificar indicador | "✓ Enlace válido" en verde desde el inicio |
| Verificar QR | QR preview visible con la URL del conductor (tras 500ms si es la primera carga) |
| Verificar botón "Probar enlace →" | Activo |
| Verificar disclaimer | Texto "Tips La Liga no procesa pagos..." visible |

---

## T03 — Indicador de validación en tiempo real

| Paso | Resultado esperado |
|---|---|
| Borrar la URL | Indicador desaparece, QR oculto, botón desactivado |
| Escribir `https://paypal.me/test` | "✓ Enlace válido" (verde), QR aparece tras ~500ms |
| Cambiar a `https://otro-sitio.com` | "✗ El enlace no parece de PayPal" (rojo), QR oculto |
| Seleccionar proveedor "Sin configurar" con URL | Indicador verde |
| Volver a seleccionar "PayPal" con URL inválida | Indicador rojo inmediatamente |

---

## T04 — QR preview con debounce

| Paso | Resultado esperado |
|---|---|
| Escribir URL rápidamente, letra a letra | QR no se actualiza en cada tecla |
| Parar de escribir 500ms | QR se actualiza con la URL actual |
| Borrar toda la URL | QR desaparece |
| Escanear QR | URL codificada = `payment_url` exactamente |

---

## T05 — Botón "Probar enlace →"

| Paso | Resultado esperado |
|---|---|
| Con URL válida: pulsar "Probar enlace →" | Nueva pestaña con el enlace de PayPal |
| Con URL vacía | Botón desactivado |
| Con URL inválida PayPal | Botón desactivado |
| Pulsar "Probar enlace →" | La sección sigue abierta (no guarda) |
| DevTools → Network | Sin llamadas a APIs externas (solo `window.open`) |

---

## T06 — Guardar con URL válida

| Paso | Resultado esperado |
|---|---|
| Introducir URL PayPal válida, pulsar "Guardar" | Toast "Enlace guardado." |
| Sección se cierra | Regresa a `appSection` |
| Volver a abrir "🔗 Mi enlace" | Los nuevos valores aparecen prellenados |
| Verificar "Dar propina" con ese conductor | QR usa la nueva URL |

---

## T07 — Guardar con URL inválida (validación PayPal)

| Paso | Resultado esperado |
|---|---|
| Introducir `https://otro-sitio.com` con proveedor PayPal | Indicador rojo visible |
| Pulsar "Guardar" | Toast de error "El enlace de PayPal debe empezar por..." |
| Verificar DB | URL no guardada (UPDATE no ejecutado) |

---

## T08 — Guardar con URL vacía

| Paso | Resultado esperado |
|---|---|
| Borrar URL, pulsar "Guardar" | Guardado OK (payment_url = null) |
| Verificar "Dar propina" con ese conductor | Aviso "Sin método configurado" |

---

## T09 — Usuario sin perfil de conductor

| Paso | Resultado esperado |
|---|---|
| Login con usuario sin fila en `driver_payment_profiles` | Botón "🔗 Mi enlace" NO aparece |
| Navegar manualmente a la sección (si es posible) | No hay formulario que rellenar — sección vacía o inaccesible |

---

## T10 — Sin regresiones en panel admin

| Paso | Resultado esperado |
|---|---|
| Login como admin | Botón "🚌 Conductores" visible |
| Abrir panel admin, editar un conductor | Dialog funciona como en Sprint 3B |
| Validación PayPal en dialog de admin | Sigue funcionando correctamente |
| QR preview del admin | Sigue funcionando, sin interferencia con el timer del autoservicio |

---

## T11 — Sin regresiones en "Dar propina"

| Paso | Resultado esperado |
|---|---|
| Conductor con PayPal configurado | QR real en "Dar propina", botón "Pagar con PayPal →" |
| Conductor sin URL | Aviso "Sin método configurado" |
| MOCK_DRIVER | Simulación, aviso demo |

---

## T12 — Seguridad

- Sin `paypal_secret`, `client_id`, `sk_`, `pk_live_` en el código fuente.
- `saveDriverSelfProfile()` solo actualiza `payment_provider`, `payment_url`, `payment_instructions`, `is_visible` — no `display_name`, no campos Stripe.
- `selfTestLinkBtn` no envía datos a ningún servidor.
- QR preview usa `api.qrserver.com` — misma URL pública que en producción.
- El UPDATE falla silenciosamente si `driver_id != auth.uid()` (RLS lo bloquea).

---

## T13 — Responsive y UX

| Elemento | Verificar |
|---|---|
| Sección en móvil (375px) | `.driver-self-card` no desborda horizontalmente |
| Badge de proveedor | No rompe la fila del selector |
| QR preview | Centrado y visible en pantallas pequeñas |
| Botón "Probar enlace →" | Área táctil mínima 44px (`.btn-sm` ya tiene `min-height: 44px`) |
| Disclaimer | Legible en fondo amarillo claro |
