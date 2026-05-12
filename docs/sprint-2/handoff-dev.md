# Sprint 2 Handoff Dev

## Objetivo
Entregar al equipo de desarrollo un plan claro para implementar Stripe Connect por conductor sin modificar el frontend actual hasta la siguiente fase.

## Contexto
Sprint 1 validó estabilidad y seguridad de la versión actual de Tips La Liga. Sprint 2 añade pagos directos a conductores usando Stripe Connect y QR individuales.

## Roles
- **Admin**: gestiona conductores, revisa estado Stripe y reportes.
- **Conductor**: crea cuenta Stripe Connect, obtiene QR y recibe pagos directos.
- **Cliente**: escanea QR y paga al conductor.

## Qué implementar primero
1. Tablas nuevas en Supabase: `drivers`, `stripe_accounts`, `tip_links`, `payments`.
2. Políticas RLS para separar conductor/admin/cliente.
3. Edge Functions para Stripe Connect onboarding, generación de pagos y webhook.
4. Frontend leve para conductor y página pública de pago.

## Consideraciones de Stripe Connect
- Usar **Standard Connect** o **Express Connect** según facilidad de onboarding.
- El conductor debe completar onboarding y aprobar `charges_enabled`.
- Stripe Checkout o Payment Links para pagos seguros.

## Variables secretas necesarias
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (frontend, no secreta)
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend/Edge Functions)
- `SUPABASE_URL`

## Qué puede estar en frontend
- `STRIPE_PUBLISHABLE_KEY`
- enlaces públicos QR y `slug`
- session IDs de Stripe Checkout generados por backend
- datos no sensibles de conductor

## Qué nunca puede estar en frontend
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- cualquier token de administrador o secret de Stripe

## Pruebas sugeridas
- Usar Stripe test mode con tarjetas de prueba.
- Validar que onboarding y pagos flujo completo funcionan.
- Probar roles y permisos en Supabase.

## Entregables
- Tablas y políticas Supabase.
- Edge Functions implementadas.
- Frontend mínimo para conductor/QR/pago.
- Documentación de pruebas y riesgos.
