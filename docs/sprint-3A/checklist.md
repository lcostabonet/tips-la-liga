# Sprint 3A Checklist: Pago externo PayPal

## Estado general
- [ ] Sprint iniciado
- [ ] SQL ejecutado en Supabase
- [ ] Código implementado
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Base de datos

- [ ] Columna `payment_provider text` añadida a `driver_payment_profiles`
- [ ] Columna `payment_url text` añadida a `driver_payment_profiles`
- [ ] Columna `payment_instructions text` añadida a `driver_payment_profiles`
- [ ] Vista `public_driver_profiles` recreada con los 3 campos nuevos
- [ ] Grants `SELECT` re-concedidos a `anon` y `authenticated` sobre la vista
- [ ] `stripe_account_id` sigue excluido de la vista
- [ ] Dato de prueba insertado: un conductor con `payment_provider = 'paypal'` y `payment_url`

## Panel admin — edición

- [ ] Select `editPaymentProvider` añadido al dialog de edición
- [ ] Input `editPaymentUrl` añadido al dialog de edición
- [ ] Textarea `editPaymentInstructions` añadido al dialog de edición
- [ ] `saveEditDriver()` incluye los 3 campos nuevos en el UPDATE
- [ ] `openEditDriverDialog()` pre-rellena los 3 campos con los valores actuales
- [ ] `loadDriverProfiles()` incluye los 3 campos nuevos en el SELECT
- [ ] Las tarjetas del panel admin muestran badge de proveedor si `payment_provider` está configurado

## Sección "Dar propina" — conductor con PayPal

- [ ] `loadPublicDrivers()` incluye los 3 campos nuevos en el SELECT
- [ ] El objeto `normalized` propaga `payment_provider`, `payment_url`, `payment_instructions`
- [ ] QR usa `payment_url` como dato si existe (no demo, no `public_url`)
- [ ] `external-pay-section` se muestra cuando `payment_url` existe y no es mock
- [ ] `payment_instructions` se muestra al cliente si existe
- [ ] Botón "Pagar con PayPal →" visible y activo
- [ ] Chips de importe se muestran para sugerir monto (opcional)
- [ ] El botón abre `payment_url` en nueva pestaña (`window.open(..., '_blank', 'noopener')`)
- [ ] Si `selectedTipAmount > 0` y URL es PayPal.me: el importe se añade a la URL
- [ ] Aviso "El pago se completa en PayPal, fuera de esta app" visible

## Sección "Dar propina" — conductor sin pago configurado

- [ ] Aviso "Este conductor aún no tiene método de pago configurado." visible
- [ ] Sin QR real (QR demo o vacío)
- [ ] Botón de pago oculto o desactivado

## MOCK_DRIVERS (fallback)

- [ ] `isMock: true` sigue activo en todos los MOCK_DRIVERS
- [ ] MOCK_DRIVERS nunca abren URLs externas
- [ ] MOCK_DRIVERS muestran "🧪 Modo demo — el pago no es real"
- [ ] Simulación de pago sigue funcionando para mocks

## Stripe Connect aparcado

- [ ] Columnas Stripe en `driver_payment_profiles` intactas (sin borrar)
- [ ] Edge Functions de Stripe Connect sin modificar
- [ ] Botones Onboarding/Refresh en panel admin no eliminados
- [ ] `guard_stripe_fields` trigger sigue activo

## Sin regresiones

- [ ] Login y registro funcionan
- [ ] Rankings y propinas funcionan
- [ ] Panel admin carga la lista de conductores
- [ ] Edición de campos básicos (nombre, vehículo, ruta, visibilidad) sigue funcionando

## Seguridad

- [ ] Sin claves secretas en `app.js`, `index.html`, `style.css`
- [ ] Sin PayPal API keys en el código
- [ ] `payment_url` nunca se trata como dato sensible (es un enlace público)
- [ ] Vista pública no expone `stripe_account_id`

## Documentación

- [ ] `docs/sprint-3A/plan.md` entregado
- [ ] `docs/sprint-3A/database-plan.md` entregado
- [ ] `docs/sprint-3A/frontend-plan.md` entregado
- [ ] `docs/sprint-3A/handoff-dev.md` entregado
- [ ] `docs/sprint-3A/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-3A/qa-plan.md` entregado
