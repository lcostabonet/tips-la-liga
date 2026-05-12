# Security Risks

## 1. Exposición de claves secretas
- Riesgo: publicar `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET` en frontend o repositorio.
- Mitigación: almacenar solo en Edge Functions/entorno servidor y no en el cliente.

## 2. Datos PCI
- Riesgo: manipular tarjetas de crédito en el frontend sin usar Stripe.
- Mitigación: usar Stripe Checkout/Payment Intents y no almacenar datos de tarjeta.

## 3. Permisos incorrectos en Supabase
- Riesgo: políticas RLS demasiado laxas permiten que un conductor lea o edite datos ajenos o incluso toda la tabla `driver_payment_profiles`.
- Mitigación: no permitir lectura pública de la tabla completa y exponer solo campos seguros en vistas públicas: `display_name`, `vehicle_info`, `route_info`, `tip_link_slug`, `public_url`, `is_active`, `is_visible`.
- Riesgo adicional: exponer `stripe_account_id` públicamente.
- Mitigación adicional: nunca exponer `stripe_account_id` en vistas públicas.

## 4. Webhooks inseguros
- Riesgo: aceptar eventos Stripe sin verificar la firma.
- Mitigación: validar `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET`.

## 5. Flujo de onboarding comprometido
- Riesgo: un conductor con cuenta Stripe mal configurada puede causar rechazos de pago.
- Mitigación: validar `charges_enabled` y `payouts_enabled` antes de generar link QR.

## 6. Pagos sin conductor válido
- Riesgo: crear pagos para `driver_id` inválidos o inactivos.
- Mitigación: validar conductor y estado de `tip_link` antes de iniciar pago.

## 7. Datos sensibles en logs
- Riesgo: registrar IDs o metadatos de pago sensibles en logs públicos.
- Mitigación: limitar logs a errores y estados, no almacenar tokens ni detalles de tarjeta.

## 8. Riesgos de escalabilidad de Edge Functions
- Riesgo: muchas solicitudes de generación de QR/pago pueden saturar funciones.
- Mitigación: usar caché ligero, límites de llamada y manejo de throttling.

## 9. Riesgos legales/fiscales
- Riesgo: no informar adecuadamente que Stripe maneja pagos directos y puede retener impuestos.
- Mitigación: incluir avisos legales claros en la página del conductor y documentación interna.
