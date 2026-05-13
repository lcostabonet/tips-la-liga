# Sprint 2E Handoff QA: Guía técnica para pruebas E2E

## Contexto
Sprint 2E valida el flujo completo de Stripe Connect en modo test. No hay código nuevo que implementar — este sprint es de validación. Los componentes a probar son:
- Frontend: `app.js`, `index.html`, `style.css` (panel admin + "Dar propina")
- Edge Functions: 4 funciones desplegadas en Supabase
- DB: tabla `driver_payment_profiles` + vista `public_driver_profiles`

---

## Setup del entorno de pruebas

### Opción A: Web publicada en GitHub Pages

1. Acceder a `https://lcostabonet.github.io/tips-la-liga`
2. Edge Functions ya desplegadas en el proyecto Supabase de producción
3. Verificar que los Secrets de Supabase están configurados (ver sección de Secrets)

### Opción B: Local con Supabase remoto

1. Clonar el repositorio y abrir `index.html` directamente en el navegador
2. El `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `app.js` apuntan al proyecto remoto
3. Las Edge Functions están desplegadas en el proyecto remoto

### Opción C: Completamente local

```bash
# Requiere Supabase CLI y cuenta de Stripe test
supabase start
supabase functions serve
```

> Para las pruebas de Sprint 2E se recomienda **Opción A o B** para usar las Edge Functions ya desplegadas.

---

## Verificar Secrets de Supabase

Antes de ejecutar cualquier test, verificar en Supabase Dashboard → Settings → Edge Functions → Secrets:

| Secret | Valor esperado | Obligatorio |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Sí |
| `SITE_URL` | URL del proyecto (sin barra final) | Sí |
| `PUBLIC_SITE_URL` | Misma URL que SITE_URL | Sí |
| `ADMIN_EMAIL` | `lluis15basket@hotmail.es` | Sí |

Si `ADMIN_EMAIL` no está configurado, el admin no podrá llamar las Edge Functions en nombre de conductores (las funciones usarán el `driver_id` del admin en lugar del conductor).

---

## Verificar datos iniciales en DB

```sql
-- Ver estado inicial de driver_payment_profiles
select
  id,
  display_name,
  stripe_status,
  charges_enabled,
  payouts_enabled,
  tip_link_slug,
  public_url,
  is_active,
  is_visible
from public.driver_payment_profiles
order by display_name;

-- El conductor de prueba debe tener:
-- stripe_status: 'not_connected' (o null)
-- charges_enabled: false
-- tip_link_slug: null (o valor previo)
```

Si no hay filas, insertar datos de prueba via SQL Editor (ver Sprint 2B handoff-dev.md).

---

## Guía paso a paso para el tester

### Paso 1: Abrir DevTools antes de empezar

En Chrome/Firefox, abrir DevTools → Network tab. Esto permite verificar:
- Que las requests no contienen claves secretas
- Los headers de las llamadas a Edge Functions
- Las respuestas de las Edge Functions

Activar "Preserve log" para no perder el historial al navegar.

### Paso 2: Login como admin

1. Abrir la web
2. Iniciar sesión con `lluis15basket@hotmail.es`
3. Verificar en DevTools que la request de login devuelve un JWT (response con `access_token`)
4. El botón "🚌 Conductores" debe aparecer en el topbar

**Si el botón no aparece:** el email del usuario no coincide con `ADMIN_EMAIL` en `app.js` o la sesión no se inició correctamente.

### Paso 3: Verificar el panel admin

1. Pulsar "🚌 Conductores"
2. La lista debe cargarse desde Supabase (verificar en Network: request a `driver_payment_profiles`)
3. En DevTools → Network: buscar la request con URL `...rest/v1/driver_payment_profiles...`
   - Verificar que el header `Authorization` incluye el JWT del admin
   - Verificar que la respuesta NO contiene el campo `stripe_account_id` (no está en el SELECT)

### Paso 4: Llamar create-driver-connect-account

1. Pulsar "Onboarding" para un conductor
2. En DevTools → Network: buscar la request a `functions/v1/create-driver-connect-account`
   - Verificar header `Authorization: Bearer <token>`
   - Verificar body: `{ "driver_id": "<uuid>" }`
   - Verificar respuesta: `{ "onboarding_url": "https://connect.stripe.com/..." }`
3. Se abre nueva pestaña con la URL de Stripe

**Si da error 404 "Perfil de conductor no encontrado":** el `driver_id` en el body no coincide con ningún registro en `driver_payment_profiles`. Verificar que el UUID del conductor es correcto.

**Si da error 500 "STRIPE_SECRET_KEY inválida":** el secret `STRIPE_SECRET_KEY` no está configurado o no empieza por `sk_test_`.

### Paso 5: Completar onboarding en Stripe (test mode)

En la pestaña de Stripe:
1. Completar el formulario con datos ficticios:
   - Nombre del negocio: "Test Conductor"
   - Tipo: Individual
   - País: España
   - Fecha de nacimiento: cualquier fecha (ej. 01/01/1990)
   - Dirección: cualquier dirección española
   - Teléfono: +34 600 000 000
2. Para la cuenta bancaria de prueba: usar IBAN `ES9121000418450200051332` o el que Stripe sugiera
3. Stripe redirige a `${SITE_URL}/?onboarding=complete`

> Si Stripe pide información adicional o la cuenta queda en estado "restricted", igualmente proceder al paso 6.

### Paso 6: Llamar refresh-driver-onboarding-link

1. Volver a la pestaña de la app
2. Pulsar "Actualizar estado"
3. En DevTools: request a `functions/v1/refresh-driver-onboarding-link`
   - Body: `{ "driver_id": "<uuid>" }`
   - Respuesta esperada: `{ "stripe_status": "active", "charges_enabled": true, "payouts_enabled": true }`
4. El badge debe cambiar a verde "Activa ✓"

**Si `stripe_status` no es `'active'`:** la cuenta Stripe aún tiene requirements pendientes. Verificar en Stripe Dashboard → Connect → Accounts → la cuenta → "Requirements". Puede requerir más información.

### Paso 7: Llamar generate-tip-link

1. Pulsar "Generar QR"
2. En DevTools: request a `functions/v1/generate-tip-link`
   - Body: `{ "driver_id": "<uuid>" }`
   - Respuesta: `{ "tip_link_slug": "...", "public_url": "...", "qr_url": "..." }`
3. El QR debe aparecer en la tarjeta del conductor

### Paso 8: Llamar create-driver-payment-link (Test 1€)

1. Pulsar "Test 1€"
2. En DevTools: request a `functions/v1/create-driver-payment-link`
   - **Sin** header `Authorization` (endpoint público)
   - Body: `{ "slug": "...", "amount": 1, "currency": "eur" }`
   - Respuesta: `{ "session_url": "https://checkout.stripe.com/..." }`
3. Completar el pago con `4242 4242 4242 4242`, `12/30`, `123`

### Paso 9: Verificar en Stripe Dashboard

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/test/payments) → Test mode
2. Verificar el pago de 1,00 €:
   - Estado: `succeeded`
   - Metadata: "Propina para [nombre conductor]"
   - `Transfer`: la cantidad va a la cuenta Connect del conductor
3. Verificar la cuenta Connect del conductor:
   - Connect → Accounts → ver la cuenta `acct_...`
   - Debe tener `charges_enabled: true`

---

## Verificación de seguridad: DevTools

### Inspección de requests

Buscar en DevTools → Network cualquier request que contenga estos strings en el cuerpo o headers. **Ninguno debe aparecer:**

```
sk_test_
sk_live_
pk_live_
service_role
STRIPE_WEBHOOK_SECRET
stripe_account_id  (en responses visibles al frontend)
```

### Verificar que la vista pública es segura

Abrir el Supabase SQL Editor o usar la API pública:

```bash
# Llamada pública (sin auth): debe devolver solo campos seguros
curl "https://uwnaioghebzrnbsxbouu.supabase.co/rest/v1/public_driver_profiles" \
  -H "apikey: sb_publishable_QSaYDWLGVFM1iTUr5DwqxA_ycnwcCLQ"

# Verificar que la respuesta NO contiene:
# - stripe_account_id
# - driver_id
# - stripe_status
# - payouts_enabled / charges_enabled
```

---

## Problemas conocidos y soluciones

| Problema | Causa probable | Solución |
|---|---|---|
| "Perfil de conductor no encontrado" (404) | `ADMIN_EMAIL` no configurado en Secrets; la función usa `user.id` del admin en lugar del conductor | Configurar `ADMIN_EMAIL` en Supabase Secrets |
| "STRIPE_SECRET_KEY inválida" (500) | Secret `STRIPE_SECRET_KEY` vacío o no es `sk_test_` | Verificar y reconfigurar el Secret |
| Badge no cambia a verde tras refresh | Onboarding incompleto en Stripe; la cuenta tiene requirements pendientes | Completar requirements en Stripe Dashboard → Connect → Accounts |
| "Este conductor aún no puede recibir pagos" (400) | `charges_enabled = false` | Completar onboarding y hacer refresh |
| "Conductor no encontrado" (404) en pago | `tip_link_slug` no existe o no coincide con ningún perfil activo | Generar QR primero para crear el slug |
| Conductores MOCK aparecen en "Dar propina" | `public_driver_profiles` vacía o Supabase no accesible | Insertar datos en `driver_payment_profiles` con `is_active = true, is_visible = true` |
| Panel admin vacío | Sin filas en `driver_payment_profiles` o error de RLS | Verificar seed data; verificar que el usuario tiene el email de admin correcto |

---

## Queries SQL de verificación final

```sql
-- Estado completo del conductor de prueba
select
  display_name,
  stripe_status,
  charges_enabled,
  payouts_enabled,
  tip_link_slug,
  public_url,
  is_active,
  is_visible,
  updated_at
from public.driver_payment_profiles
where display_name ilike '%test%' or is_active = true
order by updated_at desc;

-- Vista pública: verificar campos expuestos
select column_name
from information_schema.columns
where table_name = 'public_driver_profiles'
  and table_schema = 'public';
-- Esperado: id, display_name, vehicle_info, route_info, tip_link_slug, public_url, is_active, is_visible
-- NO debe aparecer: stripe_account_id, driver_id, stripe_status, payouts_enabled, charges_enabled

-- Verificar que guard_stripe_fields trigger está activo
select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where event_object_table = 'driver_payment_profiles';
-- Debe aparecer: guard_stripe_fields_trigger
```

---

## Checklist de cierre del sprint

Al terminar las pruebas E2E, confirmar en `docs/sprint-2E/checklist-e2e.md`:
- Todos los pasos completados sin errores críticos.
- Verificaciones de DB y Stripe Dashboard confirmadas.
- Verificación de seguridad completada.
- Problemas encontrados documentados con pasos de reproducción.
- Decisión: aprobado para Sprint 2F o pendiente de correcciones.
