# Sprint 3C Checklist: Autoservicio de enlace de pago para conductores

## Estado general
- [ ] Sprint iniciado
- [ ] Código implementado
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Botón "🔗 Mi enlace" en topbar

- [ ] `#driverLinkBtn` añadido en `index.html` entre `#adminBtn` y `#userBox`
- [ ] Botón oculto (`hidden`) por defecto
- [ ] Botón visible solo cuando `loadDriverSelfProfile()` devuelve fila
- [ ] Botón oculto al cerrar sesión
- [ ] Botón no aparece si el conductor no tiene fila en `driver_payment_profiles`

## Sección `#driverSelfSection`

- [ ] Sección añadida en `index.html` después de `#adminDriversSection`
- [ ] `#driverSelfContent` se rellena desde `showDriverSelfSection()` vía innerHTML
- [ ] Botón "← Volver" (`#backFromSelfBtn`) funciona y vuelve a `appSection`
- [ ] La sección se oculta correctamente al llamar a `hideDriverSelfSection()`
- [ ] `showTipSection()` oculta `#driverSelfSection`
- [ ] `showAdminSection()` oculta `#driverSelfSection`

## Formulario de autoservicio

- [ ] `display_name` mostrado como texto solo lectura al abrir
- [ ] Selector `#selfPaymentProvider` con opciones "Sin configurar" y "PayPal"
- [ ] Selector prellenado con el valor actual del conductor
- [ ] `#selfPaymentUrl` prellenado con la URL actual
- [ ] `#selfPaymentInstructions` prellenado con las instrucciones actuales
- [ ] `#selfDriverVisible` prellenado con el estado actual de `is_visible`
- [ ] Botón "Cancelar" cierra la sección sin guardar
- [ ] Botón "Guardar" envía el UPDATE a Supabase

## Carga del perfil

- [ ] `loadDriverSelfProfile()` usa `.maybeSingle()` (no lanza error si no hay fila)
- [ ] `driverSelfProfile = null` si no hay fila o si hay error de red
- [ ] Variable `driverSelfProfile` actualizada en memoria tras guardar

## Indicador de validación en tiempo real

- [ ] `#selfUrlValidationHint` actualizado al escribir en `#selfPaymentUrl`
- [ ] `#selfUrlValidationHint` actualizado al cambiar `#selfPaymentProvider`
- [ ] URL PayPal válida → "✓ Enlace válido" en verde
- [ ] URL inválida con proveedor PayPal → "✗ El enlace no parece de PayPal" en rojo
- [ ] URL vacía → sin texto en el indicador
- [ ] Proveedor "Sin configurar" con URL → indicador verde

## QR preview

- [ ] `#selfQrPreview` oculto con URL vacía
- [ ] `#selfQrPreview` oculto con URL inválida para PayPal
- [ ] `#selfQrPreview` visible con URL válida (tras debounce ~500ms)
- [ ] QR usa `api.qrserver.com` con `?size=120x120`
- [ ] QR se actualiza al cambiar la URL
- [ ] `#selfQrPreviewImg src` se limpia al ocultar el QR
- [ ] Timer `selfQrPreviewTimer` es independiente de `qrPreviewTimer` (admin)

## Botón "Probar enlace →"

- [ ] `#selfTestLinkBtn` desactivado cuando URL está vacía
- [ ] `#selfTestLinkBtn` desactivado cuando URL es inválida para PayPal
- [ ] `#selfTestLinkBtn` activo cuando URL es válida
- [ ] Pulsar el botón abre la URL en nueva pestaña (`noopener`)
- [ ] Pulsar el botón NO guarda el perfil

## Badge de proveedor

- [ ] `#selfProviderBadge` azul "PayPal" al seleccionar PayPal
- [ ] `#selfProviderBadge` oculto cuando no hay proveedor seleccionado
- [ ] Badge se actualiza inmediatamente al cambiar el selector

## Validación al guardar

- [ ] PayPal con URL inválida → toast de error, sin UPDATE
- [ ] PayPal con URL válida → UPDATE ejecutado correctamente
- [ ] `payment_url = null` (URL vacía) con cualquier proveedor → guardado permitido
- [ ] `isValidPaymentUrl()` reutilizada sin duplicar el array de dominios

## Disclaimer

- [ ] Texto "Tips La Liga no procesa pagos. El pago se realiza fuera de la app y llega directamente a ti." visible en la sección
- [ ] Diseño diferenciado (`.disclaimer-box` amarillo claro)

## Seguridad

- [ ] Sin PayPal API keys
- [ ] Sin claves secretas
- [ ] UPDATE limitado a los 4 campos de pago (`payment_provider`, `payment_url`, `payment_instructions`, `is_visible`)
- [ ] `display_name` NO incluido en el UPDATE de autoservicio
- [ ] Campos Stripe NO incluidos en el UPDATE
- [ ] `testLinkBtn` solo hace `window.open()` — no almacena ni envía datos

## Sin regresiones

- [ ] Panel admin sigue funcionando correctamente
- [ ] "Dar propina" sigue funcionando
- [ ] Login, registro, rankings y propinas funcionan
- [ ] `supabase.sql` sin cambios
- [ ] Edge Functions sin cambios

## CSS

- [ ] `.driver-link-btn` añadido
- [ ] `.driver-self-header` alinea botón y título
- [ ] `.driver-self-card` con estilo de card consistente
- [ ] `.driver-self-name` para mostrar el nombre del conductor
- [ ] `.disclaimer-box` con fondo amarillo claro
- [ ] Clases Sprint 3B reutilizadas sin redefinir

## Documentación

- [ ] `docs/sprint-3C/plan.md` entregado
- [ ] `docs/sprint-3C/handoff-dev.md` entregado
- [ ] `docs/sprint-3C/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-3C/qa-plan.md` entregado
