# Edge Functions Plan

## Objetivo
Definir los serverless endpoints que median entre el frontend y Stripe, protegiendo las claves secretas y gestionando eventos de pago.

## Funciones necesarias
### 1. `create-stripe-account`
- Crea o recupera una cuenta Stripe Connect para un conductor.
- Llama a la API de Stripe para iniciar el onboarding de Connect.
- Devuelve un enlace seguro de onboarding al frontend.
- No guarda `onboarding_url` permanentemente en la base de datos; los enlaces se generan bajo demanda.
- Actualiza `stripe_accounts` con `stripe_account_id` y estado inicial.

### 2. `refresh-stripe-account`
- Actualiza el estado de la cuenta Connect consultando Stripe.
- Refresca `charges_enabled`, `payouts_enabled` y `requirements`.
- Permite reintentar onboarding si faltan datos.

### 3. `generate-tip-link`
- Crea o actualiza un `tip_link` único para cada conductor.
- Genera `slug` y `public_url`.
- Devuelve URL/QR ready-to-share.

### 4. `create-payment-session`
- Crea una `Checkout Session` o `PaymentIntent` de Stripe Connect.
- Usa `stripe_account_id` del conductor.
- Configura `payment_method_types`, `amount`, `currency`, y metadatos.
- Redirige al cliente a Stripe Checkout o devuelve sessionId.

### 5. `stripe-webhook`
- Recibe eventos seguros de Stripe.
- Valida la firma con `STRIPE_WEBHOOK_SECRET`.
- Maneja eventos clave:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `account.updated`
- Actualiza `payments` y `stripe_accounts` en Supabase.
- Mantiene `external_tip_payments` como fase posterior para registrar pagos cuando el webhook esté habilitado.

## Seguridad en las funciones
- Usar solo variables secretas en el entorno de Edge Functions.
- Validar que el usuario está autenticado en funciones que requieren conductor/admin.
- No exponer `stripe_secret_key` ni `webhook_secret` al frontend.

## Datos de entrada
- `driver_id` o `tip_link.slug`.
- `amount` y `currency` para pagos.
- `redirect_url` de éxito y cancelación.

## Datos de salida
- `onboarding_url`
- `checkout_session_id` o `payment_url`
- Estado de cuenta Stripe
- Errores amigables para frontend

## Pruebas y monitoreo
- Registrar errores y respuestas de Stripe.
- Usar logs para discrepancias de webhook.
- Validar idempotencia en eventos webhook.
