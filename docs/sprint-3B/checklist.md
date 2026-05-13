# Sprint 3B Checklist: Mejoras UX panel admin

## Estado general
- [ ] Sprint iniciado
- [ ] Código implementado
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Indicador de validación en tiempo real

- [ ] `#urlValidationHint` añadido en el dialog después de `editPaymentUrl`
- [ ] Al escribir URL PayPal válida: texto verde "✓ Enlace válido"
- [ ] Al escribir URL inválida con proveedor PayPal: texto rojo "✗ El enlace no parece de PayPal"
- [ ] Con URL vacía: indicador vacío (sin texto)
- [ ] Con proveedor distinto de PayPal: indicador verde para cualquier URL no vacía
- [ ] Indicador se actualiza al cambiar el selector de proveedor (sin escribir)
- [ ] Indicador se inicializa correctamente al abrir el dialog (con valores prellenados)

## QR preview en el dialog

- [ ] `#editQrPreview` añadido en el dialog
- [ ] QR oculto cuando URL está vacía
- [ ] QR oculto cuando URL es inválida para el proveedor
- [ ] QR visible con URL válida (tras debounce de ~500 ms)
- [ ] QR usa `api.qrserver.com` con `?size=120x120`
- [ ] QR codifica el `payment_url` exactamente
- [ ] QR se actualiza al cambiar la URL
- [ ] QR se oculta al borrar la URL

## Botón "Probar →"

- [ ] `#testLinkBtn` añadido en el dialog
- [ ] Botón desactivado cuando URL está vacía
- [ ] Botón desactivado cuando URL es inválida para PayPal
- [ ] Botón activo cuando URL es válida
- [ ] Pulsar el botón abre la URL en nueva pestaña (`noopener`)
- [ ] Pulsar el botón NO guarda el perfil

## Badge de proveedor en selector

- [ ] `#editProviderBadge` añadido junto al selector
- [ ] Badge azul "PayPal" cuando se selecciona PayPal
- [ ] Badge oculto cuando no hay proveedor seleccionado
- [ ] Badge se actualiza inmediatamente al cambiar el selector

## Validación al guardar (Sprint 3A, sin regresión)

- [ ] Si PayPal con URL inválida: toast de error, sin guardar
- [ ] `isValidPaymentUrl()` función reutilizable extraída de `saveEditDriver()`
- [ ] Mismos dominios válidos: paypal.me, www.paypal.me, paypal.com, www.paypal.com
- [ ] URL null/vacía: sin error al guardar (conductor sin enlace configurado)

## Integración con el resto del panel admin

- [ ] `openEditDriverDialog()` inicializa el preview al abrir
- [ ] Guardar cierra el dialog y actualiza la tarjeta del conductor
- [ ] Cancelar no activa ningún preview ni guarda nada
- [ ] Al abrir un conductor sin URL: preview oculto, botón desactivado

## Sin regresiones

- [ ] "Dar propina" sigue mostrando QR y botón PayPal correctamente
- [ ] Login, registro, rankings y propinas funcionan
- [ ] Panel admin carga la lista de conductores
- [ ] Botones Onboarding/Refresh (Stripe aparcado) siguen visibles

## Seguridad

- [ ] Sin PayPal API keys en el código
- [ ] Sin claves secretas
- [ ] `testLinkBtn` solo hace `window.open()` — no almacena ni envía datos
- [ ] QR preview usa URL pública externa (`api.qrserver.com`) — no expone secretos

## CSS

- [ ] `.url-valid` verde, `.url-invalid` rojo
- [ ] `.url-validation-hint` altura mínima para evitar saltos de layout
- [ ] `.qr-preview-box` con fondo diferenciado del dialog
- [ ] `.btn-sm` tamaño compacto para "Probar →"
- [ ] `.provider-select-row` alinea select y badge en la misma fila

## Documentación

- [ ] `docs/sprint-3B/plan.md` entregado
- [ ] `docs/sprint-3B/handoff-dev.md` entregado
- [ ] `docs/sprint-3B/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-3B/qa-plan.md` entregado
