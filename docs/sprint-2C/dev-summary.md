# Sprint 2C Dev Summary

## Qué se implementó
4 Edge Functions en TypeScript/Deno bajo `supabase/functions/`, más 3 módulos compartidos. Sin cambios en frontend, sin claves hardcodeadas, sin dinero real.

## Archivos creados

```
supabase/functions/
  _shared/
    cors.ts                              ← headers CORS
    stripe.ts                            ← cliente Stripe desde env var
    supabase.ts                          ← cliente admin desde env var
  create-driver-connect-account/
    index.ts                             ← crea cuenta Stripe Connect
  refresh-driver-onboarding-link/
    index.ts                             ← refresca estado y genera link onboarding
  create-driver-payment-link/
    index.ts                             ← crea sesión de pago para cliente
  stripe-webhook/
    index.ts                             ← placeholder Sprint 2D
```

---

## Módulos compartidos

| Archivo | Propósito |
|---|---|
| `_shared/cors.ts` | Headers CORS reutilizables en todas las funciones |
| `_shared/stripe.ts` | Instancia Stripe inicializada desde `STRIPE_SECRET_KEY` (env var) |
| `_shared/supabase.ts` | Cliente admin con `SUPABASE_SERVICE_ROLE_KEY` (inyectado por Supabase) |

Ningún valor secreto está hardcodeado. Ambas keys se leen de `Deno.env.get(...)`.

---

## Funciones implementadas

### `create-driver-connect-account`

- **Auth:** JWT requerido (conductor o admin)
- **Lógica:**
  1. Valida JWT con cliente `anon`
  2. Lee `driver_payment_profiles` con `service_role` (lee `stripe_account_id`)
  3. Si no existe cuenta: `stripe.accounts.create({ type: 'express', country: 'ES' })`
  4. Actualiza DB: `stripe_account_id`, `stripe_status = 'pending'` (via `service_role` → trigger `guard_stripe_fields` lo permite)
  5. Genera `accountLink` de onboarding — **no se persiste**
  6. Devuelve `{ onboarding_url }`
- **Errores:** 401 sin JWT, 404 sin perfil, 500 en error Stripe/DB

### `refresh-driver-onboarding-link`

- **Auth:** JWT requerido
- **Lógica:**
  1. Valida JWT
  2. Obtiene `stripe_account_id` de DB via `service_role`
  3. Llama `stripe.accounts.retrieve()` para obtener estado real
  4. Calcula `stripe_status`: `'active'` si `charges_enabled`, `'restricted'` si hay `disabled_reason`, `'pending'` si no
  5. Actualiza `charges_enabled`, `payouts_enabled`, `stripe_status` en DB
  6. Si `charges_enabled = false`: genera y devuelve `onboarding_url` fresca
  7. Si `charges_enabled = true`: devuelve solo el estado (no genera link innecesario)
- **Errores:** 401, 404, 400 si no hay `stripe_account_id`

### `create-driver-payment-link`

- **Auth:** Ninguna (endpoint público — el cliente paga sin login)
- **Input:** `{ slug: string, amount: number, currency?: string }`
- **Lógica:**
  1. Busca conductor en `public_driver_profiles` por `tip_link_slug` (vista segura)
  2. Obtiene `stripe_account_id` y `charges_enabled` de `driver_payment_profiles` via `service_role`
  3. Valida importe ≥ 0.50 y `charges_enabled = true`
  4. `stripe.checkout.sessions.create(...)` con `transfer_data.destination`
  5. Devuelve `{ session_url }` — el cliente es redirigido a Stripe Checkout
- **`stripe_account_id` nunca se devuelve al cliente**
- **Errores:** 400, 404, 500

### `stripe-webhook` (placeholder)

- Responde `200 { received: true }` sin procesar eventos
- Contiene comentarios con los eventos previstos y requisitos para Sprint 2D:
  - `checkout.session.completed` → `external_tip_payments`
  - `payment_intent.succeeded` / `payment_intent.payment_failed`
  - `account.updated` → sincronizar `charges_enabled`/`payouts_enabled`
  - Validación de `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET`

---

## Decisiones técnicas

### Nombres de funciones
Los nombres implementados difieren de los del plan original (`docs/sprint-2C/plan.md`):

| Implementado | En el plan | Motivo del cambio |
|---|---|---|
| `create-driver-connect-account` | `create-stripe-account` | Más descriptivo del dominio |
| `refresh-driver-onboarding-link` | `refresh-stripe-account` | Combina refresh + accountLink |
| `create-driver-payment-link` | `create-payment-session` | Refleja que devuelve un link |
| `stripe-webhook` | — | Placeholder no previsto en plan original |

### `generate-tip-link` no implementada
La función `generate-tip-link` del plan no fue solicitada en este sprint. Queda como pendiente para Sprint 2D, cuando el frontend necesite generar slugs desde el panel de conductor.

### `refresh-driver-onboarding-link` combina dos responsabilidades
A diferencia del plan, esta función actualiza el estado Y genera un nuevo `onboarding_url` si el onboarding no está completo. Esto evita una segunda llamada de red desde el frontend en el caso más común (conductor que vuelve tras completar onboarding).

### Validación de JWT con cliente `anon`
Las funciones autenticadas crean un cliente con la `SUPABASE_ANON_KEY` inyectada por Supabase y el header `Authorization` del request. Esto delega la validación del JWT a Supabase Auth sin exponer `SERVICE_ROLE_KEY` al usuario.

### `service_role` para escritura de campos Stripe
Todas las escrituras a `driver_payment_profiles` que tocan campos Stripe usan `supabaseAdmin` (service_role). El trigger `guard_stripe_fields` detecta `current_role = 'service_role'` y permite las actualizaciones sin restricción, según el diseño de Sprint 2B.

### Sin `external_tip_payments`
Confirmado fuera de alcance. Se implementará en Sprint 2D junto con el webhook completo.

---

## Variables de entorno necesarias

| Variable | Fuente | Uso |
|---|---|---|
| `STRIPE_SECRET_KEY` | Supabase Secrets (manual) | Autenticar llamadas a Stripe API — debe ser `sk_test_` |
| `SUPABASE_URL` | Inyectada automáticamente | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Inyectada automáticamente | Validar JWT de usuario |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectada automáticamente | Acceso admin a DB |
| `SITE_URL` | Supabase Secrets (manual) | Construir `return_url`, `success_url` |
| `PUBLIC_SITE_URL` | Supabase Secrets (manual) | Control de origen CORS — misma URL que `SITE_URL` |

Ver `docs/sprint-2C/secrets-plan.md` para instrucciones de configuración.

---

## Correcciones post-QA (2026-05-12)

### BUG-01 — Idempotencia en `create-driver-connect-account`
**Cambio:** Añadida `idempotencyKey: 'create-connect-account-${user.id}'` a `stripe.accounts.create()`. Si el DB update falla tras crear la cuenta en Stripe, ahora se loguea con `console.error` y se continúa devolviendo el `onboarding_url` (la cuenta existe en Stripe). El siguiente reintento del conductor recupera la misma cuenta via idempotency key y reintenta el update.

**Limitación residual:** La idempotency key de Stripe expira a las 24h. Si el DB falla y el conductor reintenta pasado ese tiempo sin que el update se haya completado (escenario muy improbable), se crea una segunda cuenta huérfana. Resolución definitiva en Sprint 2D con lookup por metadata.

### RIESGO-01 — CORS restringido por origen
**Cambio:** `_shared/cors.ts` reemplaza el objeto estático `{ 'Access-Control-Allow-Origin': '*' }` por una función `getCorsHeaders(req)` que lee `PUBLIC_SITE_URL` del entorno. Permite `localhost` y `127.0.0.1` en cualquier puerto para modo test. Si `PUBLIC_SITE_URL` no está configurada, usa `'*'` como fallback (solo para entornos de desarrollo sin config).

Todas las funciones actualizadas para llamar `getCorsHeaders(req)` en lugar de usar el objeto estático.

**Nueva variable de entorno:** `PUBLIC_SITE_URL` — configurar en Supabase Secrets con el mismo valor que `SITE_URL` (ej. `https://lcostabonet.github.io/tips-la-liga`).

### RIESGO-02 — Assertion de clave test en `_shared/stripe.ts`
**Cambio:** Al inicializar el módulo, se verifica que `STRIPE_SECRET_KEY` empiece por `sk_test_`. Si no, se lanza una excepción que impide cualquier llamada a Stripe. Protección técnica en lugar de solo documental.

### RIESGO-03 — Errores genéricos en respuestas públicas
**Cambio:** El bloque `catch` de todas las funciones ahora llama `console.error('[nombre-función]', err)` y devuelve un mensaje genérico al cliente:
- Funciones autenticadas: `'Error interno del servidor'`
- `create-driver-payment-link` (público): `'Error procesando la solicitud. Inténtalo de nuevo.'`

Los detalles internos de Stripe (IDs, mensajes de API) solo aparecen en los logs del servidor.

### `deno.json` añadido
**Archivo:** `supabase/functions/deno.json` — activa el modo Deno en VS Code (extensión `denoland.vscode-deno`), resolviendo los falsos positivos del servidor TypeScript (`Cannot find name 'Deno'`, módulos esm.sh, `req: any`).

---

## Archivos NO modificados
- `app.js` ✅
- `index.html` ✅
- `style.css` ✅
- `supabase.sql` ✅

## Siguiente paso (Sprint 2D)
1. Implementar `stripe-webhook` completo (validación firma + `external_tip_payments`).
2. Implementar `generate-tip-link`.
3. Conectar `app.js` con `public_driver_profiles` (reemplazar `MOCK_DRIVERS`).
4. Conectar botón "Pagar" con `create-driver-payment-link`.
5. Añadir panel de conductor para onboarding y estado Stripe.
6. Añadir `PUBLIC_SITE_URL` a Supabase Secrets.
