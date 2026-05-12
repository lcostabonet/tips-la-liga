# Database Plan

## Nuevas tablas necesarias
### `driver_payment_profiles`
- `id` uuid primary key default gen_random_uuid()
- `driver_id` uuid references auth.users(id) not null unique
- `display_name` text not null
- `vehicle_info` text
- `route_info` text
- `stripe_account_id` text
- `stripe_status` text
- `payouts_enabled` boolean default false
- `charges_enabled` boolean default false
- `tip_link_slug` text unique
- `public_url` text
- `is_active` boolean default true
- `is_visible` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

### `external_tip_payments` (fase posterior)
- `id` uuid primary key default gen_random_uuid()
- `driver_profile_id` uuid references public.driver_payment_profiles(id) not null
- `stripe_payment_id` text not null unique
- `amount_cents` integer not null
- `currency` text not null
- `amount_received_cents` integer
- `stripe_fee_cents` integer
- `status` text not null
- `metadata` jsonb
- `paid_at` timestamptz
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

## Relaciones clave
- Un `driver_payment_profile` representa el conductor y su perfil de Stripe Connect.
- Un `driver_payment_profile` puede tener múltiples `external_tip_payments` en una fase posterior.
- El `tip_link_slug` y `public_url` viven en el perfil para generar el QR público.

## Políticas RLS sugeridas
- `driver_payment_profiles`: no permitir lectura pública de toda la tabla.
  - Solo campos seguros pueden exponerse en vistas públicas: `display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_active`, `is_visible`.
  - Edición solo por conductor propio o admin.
- `external_tip_payments`: lectura solo por conductor propio y admin; insertación controlada por webhook/Edge Functions.

## Metadatos adicionales
- Nunca exponer `stripe_account_id` públicamente.
- No guardar `onboarding_url` permanentemente; los enlaces de onboarding se deben generar bajo demanda con Edge Function.
- Mantener `tip_link_slug` para generar QR públicos sin necesidad de tablas adicionales.
- Registrar si la cuenta Stripe está lista para cobrar y pagar.

## Campos fuera de la base de datos
- No guardar números de tarjeta ni datos PCI.
- No almacenar claves secretas ni tokens de acceso de Stripe en texto plano.
