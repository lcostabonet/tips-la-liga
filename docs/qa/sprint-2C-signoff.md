# QA Sign-off: Sprint 2C — Edge Functions Stripe Connect (modo test)

**Fecha:** 2026-05-12
**Revisión:** estática (lectura de código fuente + `git diff HEAD`)
**Archivos revisados:** `supabase/functions/**/*.ts`, `docs/sprint-2C/plan.md`, `docs/sprint-2C/dev-summary.md`

---

## Pruebas realizadas

| # | Prueba | Método |
|---|---|---|
| 1 | Sin claves secretas en archivos | Grep `sk_test_\|sk_live_\|pk_live_\|whsec_\|service_role` en valor literal |
| 2 | Uso de `Deno.env.get()` | Lectura de todos los `.ts` |
| 3 | `STRIPE_SECRET_KEY` no hardcodeada | Lectura `_shared/stripe.ts` |
| 4 | Solo claves test | Grep por literales live en código |
| 5 | Updates a DB desde backend seguro | Trazado de `supabaseAdmin` en funciones que escriben |
| 6 | Frontend no modificado | `git diff HEAD -- app.js index.html style.css` |
| 7 | Sin dinero real | Análisis de modo Stripe + ausencia de live keys |
| 8 | Sin registro de pago real | Lectura `stripe-webhook` + búsqueda `external_tip_payments` |
| 9 | Compatibilidad con `guard_stripe_fields` | Análisis `service_role` → trigger |
| 10 | Manejo de errores en respuestas | Revisión de `try/catch` y códigos HTTP en cada función |
| 11 | CORS controlado | Lectura `_shared/cors.ts` + verificación en cada handler |
| 12 | Sin datos sensibles en respuestas | Trazado de campos devueltos por cada `okResponse` |

---

## Checks aprobados

**[1] Sin claves secretas en archivos**
Grep sobre `sk_test_`, `sk_live_`, `pk_live_`, `whsec_`, y valores literales de `service_role`: sin coincidencias de valores reales. Los únicos resultados son la lectura `Deno.env.get('STRIPE_SECRET_KEY')` (leer de entorno, no un valor hardcodeado) y un comentario en `stripe-webhook/index.ts`. ✅

**[2] Todas las variables sensibles usan `Deno.env.get()`**
- `_shared/stripe.ts`: `Deno.env.get('STRIPE_SECRET_KEY')!`
- `_shared/supabase.ts`: `Deno.env.get('SUPABASE_URL')!`, `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!`
- Funciones: `Deno.env.get('SUPABASE_ANON_KEY')!`, `Deno.env.get('SITE_URL') ?? 'http://localhost:3000'`

Fallback seguro en `SITE_URL`: `localhost:3000` para desarrollo local. ✅

**[3] `STRIPE_SECRET_KEY` no hardcodeada**
`_shared/stripe.ts` línea 3: `new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, ...)`. Ningún valor literal `sk_...` en el código. ✅

**[4] Solo claves test**
No existe ningún literal `sk_live_`, `pk_live_` ni `rk_live_` en ningún archivo. El modo test depende de la key configurada en Supabase Secrets, que según `secrets-plan.md` debe ser `sk_test_...`. ✅

**[5] Updates a DB desde backend seguro**
- `create-driver-connect-account`: escribe `stripe_account_id` y `stripe_status` usando `supabaseAdmin` (service_role) ✅
- `refresh-driver-onboarding-link`: escribe `charges_enabled`, `payouts_enabled`, `stripe_status` usando `supabaseAdmin` ✅
- `create-driver-payment-link`: solo lectura, no escribe ✅
- `stripe-webhook`: placeholder, no escribe ✅

Ninguna función usa el cliente `anon` para escribir campos Stripe. ✅

**[6] Frontend no modificado**
`git diff HEAD -- app.js index.html style.css` → sin output. Los tres archivos idénticos al último commit. ✅

**[7] Sin dinero real**
No existen literales de claves live en el código. `create-driver-payment-link` crea una `checkout.sessions` que en Stripe test mode no mueve dinero real. La protección depende de que `STRIPE_SECRET_KEY` sea `sk_test_...` (ver RIESGO-02). ✅

**[8] Sin registro de pago real todavía**
`stripe-webhook/index.ts` es un placeholder que devuelve `{ received: true }` sin procesar ningún evento. No existe lógica de escritura en `external_tip_payments`. La tabla `external_tip_payments` no ha sido creada. ✅

**[9] Compatibilidad con `guard_stripe_fields`**
`supabaseAdmin` usa `SUPABASE_SERVICE_ROLE_KEY`. En Supabase, este rol establece `current_role = 'service_role'` en PostgreSQL. El trigger `guard_stripe_fields` evalúa `if current_role in ('postgres', 'service_role') then return new; end if;` como primera condición — permite todas las actualizaciones sin restricción. La compatibilidad es total. ✅

**[10] Manejo de errores en respuestas**
Cada función tiene `try/catch` externo que atrapa cualquier error y devuelve `errorResponse(500, err.message)`. Adicionalmente:

| Función | Códigos específicos |
|---|---|
| `create-driver-connect-account` | 401 (sin header), 401 (token inválido), 404 (sin perfil), 500 (updateError), 500 (Stripe) |
| `refresh-driver-onboarding-link` | 401, 404, 400 (sin cuenta Stripe), 500 (updateError), 500 (Stripe) |
| `create-driver-payment-link` | 400 (JSON inválido), 400 (params), 404 (conductor), 404 (perfil), 400 (sin cuenta), 400 (charges disabled), 500 |
| `stripe-webhook` | Sin manejo de errores (placeholder sin lógica) ✅ |

✅

**[11] CORS controlado**
- `_shared/cors.ts` define `Access-Control-Allow-Origin: '*'` y `Access-Control-Allow-Headers`.
- Todas las funciones manejan `OPTIONS` preflight con `return new Response('ok', { headers: corsHeaders })`.
- Todas las respuestas (ok y error) incluyen `{ ...corsHeaders, 'Content-Type': 'application/json' }`. ✅

**[12] Sin datos sensibles en respuestas**

| Función | Campos devueltos | ¿Incluye datos sensibles? |
|---|---|---|
| `create-driver-connect-account` | `{ onboarding_url }` | No. URL de Stripe, no una key. |
| `refresh-driver-onboarding-link` | `{ stripe_status, charges_enabled, payouts_enabled, onboarding_url? }` | No. Sin `stripe_account_id`. |
| `create-driver-payment-link` | `{ session_url }` | No. Sin `stripe_account_id`. |
| Todas (error) | `{ error: message }` | Ver RIESGO-03. |

`stripe_account_id` nunca aparece en ninguna respuesta exitosa. ✅

---

## Checks fallidos

Ninguno. Los 12 checks han pasado.

---

## Bugs encontrados

### BUG-01 — No idempotente en `create-driver-connect-account` si falla el UPDATE
- **Gravedad:** Baja
- **Bloquea Sprint 2C:** No (test mode)
- **Descripción:** Si `stripe.accounts.create()` tiene éxito pero `supabaseAdmin.update()` falla a continuación, la cuenta Stripe queda creada en Stripe pero `stripe_account_id` sigue siendo `null` en DB. La siguiente llamada del conductor creará una segunda cuenta Stripe huérfana.
- **Flujo afectado:** Poco probable (el update a DB es una operación simple), pero posible en caso de timeout o error transitorio.
- **Recomendación Sprint 2D:** Añadir lógica de recuperación: antes de crear una cuenta nueva, consultar en Stripe si ya existe alguna cuenta con `metadata.supabase_user_id = user.id`.

---

## Riesgos

### RIESGO-01 — `CORS: '*'` en todas las funciones
- **Gravedad:** Media para producción / Baja para Sprint 2C
- **Descripción:** `Access-Control-Allow-Origin: '*'` permite que cualquier origen web llame a las funciones. Para funciones autenticadas (`create-driver-connect-account`, `refresh-driver-onboarding-link`), el JWT mitiga el riesgo. Para `create-driver-payment-link` (pública), cualquier script externo puede iniciar sesiones de pago con cualquier slug.
- **Recomendación:** Restringir a `SITE_URL` antes de producción: `'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*'`.

### RIESGO-02 — Sin assert de modo test en código
- **Gravedad:** Baja
- **Descripción:** No hay verificación en código de que `STRIPE_SECRET_KEY` empiece por `sk_test_`. Si alguien configura `sk_live_` en Supabase Secrets, las funciones funcionarían igual pero con dinero real. La única protección es el proceso documentado en `secrets-plan.md`.
- **Recomendación:** Añadir al arranque de `_shared/stripe.ts`:
  ```typescript
  const key = Deno.env.get('STRIPE_SECRET_KEY')!;
  if (!key.startsWith('sk_test_')) throw new Error('Solo se permiten claves Stripe test en este entorno.');
  ```

### RIESGO-03 — `err.message` de Stripe puede filtrar detalles internos
- **Gravedad:** Baja
- **Descripción:** El catch externo devuelve `err instanceof Error ? err.message : 'Error interno'`. Los errores de la API de Stripe incluyen mensajes como `"No such account: acct_xxx"` que podrían filtrar IDs internos o detalles de configuración al cliente.
- **Afecta a:** `create-driver-payment-link` (público). En funciones autenticadas el riesgo es menor.
- **Recomendación Sprint 2D:** Distinguir errores de Stripe (loguear internamente, devolver mensaje genérico al cliente).

### RIESGO-04 — `stripe-webhook` acepta cualquier POST sin validar firma
- **Gravedad:** Informativa (placeholder sin lógica)
- **Descripción:** Actualmente el webhook responde 200 a cualquier POST. No procesa eventos. No hay riesgo activo porque no ejecuta ninguna acción. En Sprint 2D, antes de procesar eventos, es obligatorio validar `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET`.
- **Estado:** Documentado en comentarios del placeholder.

### RIESGO-05 — `generate-tip-link` pendiente
- **Gravedad:** Informativa
- **Descripción:** La función `generate-tip-link` del plan original no fue implementada en Sprint 2C. Los conductores no pueden generar slugs/QR desde el backend hasta Sprint 2D.
- **Impacto:** Sin bloqueo en Sprint 2C (no hay frontend conectado todavía).

---

## Decisión final (revisión inicial)

**APROBADO ✅** — con BUG-01, RIESGO-01, RIESGO-02 y RIESGO-03 pendientes de corrección.

---

## Re-revisión post-fix (2026-05-12)

**Método:** análisis estático de `supabase/functions/**/*.ts` tras las correcciones + `git diff HEAD`.

### Verificación de los 9 checks

| # | Check | Resultado | Evidencia |
|---|---|---|---|
| 1 | BUG-01: idempotencia en `create-driver-connect-account` | ✅ Resuelto (con limitación residual documentada) | `idempotencyKey: 'create-connect-account-${user.id}'` línea 37 |
| 2 | RIESGO-01: CORS sin `'*'` abierto | ✅ Mitigado (requiere `PUBLIC_SITE_URL` en prod) | `cors.ts`: origen validado contra env var |
| 3 | RIESGO-02: rechaza claves no `sk_test_` | ✅ Resuelto | `stripe.ts` líneas 5–9: `throw new Error(...)` en startup |
| 4 | RIESGO-03: sin errores internos en respuestas | ✅ Resuelto | `err.message` ausente en responses; `console.error` en todos los catch |
| 5 | Webhook sigue siendo placeholder documentado | ✅ | `stripe-webhook/index.ts`: `{ received: true }` + comentarios Sprint 2D |
| 6 | `generate-tip-link` pendiente para Sprint 2D | ✅ | Directorio inexistente; documentado en `dev-summary.md` |
| 7 | Sin claves secretas en archivos | ✅ | Grep `sk_live_\|sk_test_[a-zA-Z0-9]`: sin coincidencias de valores reales |
| 8 | Frontend no modificado | ✅ | `git diff HEAD -- app.js index.html style.css`: vacío |
| 9 | Sin dinero real | ✅ | `stripe.ts` lanza error si key no es `sk_test_` → imposible usar live key |

### Análisis detallado

**Check 1 — BUG-01 (idempotencia)**
`create-driver-connect-account/index.ts` línea 37: `{ idempotencyKey: 'create-connect-account-${user.id}' }`. Stripe devuelve la misma cuenta en reintentos dentro de 24h. Si el DB update falla, se loguea y se continúa — el conductor recibe `onboarding_url` igualmente. El próximo intento recupera la misma cuenta de Stripe y reintenta el update.

**Limitación residual documentada:** la idempotency key expira en 24h. Si DB falla y el conductor reintenta pasado ese tiempo, podría crearse una segunda cuenta. Probabilidad: muy baja en test mode. Resolución completa planificada en Sprint 2D (lookup por `metadata.supabase_user_id`). ✅

**Check 2 — RIESGO-01 (CORS)**
`_shared/cors.ts`: función `getCorsHeaders(req)` que lee `PUBLIC_SITE_URL`. Lógica:
- `origin === PUBLIC_SITE_URL` → permite (devuelve origin exacto)
- `origin` es localhost/127.0.0.1 → permite (test mode)
- Cualquier otro origen → devuelve `siteUrl` como header (el browser lo rechaza)
- Si `PUBLIC_SITE_URL` no está configurada → fallback `'*'`

El fallback `'*'` solo se activa si `PUBLIC_SITE_URL` no está configurado. En producción, con la variable correctamente configurada en Supabase Secrets, nunca se usa `'*'`. Grep de `'*'` literal en respuestas: solo aparece en el condicional `(siteUrl || '*')` de `cors.ts`, no como valor fijo. ✅

**Check 3 — RIESGO-02 (`sk_test_` assert)**
`_shared/stripe.ts` líneas 3–9: `stripeKey.startsWith('sk_test_')`. Si falla, `throw new Error(...)`. Como `stripe.ts` es importado por módulo en todas las funciones, el error se propaga en el inicio de cada función antes de procesar ninguna request. `stripeKey = ''` también falla el assert (vacío no empieza por `sk_test_`). ✅

**Check 4 — RIESGO-03 (sin errores internos expuestos)**
Grep sobre `err\.message` en respuestas: sin coincidencias. Todos los catch:
- `console.error('[nombre-función]', err)` → logs de servidor
- `errorResponse(req, 500, '<mensaje genérico>')` → cliente

El único `updateError.message` que aparece es en `refresh-driver-onboarding-link` línea 48, pasado a `console.error` (servidor), no a la response. ✅

**Checks 5–9:** confirmados sin cambios respecto a análisis anterior.

### Riesgos restantes

| ID | Gravedad | Estado | Descripción |
|---|---|---|---|
| BUG-01 | ~~Baja~~ | Mitigado | Idempotency key cubre 24h; lookup por metadata en Sprint 2D |
| RIESGO-01 | ~~Media/Baja~~ | Mitigado | `'*'` solo como fallback dev; requiere `PUBLIC_SITE_URL` en prod |
| RIESGO-02 | ~~Baja~~ | **Resuelto** | Assert `sk_test_` en startup |
| RIESGO-03 | ~~Baja~~ | **Resuelto** | `console.error` + mensajes genéricos |
| RIESGO-04 | Informativa | Abierto (intencional) | Webhook placeholder sin validación de firma |
| RIESGO-05 | Informativa | Abierto (intencional) | `generate-tip-link` pendiente Sprint 2D |

---

## Decisión final (post-fix)

**APROBADO SIN PENDIENTES BLOQUEANTES ✅**

Los 9 checks solicitados han pasado. BUG-01 sustancialmente mitigado mediante idempotency key (limitación residual de 24h documentada y no bloqueante en test). RIESGO-01 mitigado condicionalmente sobre configuración de `PUBLIC_SITE_URL` en Supabase Secrets. RIESGO-02 y RIESGO-03 completamente resueltos a nivel de código. Sprint 2C listo para avanzar a Sprint 2D.
