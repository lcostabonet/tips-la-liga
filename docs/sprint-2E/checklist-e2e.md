# Sprint 2E Checklist E2E: Stripe Connect en modo test

## Estado general
- [ ] Prerrequisitos verificados
- [ ] Flujo E2E completado sin errores
- [ ] Verificaciones de DB completadas
- [ ] Verificaciones de seguridad completadas
- [ ] Sprint aprobado

---

## Prerrequisitos

- [ ] Edge Functions desplegadas: `create-driver-connect-account`, `refresh-driver-onboarding-link`, `generate-tip-link`, `create-driver-payment-link`, `stripe-webhook`
- [ ] Secret `STRIPE_SECRET_KEY` configurado y empieza por `sk_test_`
- [ ] Secret `SITE_URL` configurado (URL de la web publicada o localhost)
- [ ] Secret `PUBLIC_SITE_URL` configurado (misma URL que SITE_URL)
- [ ] Secret `ADMIN_EMAIL` configurado (`lluis15basket@hotmail.es`)
- [ ] Usuario admin existe en Supabase Auth con ese email
- [ ] Al menos 1 fila en `driver_payment_profiles` con `driver_id` válido
- [ ] Stripe Dashboard en modo test activo

---

## Paso 1 — Login de admin

- [ ] Abrir la web (publicada o local)
- [ ] Iniciar sesión con el usuario admin
- [ ] El botón "🚌 Conductores" aparece en el topbar tras el login
- [ ] El botón "💸 Dar propina" sigue visible

---

## Paso 2 — Panel de conductores

- [ ] Pulsar "🚌 Conductores"
- [ ] La sección `#adminDriversSection` se muestra
- [ ] La lista de conductores carga desde `driver_payment_profiles`
- [ ] Cada conductor muestra: nombre, vehículo/ruta, badge de `stripe_status`
- [ ] El badge del conductor de prueba muestra "Sin conectar" (gris)
- [ ] Los flags `charges_enabled` y `payouts_enabled` muestran ✗
- [ ] El botón "Test 1€" está desactivado (sin slug ni charges)

---

## Paso 3 — Iniciar onboarding

- [ ] Pulsar "Onboarding" para el conductor de prueba
- [ ] El toast muestra "Iniciando onboarding..."
- [ ] Se abre una nueva pestaña con la URL de Stripe Express onboarding
- [ ] La URL empieza por `https://connect.stripe.com/`

**Verificar en DB:**
```sql
select stripe_account_id, stripe_status
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
-- stripe_account_id: acct_... (no null)
-- stripe_status: 'pending'
```

**Verificar en Stripe Dashboard (test mode):**
- Connect → Accounts → nueva cuenta Express visible

---

## Paso 4 — Completar onboarding en Stripe

- [ ] Completar el formulario de onboarding de Stripe en la pestaña abierta
  - Introducir datos de prueba: nombre, teléfono, dirección
  - Usar cuenta bancaria de prueba si se solicita
- [ ] Stripe redirige a `${SITE_URL}/?onboarding=complete`
- [ ] Volver a la pestaña de la app

---

## Paso 5 — Actualizar estado

- [ ] Pulsar "Actualizar estado" para el mismo conductor
- [ ] El toast muestra "Actualizando estado Stripe..."
- [ ] El badge cambia a "Activa ✓" (verde)
- [ ] Los flags `charges_enabled` y `payouts_enabled` muestran ✓
- [ ] La tarjeta se recarga sin errores

**Verificar en DB:**
```sql
select stripe_status, charges_enabled, payouts_enabled
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
-- stripe_status: 'active'
-- charges_enabled: true
-- payouts_enabled: true (o false si Stripe lo requiere por región)
```

---

## Paso 6 — Generar QR

- [ ] Pulsar "Generar QR" para el mismo conductor
- [ ] El toast muestra "Generando QR..."
- [ ] La sección `.driver-qr-box` aparece en la tarjeta
- [ ] La imagen QR es visible y carga desde `api.qrserver.com`
- [ ] El enlace `public_url` es clicable y tiene formato `${SITE_URL}/tip/${slug}`

**Verificar en DB:**
```sql
select tip_link_slug, public_url
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
-- tip_link_slug: no null, formato 'nombre-xxxx'
-- public_url: no null, formato '${SITE_URL}/tip/nombre-xxxx'
```

---

## Paso 7 — Pago test desde panel admin

- [ ] El botón "Test 1€" está ahora activo (slug + charges_enabled)
- [ ] Pulsar "Test 1€"
- [ ] El toast muestra "Creando sesión de pago test..."
- [ ] Se abre Stripe Checkout en nueva pestaña (URL `https://checkout.stripe.com/...`)
- [ ] La sesión muestra "Propina para [nombre conductor]" · 1,00 €
- [ ] Introducir tarjeta `4242 4242 4242 4242`, fecha `12/30`, CVC `123`
- [ ] El pago se procesa correctamente
- [ ] Stripe redirige a `${SITE_URL}/tip/${slug}?payment=success`

**Verificar en Stripe Dashboard (test mode):**
- Payments → pago de 1,00 € con estado `succeeded`
- `transfer_data.destination` = `stripe_account_id` del conductor

---

## Paso 8 — Sección "Dar propina" con datos reales

- [ ] Pulsar "← Volver" en el panel admin
- [ ] Pulsar "💸 Dar propina"
- [ ] Los conductores se cargan desde `public_driver_profiles` (no MOCK_DRIVERS)
- [ ] El conductor de prueba aparece en la lista (si `is_visible = true`)
- [ ] Al seleccionar el conductor, el QR usa la `public_url` real
- [ ] El aviso muestra "🧪 Modo test — el pago es de prueba con Stripe"
- [ ] Seleccionar importe → pulsar "Pagar X€"
- [ ] Se abre Stripe Checkout en nueva pestaña
- [ ] Pagar con `4242 4242 4242 4242` → éxito

---

## Paso 9 — Verificación de seguridad

- [ ] Abrir DevTools → pestaña Network
- [ ] Ninguna request incluye `sk_test_`, `sk_live_`, `service_role` ni `STRIPE_WEBHOOK_SECRET`
- [ ] Las requests a Edge Functions incluyen header `Authorization: Bearer <token>`
- [ ] La request a `create-driver-payment-link` NO incluye `Authorization` (endpoint público)
- [ ] La respuesta de ninguna Edge Function incluye `stripe_account_id`

---

## Paso 10 — Verificación de la vista pública

```sql
-- Debe devolver solo campos públicos (sin stripe_account_id, driver_id, etc.)
select * from public.public_driver_profiles;

-- Debe fallar o devolver 0 filas para usuario anónimo
select stripe_account_id from public.public_driver_profiles;
-- Resultado esperado: error "column does not exist"
```

- [ ] `public_driver_profiles` no expone `stripe_account_id`
- [ ] `public_driver_profiles` no expone `driver_id`
- [ ] `public_driver_profiles` no expone `stripe_status`, `payouts_enabled`, `charges_enabled`
- [ ] Conductor con `is_visible = false` no aparece en la vista

---

## Paso 11 — Sin regresiones

- [ ] Login y registro de usuarios normales funcionan
- [ ] Añadir propinas en EUR y USD funciona
- [ ] Rankings mensual y global se muestran correctamente
- [ ] Historial diario funciona
- [ ] Export CSV funciona
- [ ] Editar y borrar propinas propias funciona

---

## Paso 12 — Prueba de pago fallido (tarjeta rechazada)

- [ ] Repetir paso 7 o paso 8 con tarjeta `4000 0000 0000 9995`
- [ ] Stripe muestra error "Tu tarjeta no tiene fondos suficientes"
- [ ] La app muestra el toast de error apropiado
- [ ] La sesión de Stripe queda en estado `expired` o `open` (no `complete`)
- [ ] `driver_payment_profiles` no se modifica

---

## Paso 13 — Editar perfil desde panel admin

- [ ] Pulsar "Editar" en una tarjeta de conductor
- [ ] El dialog de edición se abre con los datos actuales
- [ ] Modificar `vehicle_info` o `route_info`
- [ ] Pulsar "Guardar"
- [ ] La tarjeta se actualiza con los nuevos datos
- [ ] `stripe_account_id` y `stripe_status` no han cambiado

**Verificar en DB:**
```sql
select display_name, vehicle_info, route_info, stripe_status, stripe_account_id
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
-- stripe_account_id y stripe_status: sin cambios
-- vehicle_info / route_info: actualizados
```
