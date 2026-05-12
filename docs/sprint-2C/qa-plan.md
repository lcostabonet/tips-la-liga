# Sprint 2C QA Plan: Pruebas en Stripe test mode

## Objetivo
Verificar que las 4 Edge Functions funcionan correctamente en modo test de Stripe sin mover dinero real. Todas las pruebas usan `sk_test_`, tarjetas de prueba y cuentas Connect de test.

---

## Setup de entorno de pruebas

### Tarjetas de prueba Stripe

| Tarjeta | Resultado |
|---|---|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 9995` | Pago fallido (fondos insuficientes) |
| `4000 0025 0000 3155` | Requiere autenticación 3D Secure |

Usar cualquier fecha futura (ej. `12/30`) y cualquier CVC (ej. `123`).

### Cuenta Connect de test
En Stripe Dashboard (modo test):
1. Ir a **Connect → Accounts → + Add test account**.
2. Seleccionar "Express" y completar los datos mínimos de test.
3. Anotar el `acct_...` generado para validaciones manuales.

---

## Pruebas por función

### `create-stripe-account`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Crear cuenta nueva | Llamar con JWT de conductor sin `stripe_account_id` | Devuelve `onboarding_url` con `https://connect.stripe.com/...` |
| Recuperar cuenta existente | Llamar de nuevo con mismo conductor | No crea nueva cuenta; devuelve nuevo `onboarding_url` para la cuenta existente |
| Sin JWT | Llamar sin header `Authorization` | `401 No autorizado` |
| JWT inválido | Llamar con token expirado | `401 Token inválido` |
| Conductor sin perfil | JWT válido pero sin `driver_payment_profiles` | `404 Perfil de conductor no encontrado` |

**Verificar en DB después de llamada exitosa:**
```sql
select stripe_account_id, stripe_status
from public.driver_payment_profiles
where driver_id = '<uuid-conductor>';
-- stripe_account_id: acct_... (no null)
-- stripe_status: 'pending'
```

**Verificar en Stripe Dashboard:**
- Modo test → Connect → Accounts → ver la cuenta creada.

---

### `refresh-stripe-account`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Estado inicial (pendiente) | Conductor con cuenta recién creada | `stripe_status: 'pending'`, `charges_enabled: false` |
| Cuenta completada | Completar onboarding de test en Stripe → llamar refresh | `stripe_status: 'active'`, `charges_enabled: true` |
| Sin cuenta Stripe | Conductor sin `stripe_account_id` | `400 Cuenta Stripe no iniciada` |

**Verificar en DB:**
```sql
select stripe_status, charges_enabled, payouts_enabled
from public.driver_payment_profiles
where driver_id = '<uuid-conductor>';
```

---

### `generate-tip-link`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Generar slug nuevo | Conductor sin `tip_link_slug` | Devuelve slug único, `public_url` y `qr_url` |
| Regenerar (ya tiene slug) | Conductor con `tip_link_slug` existente | Devuelve el mismo slug (no genera uno nuevo) |
| Unicidad | Llamar con dos conductores distintos | Slugs diferentes |

**Verificar en DB:**
```sql
select tip_link_slug, public_url
from public.driver_payment_profiles
where driver_id = '<uuid-conductor>';
-- tip_link_slug: 'marta-g-x7k2' (no null)
-- public_url: 'https://.../tip/marta-g-x7k2'
```

**Verificar QR:** abrir `qr_url` en el navegador → imagen QR que codifica `public_url`.

---

### `create-payment-session`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Pago básico | `{ slug: 'marta-g-x7k2', amount: 5.00 }` | Devuelve `session_url` de Stripe Checkout test |
| Pago completado | Abrir `session_url` → pagar con `4242 4242 4242 4242` | Redirige a `success_url` |
| Pago cancelado | Abrir `session_url` → pulsar "Cancelar" | Redirige a `cancel_url` |
| Conductor sin `charges_enabled` | Usar conductor con `charges_enabled = false` | `400 Este conductor aún no puede recibir pagos.` |
| Slug inexistente | `{ slug: 'no-existe', amount: 5 }` | `404 Conductor no encontrado` |
| Importe inválido | `{ slug: 'marta-g-x7k2', amount: 0.1 }` | `400 Parámetros inválidos` |
| Sin parámetros | `{}` | `400 Parámetros inválidos` |

**Verificar en Stripe Dashboard (test mode):**
- Payments → ver la sesión creada con estado `complete` o `open`.
- Confirmar que el `transfer_data.destination` es el `stripe_account_id` del conductor.
- Confirmar que NO hay movimiento de dinero real.

---

## Prueba de seguridad: campos Stripe no actualizables por conductor

```bash
# Intentar actualizar stripe_account_id directamente (debe fallar)
curl -X PATCH https://<supabase-url>/rest/v1/driver_payment_profiles \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <jwt-conductor>" \
  -H "Content-Type: application/json" \
  -d '{"stripe_account_id": "acct_fake123"}'

# Resultado esperado: error de PostgreSQL con mensaje del trigger
# "No autorizado: stripe_account_id, stripe_status..."
```

---

## Prueba de seguridad: vista pública no expone datos sensibles

```bash
curl https://<supabase-url>/rest/v1/public_driver_profiles \
  -H "apikey: <anon-key>"

# Verificar que la respuesta NO contiene:
# - stripe_account_id
# - driver_id
# - stripe_status
# - payouts_enabled
# - charges_enabled
```

---

## Checks de no-regresión

- [ ] `app.js` sigue funcionando (login, propinas, rankings).
- [ ] `supabase.sql` no ha sido modificado en este sprint.
- [ ] `app.js`, `index.html`, `style.css` no modificados.
- [ ] Ninguna clave `sk_test_` o `sk_live_` aparece en el código commiteado.

---

## Herramientas de prueba recomendadas

- [Stripe Dashboard test mode](https://dashboard.stripe.com/test) — ver cuentas, pagos y eventos.
- [Stripe CLI](https://stripe.com/docs/stripe-cli) — `stripe listen` para simular webhooks en local.
- [Supabase Studio](https://app.supabase.com) — verificar filas en `driver_payment_profiles`.
- `curl` o [Postman](https://www.postman.com) — llamar Edge Functions manualmente.
