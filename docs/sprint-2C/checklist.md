# Sprint 2C Checklist: Edge Functions Stripe Connect

## Estado general
- [ ] Sprint iniciado
- [ ] Secretos configurados en Supabase
- [ ] Funciones implementadas y desplegadas
- [ ] Pruebas en Stripe test mode completadas
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## Setup y secretos
- [ ] `STRIPE_SECRET_KEY` empieza por `sk_test_` (no `sk_live_`)
- [ ] `STRIPE_SECRET_KEY` configurado en Supabase Secrets (no en código)
- [ ] `SITE_URL` configurado en Supabase Secrets
- [ ] `.gitignore` incluye `.env`, `supabase/.env`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NO aparece en ningún archivo fuente
- [ ] Ninguna clave secreta en commits o archivos rastreados

## Estructura de archivos
- [ ] `supabase/functions/_shared/cors.ts` creado
- [ ] `supabase/functions/_shared/stripe.ts` creado
- [ ] `supabase/functions/_shared/supabase.ts` creado
- [ ] `supabase/functions/create-stripe-account/index.ts` creado
- [ ] `supabase/functions/refresh-stripe-account/index.ts` creado
- [ ] `supabase/functions/generate-tip-link/index.ts` creado
- [ ] `supabase/functions/create-payment-session/index.ts` creado

## Función: `create-stripe-account`
- [ ] Desplegada sin errores en Supabase
- [ ] Devuelve `401` sin JWT
- [ ] Devuelve `404` si el conductor no tiene perfil
- [ ] Crea cuenta Stripe Connect en test mode
- [ ] Persiste `stripe_account_id` y `stripe_status = 'pending'` en DB
- [ ] Devuelve `onboarding_url` (no guardado en DB)
- [ ] Reutiliza cuenta existente si ya tiene `stripe_account_id`

## Función: `refresh-stripe-account`
- [ ] Desplegada sin errores
- [ ] Actualiza `charges_enabled`, `payouts_enabled`, `stripe_status` en DB
- [ ] Devuelve `400` si no hay `stripe_account_id`
- [ ] Refleja el estado real de la cuenta en Stripe Dashboard

## Función: `generate-tip-link`
- [ ] Desplegada sin errores
- [ ] Genera slug único basado en `display_name`
- [ ] Persiste `tip_link_slug` y `public_url` en DB
- [ ] Reutiliza slug existente si ya existe
- [ ] Devuelve `qr_url` válida (imagen QR accesible)

## Función: `create-payment-session`
- [ ] Desplegada sin errores (pública, sin JWT requerido)
- [ ] Devuelve `404` para slug inexistente
- [ ] Devuelve `400` si conductor sin `charges_enabled`
- [ ] Devuelve `400` para importes inválidos (< 0.50)
- [ ] Crea sesión de Checkout en Stripe test mode
- [ ] `session_url` redirige a página de pago de prueba de Stripe
- [ ] Pago con tarjeta `4242 4242 4242 4242` completa sin error
- [ ] `transfer_data.destination` apunta a `stripe_account_id` del conductor
- [ ] Cancelación redirige a `cancel_url`

## Seguridad
- [ ] Conductor no puede actualizar `stripe_account_id` directamente (trigger bloquea)
- [ ] Conductor no puede actualizar `stripe_status` directamente
- [ ] Vista pública `public_driver_profiles` no expone `stripe_account_id`
- [ ] Ninguna Edge Function devuelve `stripe_account_id` al cliente
- [ ] `create-payment-session` no expone `stripe_account_id` en la respuesta

## Compatibilidad con código existente
- [ ] `app.js` no modificado
- [ ] `index.html` no modificado
- [ ] `style.css` no modificado
- [ ] `supabase.sql` no modificado
- [ ] Login, propinas y rankings existentes siguen funcionando

## Documentación
- [ ] `docs/sprint-2C/plan.md` entregado
- [ ] `docs/sprint-2C/handoff-dev.md` entregado
- [ ] `docs/sprint-2C/secrets-plan.md` entregado
- [ ] `docs/sprint-2C/qa-plan.md` entregado
- [ ] `docs/sprint-2C/checklist.md` entregado (este archivo)
