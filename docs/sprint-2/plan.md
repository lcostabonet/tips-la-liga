# Sprint 2 Plan: Stripe Connect por conductor

## Objetivo del sprint
Añadir arquitectura para que cada conductor tenga un QR individual y reciba propinas directamente mediante Stripe Connect.

## Alcance
- Diseñar los flujos de admin, conductor y cliente.
- Planificar la base de datos Supabase extendida para conductores y cuentas Stripe.
- Definir Edge Functions para conectar con Stripe y generar QR dinámicos.
- Especificar variables secretas y límites de frontend.
- Documentar el plan de pruebas en Stripe test mode.
- Identificar riesgos legales/fiscales.

## Tareas principales
1. Definir flujos de usuario y roles.
2. Diseñar una tabla inicial simple: `driver_payment_profiles`, con `external_tip_payments` reservada para una fase posterior.
3. Identificar Edge Functions necesarias:
   - creación de cuenta Stripe Connect onboarding
   - generación de intentos de pago QR
   - webhook de Stripe para eventos de pago (fase posterior)
4. Establecer variables secretas y qué puede vivir en frontend.
5. Planificar pruebas E2E con Stripe test mode.
6. Documentar riesgos legales y tax.
7. Preparar handoff para desarrollo.

## Prioridad
1. Seguridad y separación de roles.
2. Arquitectura de pagos Stripe Connect.
3. Generación de QR de conductor.
4. Integración con Supabase Auth y RLS.

## Entregables
- `docs/sprint-2/plan.md`
- `docs/sprint-2/stripe-connect-architecture.md`
- `docs/sprint-2/database-plan.md`
- `docs/sprint-2/edge-functions-plan.md`
- `docs/sprint-2/frontend-plan.md`
- `docs/sprint-2/security-risks.md`
- `docs/sprint-2/handoff-dev.md`
- `docs/sprint-2/checklist.md`
