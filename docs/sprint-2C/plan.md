# Sprint 2C Plan: Edge Functions para Stripe Connect (modo test)

## Objetivo del sprint
Implementar las Edge Functions de Supabase que median entre el frontend y Stripe Connect, en modo test (sin dinero real). Al finalizar, será posible crear cuentas Stripe Connect de conductores, generar onboarding, generar enlaces de pago y crear sesiones de checkout de prueba.

## Contexto
- Sprint 2B creó `driver_payment_profiles` con RLS y el trigger `guard_stripe_fields` que bloquea cambios en campos Stripe para usuarios normales. Las Edge Functions usan `service_role`, que el trigger permite explícitamente.
- El frontend (`app.js`) aún usa `MOCK_DRIVERS`. Sprint 2C no modifica el frontend.
- Sprint 2D conectará el frontend con estas Edge Functions.

## Alcance

### Incluye
- 4 Edge Functions en TypeScript/Deno bajo `supabase/functions/`.
- Definición de variables de entorno secretas (Supabase Vault).
- Flujo de admin y flujo de conductor documentados.
- Cómo cada función actualiza `driver_payment_profiles` usando `service_role`.
- Pruebas en Stripe test mode (tarjetas de prueba, cuentas Connect de test).

### Excluye explícitamente
- Modificar `app.js`, `index.html` ni `style.css`.
- Claves Stripe live (`sk_live_`, `pk_live_`).
- Claves secretas hardcodeadas en código o commits.
- Tabla `external_tip_payments` (fase posterior, Sprint 2D+).
- Webhook de Stripe (Sprint 2D).
- Frontend conectado a estas funciones (Sprint 2D).

---

## Estructura de archivos

```
supabase/
  functions/
    create-stripe-account/
      index.ts
    refresh-stripe-account/
      index.ts
    generate-tip-link/
      index.ts
    create-payment-session/
      index.ts
```

---

## Edge Functions

### 1. `create-stripe-account`

**Propósito:** Crear o recuperar la cuenta Stripe Connect Express de un conductor e iniciar su onboarding.

**Auth requerida:** Sí — conductor (propio) o admin.

**Flujo:**
1. Extraer `user_id` del JWT de Supabase.
2. Consultar `driver_payment_profiles` vía `service_role` para obtener `stripe_account_id`.
3. Si `stripe_account_id` es null: llamar `stripe.accounts.create({ type: 'express', country: 'ES' })`.
4. Actualizar `driver_payment_profiles` con `stripe_account_id` y `stripe_status = 'pending'`.
5. Generar `accountLink` de onboarding con `stripe.accountLinks.create(...)`.
6. Devolver `{ onboarding_url }` al frontend. **No persistir `onboarding_url`.**

**Respuesta:**
```json
{ "onboarding_url": "https://connect.stripe.com/setup/..." }
```

---

### 2. `refresh-stripe-account`

**Propósito:** Sincronizar el estado de la cuenta Stripe Connect del conductor con Supabase.

**Auth requerida:** Sí — conductor (propio) o admin.

**Flujo:**
1. Obtener `stripe_account_id` de `driver_payment_profiles` vía `service_role`.
2. Llamar `stripe.accounts.retrieve(stripe_account_id)`.
3. Actualizar en `driver_payment_profiles`:
   - `charges_enabled`
   - `payouts_enabled`
   - `stripe_status` → `'active'` si `charges_enabled = true`, `'restricted'` si hay requirements pendientes, `'pending'` si no.
4. Devolver estado actualizado.

**Respuesta:**
```json
{
  "stripe_status": "active",
  "charges_enabled": true,
  "payouts_enabled": true
}
```

---

### 3. `generate-tip-link`

**Propósito:** Crear o actualizar el `tip_link_slug` y `public_url` del conductor.

**Auth requerida:** Sí — conductor (propio) o admin.

**Flujo:**
1. Obtener `display_name` y `tip_link_slug` actuales de `driver_payment_profiles`.
2. Si `tip_link_slug` ya existe: usar el existente.
3. Si no: generar slug único a partir de `display_name` + sufijo aleatorio (ej. `marta-g-x7k2`). Verificar unicidad en DB.
4. Construir `public_url = https://<SITE_URL>/tip/<slug>`.
5. Actualizar `driver_payment_profiles.tip_link_slug` y `public_url` vía `service_role`.
6. Devolver slug, URL y enlace de QR.

**Respuesta:**
```json
{
  "tip_link_slug": "marta-g-x7k2",
  "public_url": "https://lcostabonet.github.io/tips-la-liga/tip/marta-g-x7k2",
  "qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<public_url>"
}
```

---

### 4. `create-payment-session`

**Propósito:** Crear una Checkout Session de Stripe Connect para que el cliente pague al conductor.

**Auth requerida:** No — endpoint público (el cliente no necesita login).

**Input:** `{ slug: string, amount: number, currency?: string }`

**Flujo:**
1. Buscar conductor en `public_driver_profiles` por `tip_link_slug` (vista segura, solo campos públicos).
2. Obtener `stripe_account_id` y `charges_enabled` de `driver_payment_profiles` vía `service_role`.
3. Validar: `is_active = true`, `is_visible = true`, `charges_enabled = true`.
4. Llamar `stripe.checkout.sessions.create`:
   - `payment_method_types: ['card']`
   - `line_items` con el importe
   - `transfer_data: { destination: stripe_account_id }`
   - `success_url`, `cancel_url`
5. Devolver `{ session_url }` para redirigir al cliente.

**Respuesta:**
```json
{ "session_url": "https://checkout.stripe.com/pay/cs_test_..." }
```

**Error si `charges_enabled = false`:**
```json
{ "error": "Este conductor aún no puede recibir pagos." }
```

---

## Cómo se actualiza `driver_payment_profiles`

Las Edge Functions usan el cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY` (inyectado automáticamente por Supabase en el entorno de funciones). Esto bypassa RLS y es reconocido por el trigger `guard_stripe_fields` (`current_role = 'service_role'`), que devuelve `NEW` sin restricciones.

Ningún `service_role` key aparece en el código fuente ni en commits.

---

## Flujo de admin

1. Admin accede al panel (Sprint 2D).
2. Selecciona un conductor y pulsa "Iniciar onboarding" → llama a `create-stripe-account`.
3. Se redirige al conductor al enlace de onboarding de Stripe.
4. Admin pulsa "Actualizar estado" → llama a `refresh-stripe-account`.
5. Admin puede ver `stripe_status`, `charges_enabled`, `payouts_enabled` del conductor.
6. Admin puede regenerar el tip link → llama a `generate-tip-link`.

## Flujo de conductor

1. Conductor se registra y completa su perfil público.
2. Conductor pulsa "Conectar con Stripe" → llama a `create-stripe-account`.
3. Conductor completa el onboarding en Stripe (fuera de la app).
4. Al volver, la app llama a `refresh-stripe-account` para actualizar el estado.
5. Si `charges_enabled = true`, el conductor puede generar su QR → `generate-tip-link`.
6. El conductor comparte el QR/link; los clientes pagan via `create-payment-session`.

---

## Criterios de aceptación

- [ ] Las 4 funciones despliegan sin error en Supabase (test mode).
- [ ] `create-stripe-account` devuelve un `onboarding_url` válido (Stripe test).
- [ ] `refresh-stripe-account` actualiza correctamente los flags en `driver_payment_profiles`.
- [ ] `generate-tip-link` genera un slug único y lo persiste.
- [ ] `create-payment-session` crea una sesión de Checkout en Stripe test.
- [ ] Ninguna clave secreta aparece en el código fuente ni en commits.
- [ ] `app.js`, `index.html` y `style.css` no han sido modificados.
- [ ] Todas las operaciones usan modo test de Stripe (`sk_test_`).

## Siguiente paso (Sprint 2D)
Conectar el frontend (`app.js`) con estas Edge Functions: reemplazar `MOCK_DRIVERS` con datos reales de `public_driver_profiles`, añadir el flujo de onboarding para conductores y conectar el botón "Pagar" con `create-payment-session`.
