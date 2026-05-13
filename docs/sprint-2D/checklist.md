# Sprint 2D Checklist: Panel admin + integración frontend

## Estado general
- [ ] Sprint iniciado
- [ ] Edge Function `generate-tip-link` implementada y desplegada
- [ ] Panel admin implementado
- [ ] "Dar propina" actualizado con datos reales
- [ ] Pruebas en Stripe test mode completadas
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Edge Function: `generate-tip-link`
- [ ] Archivo `supabase/functions/generate-tip-link/index.ts` creado
- [ ] Auth JWT requerida (conductor propio o admin con `driver_id` en body)
- [ ] Genera slug único si no existe; reutiliza si ya tiene uno
- [ ] Persiste `tip_link_slug` y `public_url` en `driver_payment_profiles` via `service_role`
- [ ] Devuelve `{ tip_link_slug, public_url, qr_url }`
- [ ] `qr_url` apunta a `api.qrserver.com` con `public_url` codificada
- [ ] Desplegada sin errores en Supabase
- [ ] Sin claves secretas hardcodeadas

## Panel admin: estructura
- [ ] Sección `#adminDriversSection` añadida a `index.html`
- [ ] Solo visible si `isAdmin()` retorna `true`
- [ ] Botón "+ Nuevo conductor" abre formulario
- [ ] Formulario permite: `display_name`, `vehicle_info`, `route_info`
- [ ] Guardar formulario inserta/actualiza en `driver_payment_profiles`
- [ ] Lista de conductores cargada desde `driver_payment_profiles` vía Supabase

## Panel admin: estado Stripe
- [ ] Badge de `stripe_status` visible por conductor (colores diferenciados)
- [ ] `charges_enabled` y `payouts_enabled` visibles como flags
- [ ] Badge actualizado tras llamar a `refresh-driver-onboarding-link`

## Panel admin: acciones
- [ ] "Iniciar onboarding" llama a `create-driver-connect-account` con JWT
- [ ] `onboarding_url` se abre en nueva pestaña
- [ ] "Actualizar estado" llama a `refresh-driver-onboarding-link` con JWT
- [ ] Estado se actualiza en UI sin recargar la página
- [ ] "Generar link/QR" llama a `generate-tip-link` con JWT y `driver_id`
- [ ] QR real aparece en la tarjeta del conductor
- [ ] `public_url` se muestra como enlace clicable
- [ ] "Test: pagar 1€" llama a `create-driver-payment-link` sin auth
- [ ] `session_url` abre Stripe Checkout en nueva pestaña
- [ ] Pago test con `4242 4242 4242 4242` completa sin error
- [ ] "Editar" permite modificar `display_name`, `vehicle_info`, `route_info`, `is_visible`

## Sección "Dar propina" actualizada
- [ ] `MOCK_DRIVERS` eliminados o comentados en `app.js`
- [ ] Conductores cargados desde `public_driver_profiles` vía Supabase anon client
- [ ] Solo conductores con `is_active = true` y `is_visible = true` se muestran
- [ ] QR de cada conductor usa su `public_url` real (si existe)
- [ ] Conductor sin `tip_link_slug` muestra QR placeholder o mensaje
- [ ] Botón "Pagar" usa `tip_link_slug` real para llamar a `create-driver-payment-link`

## Seguridad
- [ ] `stripe_account_id` nunca seleccionado ni mostrado en UI
- [ ] Sin `sk_test_`, `sk_live_` ni `STRIPE_WEBHOOK_SECRET` en frontend
- [ ] Panel admin no accesible para usuarios no-admin (validación por `isAdmin()`)
- [ ] Edge Functions validan JWT propio (seguridad en servidor)
- [ ] Ninguna clave secreta nueva en `app.js`, `index.html`, `style.css`

## Sin regresiones
- [ ] Login y registro funcionan correctamente
- [ ] Rankings mensual y global funcionan
- [ ] Historial diario funciona
- [ ] Añadir/editar/borrar propinas propias funciona
- [ ] Export CSV funciona
- [ ] Sección "Dar propina" pre-existente (Sprint 2A) funciona con datos reales

## Documentación
- [ ] `docs/sprint-2D/plan.md` entregado
- [ ] `docs/sprint-2D/handoff-dev.md` entregado
- [ ] `docs/sprint-2D/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-2D/qa-plan.md` entregado
- [ ] `docs/sprint-2D/dev-summary.md` creado al terminar la implementación
