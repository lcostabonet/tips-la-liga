# Sprint 2 Checklist

## Preparación
- [ ] Crear carpeta `docs/sprint-2` y revisar los documentos de planificación.
- [ ] Definir roles: admin, conductor, cliente.
- [ ] Configurar entorno Stripe test mode.

## Base de datos
- [ ] Crear tabla `drivers`.
- [ ] Crear tabla `stripe_accounts`.
- [ ] Crear tabla `tip_links`.
- [ ] Crear tabla `payments`.
- [ ] Añadir relaciones y restricciones.
- [ ] Implementar políticas RLS para cada tabla.

## Edge Functions
- [ ] Implementar `create-stripe-account`.
- [ ] Implementar `refresh-stripe-account`.
- [ ] Implementar `generate-tip-link`.
- [ ] Implementar `create-payment-session`.
- [ ] Implementar `stripe-webhook`.

## Frontend
- [ ] Mostrar estado Stripe Connect para cada conductor.
- [ ] Permitir onboarding desde panel de conductor.
- [ ] Generar y mostrar QR/link público.
- [ ] Crear página pública de pago por conductor.
- [ ] Usar `STRIPE_PUBLISHABLE_KEY` en el cliente.

## Pruebas Stripe test mode
- [ ] Registrar conductor y completar onboarding en Stripe test.
- [ ] Generar QR y hacer pago con tarjeta de prueba.
- [ ] Verificar `payments` en Supabase.
- [ ] Revisar webhook y estado de sesión.
- [ ] Probar rechazo de pago y mensaje de error.

## Seguridad
- [ ] Confirmar que secretos Stripe no están en frontend.
- [ ] Confirmar que secretos de Supabase no están en frontend.
- [ ] Verificar firma de webhook con `STRIPE_WEBHOOK_SECRET`.
- [ ] Revisar logs y no exponer datos sensibles.

## Riesgos y validación
- [ ] Validar que `charges_enabled` y `payouts_enabled` se actualizan.
- [ ] Verificar que solo conductor/admin puede editar su `tip_link`.
- [ ] Confirmar que los clientes solo pueden ver datos públicos.
- [ ] Documentar riesgos legales y fiscales.

## Entrega
- [ ] Revisar todos los docs de `docs/sprint-2`.
- [ ] Revisar el commit final antes de push.
- [ ] Preparar handoff para el siguiente sprint.
