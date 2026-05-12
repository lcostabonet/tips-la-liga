# Frontend Plan

## Objetivo
Definir cómo el frontend mostrará QR, onboarding de Stripe y flujos de pago sin exponer secretos.

## Páginas y vistas clave
### 1. Panel de conductor
- Estado de Stripe Connect.
- Botón para iniciar/reiniciar onboarding.
- Enlace QR y URL de pago del conductor.
- Historial de pagos y métricas básicas.

### 2. Página pública de pago
- Mostrar conductor, monto sugerido y botón de pago.
- Llamar a Edge Function `create-payment-session`.
- Redirigir a Stripe Checkout o mostrar un enlace de pago.

### 3. Panel de admin
- Lista de conductores y estado de sus cuentas Stripe.
- Acceso para forzar re-onboarding.
- Reporte básico de pagos y volumen.

### 4. Componente de QR
- Genera QR desde `public_url` o `tip_link.slug`.
- No contiene secretos, solo enlace público.

## Roles y comportamiento
- **Conductor**: solo ve su propio panel, su estado Stripe y su QR.
- **Cliente**: solo ve la página pública de pago, no accede a datos de conductor internos.
- **Admin**: ve panel de gestión de conductores y supervisa estados.

## API calls hacia Edge Functions
- `POST /create-stripe-account` → inicia onboarding.
- `POST /refresh-stripe-account` → refresca estado de cuenta Stripe.
- `POST /generate-tip-link` → crea link/QR.
- `POST /create-payment-session` → crea sesión de pago.
- `GET /driver/:slug` → consulta datos públicos de conductor.

## Qué puede estar en frontend
- URLs públicas de tip link.
- Identificadores de conductor no sensibles (`slug`, `display_name`).
- SessionId de Stripe Checkout generados por Edge Functions.
- Estado de conexión Stripe devuelto por backend.

## Qué nunca puede estar en frontend
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CLIENT_SECRET`
- `service_role` de Supabase o cualquier credential de backend.
- Datos PCI, números de tarjeta o tokens no autorizados.

## Validación de usuario
- Usar Supabase Auth para conductor y admin.
- Proteger rutas sensibles con verificación de rol.
- No renderizar botones de onboarding a clientes.

## Móvil y UX
- Mostrar QR y enlaces claramente en móviles.
- Usar botones grandes y texto legible.
- Manejar errores de red y mostrar instrucciones de pago.
