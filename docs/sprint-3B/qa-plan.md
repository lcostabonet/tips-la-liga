# Sprint 3B QA Plan: Mejoras UX panel admin

## Setup
- Sesión de admin activa.
- Al menos 1 conductor con `payment_provider = 'paypal'` y `payment_url` configurado.
- Al menos 1 conductor sin `payment_url`.

---

## T01 — Abrir dialog con conductor PayPal existente

| Paso | Resultado esperado |
|---|---|
| Pulsar "Editar" en conductor con PayPal configurado | Dialog abre con URL y proveedor prellenados |
| Verificar indicador | "✓ Enlace válido" en verde desde el inicio |
| Verificar QR | QR preview visible con URL del conductor |
| Verificar badge | Badge azul "PayPal" junto al selector |
| Verificar botón "Probar →" | Activo |

---

## T02 — Indicador de validación en tiempo real

| Paso | Resultado esperado |
|---|---|
| Borrar la URL | Indicador desaparece, QR oculto, botón desactivado |
| Escribir `https://paypal.me/test` | "✓ Enlace válido" (verde), QR aparece tras ~500ms |
| Cambiar a `https://otro-sitio.com` | "✗ El enlace no parece de PayPal" (rojo), QR oculto |
| Seleccionar proveedor "Sin configurar" con URL | Indicador verde (cualquier URL válida sin proveedor) |
| Volver a seleccionar "PayPal" con URL inválida | Indicador rojo inmediatamente |

---

## T03 — QR preview con debounce

| Paso | Resultado esperado |
|---|---|
| Escribir URL rápidamente, letra a letra | QR no se actualiza en cada tecla |
| Parar de escribir 500 ms | QR se actualiza con la URL actual |
| Borrar toda la URL | QR desaparece |
| Verificar que el QR codifica `payment_url` exactamente | Escanear QR → URL correcta |

---

## T04 — Botón "Probar →"

| Paso | Resultado esperado |
|---|---|
| Con URL válida: pulsar "Probar →" | Nueva pestaña con el enlace de PayPal |
| Con URL vacía: botón visible | Botón desactivado (`disabled`) |
| Con URL inválida PayPal: botón visible | Botón desactivado |
| Pulsar "Probar →" | El dialog sigue abierto (no guarda) |
| Verificar DevTools → Network | Sin llamadas a APIs externas (solo `window.open`) |

---

## T05 — Guardar con URL válida

| Paso | Resultado esperado |
|---|---|
| Introducir URL PayPal válida, pulsar "Guardar" | Guardado OK, toast "Perfil actualizado." |
| Verificar tarjeta del conductor | Badge PayPal y QR actualizados |
| Verificar "Dar propina" | QR del conductor usa la nueva URL |

---

## T06 — Guardar con URL inválida (regresión Sprint 3A)

| Paso | Resultado esperado |
|---|---|
| Introducir `https://otro-sitio.com` con proveedor PayPal | Indicador rojo visible |
| Pulsar "Guardar" | Toast de error "El enlace de PayPal debe empezar por..." |
| Verificar DB | URL no guardada (UPDATE no se ejecuta) |

---

## T07 — Abrir dialog con conductor sin URL

| Paso | Resultado esperado |
|---|---|
| Pulsar "Editar" en conductor sin `payment_url` | Dialog abre con URL vacía |
| Verificar indicador | Sin texto |
| Verificar QR | Oculto |
| Verificar botón "Probar →" | Desactivado |
| Guardar sin URL | Guardado OK (URL null) |

---

## T08 — Sin regresiones en "Dar propina"

| Paso | Resultado esperado |
|---|---|
| Conductor con PayPal configurado | QR real en "Dar propina", botón "Pagar con PayPal →" |
| Conductor sin URL | Aviso "Sin método configurado" |
| MOCK_DRIVER | Simulación, aviso demo |

---

## T09 — Seguridad

- Sin `paypal_secret`, `client_id`, `sk_`, `pk_live_` en el código fuente.
- `testLinkBtn` no envía datos a ningún servidor.
- QR preview usa URL de `api.qrserver.com` — es la misma que en producción.
- El valor del QR preview no se envía a ningún servidor de la app.

---

## T10 — Responsive y UX

| Elemento | Verificar |
|---|---|
| Dialog en móvil (375px) | `.provider-select-row` no desborda horizontalmente |
| Badge de proveedor | No rompe el layout del selector |
| QR preview | Visible y centrado en pantallas pequeñas |
| Botón "Probar →" | Tamaño mínimo 44px de alto |
