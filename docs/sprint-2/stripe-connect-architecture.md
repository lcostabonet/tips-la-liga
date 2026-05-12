# Stripe Connect Architecture

## Visión general
Stripe Connect permite que cada conductor reciba pagos directos como subcuenta conectada. El frontend muestra un QR para el conductor, el pago pasa por Stripe y solo los metadatos mínimos se almacenan en Supabase.

## Componentes principales
- **Frontend**: muestra QR único, inicia onboarding, consulta estado de Stripe Connect.
- **Supabase**: almacena el perfil de conductor y su perfil de pago en `driver_payment_profiles`; `external_tip_payments` se reserva para una fase posterior con webhooks.
- **Edge Functions**: actúan como backend serverless para Stripe Connect y webhooks.
- **Stripe**: maneja cuentas conectadas, pagos, tokens y comisiones.

## Flujo de admin
1. El admin crea o aprueba un conductor en el panel de administración.
2. Admin puede ver estado de Stripe Connect de cada conductor.
3. Admin puede forzar re-onboarding o revocar acceso si es necesario.
4. Admin revisa reportes de pagos y retenciones.

## Flujo de conductor
1. El conductor se registra con Supabase Auth.
2. El conductor completa su perfil público (nombre, vehículo, ruta).
3. El conductor inicia onboarding de Stripe Connect desde el frontend.
4. Stripe devuelve un enlace de onboarding que se abre en el navegador.
5. Al finalizar, Stripe redirige y el estado se actualiza en el perfil `driver_payment_profiles`.
6. El conductor recibe un QR único y/o enlace compartible generado desde el perfil.
7. El conductor puede ver el estado de su cuenta y si su perfil está listo para cobrar.

## Flujo de cliente
1. El cliente escanea el QR del conductor o abre el enlace.
2. El cliente ve el monto sugerido o puede ingresar una propina.
3. El cliente paga con tarjeta via Stripe Checkout o Payment Link.
4. Stripe procesa el pago directo a la cuenta conectada del conductor.
5. La aplicación puede usar un webhook en una fase posterior para registrar los pagos en `external_tip_payments`.

## Flujo técnico de pago
1. Cliente abre enlace QR.
2. El frontend/Edge Function crea un `PaymentIntent` o `Checkout Session` con Stripe Connect.
3. Stripe autoriza el pago y retiene comisión de la plataforma si aplica.
4. Stripe notifica evento al webhook configurado.
5. En la fase inicial, el estado de pago se mantiene en Stripe y el webhook se habilita en la fase posterior para persistir los pagos en `external_tip_payments`.

## QR individual
- Cada conductor tiene su `tip_link_slug` y `public_url` guardados en `driver_payment_profiles`.
- El QR codifica el enlace de pago o el identificador del conductor.
- El enlace resuelve en una página pública que muestra el conductor y el monto.

## Nota
Nunca enviar al frontend las claves secretas de Stripe. El frontend solo usa links y tokens de sesión seguros generados por Edge Functions.
