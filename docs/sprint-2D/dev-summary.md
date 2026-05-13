# Sprint 2D Dev Summary

## Qué se implementó
Panel admin visual para gestionar perfiles de pago de conductores, integración de las 4 Edge Functions de Sprint 2C en el frontend, reemplazo de `MOCK_DRIVERS` por datos reales de Supabase, y QR/pago test real via Stripe Checkout.

---

## Archivos modificados

### `supabase/functions/create-driver-connect-account/index.ts`
**Cambio:** soporte para que el admin llame la función en nombre de cualquier conductor.
- Lee `driver_id` del body del request.
- Compara el email del JWT con `ADMIN_EMAIL` env var para verificar admin.
- Si el usuario es admin y hay `driver_id` en el body, usa ese `driver_id` en lugar del propio.
- Si es conductor, sigue usando `user.id` como antes.

### `supabase/functions/refresh-driver-onboarding-link/index.ts`
**Cambio:** misma modificación — `driver_id` opcional para admin.

### `supabase/functions/generate-tip-link/index.ts` (nuevo)
**Función nueva** pendiente de Sprint 2C. Genera o reutiliza `tip_link_slug` y `public_url`. Acepta `driver_id` en body para que admin la llame en nombre de cualquier conductor. Persiste en DB via `service_role`.

### `index.html`
- Añadido `<button id="adminBtn">` en `topbar-right` (oculto por defecto).
- Añadida `<section id="adminDriversSection">` con `#driverProfilesList`.
- Añadido `<dialog id="editDriverDialog">` para editar perfiles de conductor inline.

### `style.css`
Nuevo bloque "Sprint 2D" al final:
- `.admin-btn`, `.admin-section-header`
- `.driver-profiles-list`, `.driver-profile-card`, `.driver-profile-header`
- `.stripe-badge` con 4 variantes: `not_connected` (gris), `pending` (amarillo), `restricted` (naranja), `active` (verde)
- `.driver-stripe-flags`, `.flag-ok`, `.flag-no`
- `.driver-actions`, `.driver-qr-box`
- `.checkbox-label` para el toggle de visibilidad
- `@media (max-width: 800px)` para `.driver-profile-header`

### `app.js`
Variables y constantes añadidas:
- `FUNCTIONS_URL = ${SUPABASE_URL}/functions/v1`
- `adminDrivers = []`
- 12 nuevas referencias en `els`

Funciones nuevas:
| Función | Propósito |
|---|---|
| `callEdgeFunction(name, body, requiresAuth)` | Helper para llamar Edge Functions con/sin JWT |
| `loadPublicDrivers()` | Lee `public_driver_profiles` con fallback a `MOCK_DRIVERS` |
| `loadDriverProfiles()` | Lee `driver_payment_profiles` completo para admin |
| `stripeStatusLabel(status)` | Traduce `stripe_status` a texto |
| `renderDriverProfiles()` | Renderiza tarjetas de conductor en el panel admin |
| `adminOnboarding(driverId)` | Llama `create-driver-connect-account` con el driver_id |
| `adminRefresh(driverId)` | Llama `refresh-driver-onboarding-link` y recarga la UI |
| `adminGenerateTipLink(driverId)` | Llama `generate-tip-link` y recarga la UI |
| `adminTestPay(slug)` | Llama `create-driver-payment-link` con 1€ y abre Stripe |
| `openEditDriverDialog(dataset)` | Abre el dialog de edición con datos del conductor |
| `saveEditDriver(event)` | Guarda cambios de display_name, vehicle, route, is_visible |
| `showAdminSection()` | Muestra panel admin, oculta app/tip/auth |
| `hideAdminSection()` | Vuelve a appSection |

Funciones modificadas:
- **`renderDriverList()`** — ahora `async`. Llama `loadPublicDrivers()` con fallback a `MOCK_DRIVERS`. Los conductores reales de Supabase se muestran con su `public_url`/`tip_link_slug` real.
- **`showDriverPayView(driver)`** — usa `driver.public_url` para el QR si existe; actualiza el aviso demo dinámicamente según si el conductor tiene slug real.
- **`handleTipPayment()`** — ahora `async`. Si el conductor tiene `tip_link_slug`, llama `create-driver-payment-link` y abre Stripe Checkout en nueva pestaña. Fallback a simulación si no tiene slug.
- **`onAuthStateChanged()`** — muestra `adminBtn` al admin tras login; oculta el botón y limpia `adminDrivers` al logout.
- **`showTipSection()`** — también oculta `adminDriversSection` al entrar en "Dar propina".

---

## Nuevas variables de entorno necesarias

| Variable | Fuente | Uso |
|---|---|---|
| `ADMIN_EMAIL` | Supabase Secrets (manual) | Edge Functions identifican admin por email |

Configurar:
```bash
supabase secrets set ADMIN_EMAIL=lluis15basket@hotmail.es
```

---

## Seguridad

- `stripe_account_id` nunca seleccionado ni mostrado en la UI.
- El panel admin solo aparece si `isAdmin()` retorna `true` (verificación por email en JWT).
- Las Edge Functions verifican su propia autorización server-side.
- Sin claves secretas en `app.js`, `index.html` ni `style.css`.
- La edición de perfiles desde frontend solo toca `display_name`, `vehicle_info`, `route_info`, `is_visible` — el trigger `guard_stripe_fields` protege los campos Stripe.

---

## Limitaciones / pendiente Sprint 2E
- No se puede crear un perfil de conductor desde el frontend (requiere RLS `dpp_admin_insert_all` o Edge Function). Los perfiles se crean via SQL Editor o seed data.
- El webhook de Stripe sigue siendo placeholder — los pagos no se registran en `external_tip_payments`.
- El panel de conductor autónomo (el conductor gestiona su propio perfil) queda para Sprint 2E.
- `MOCK_DRIVERS` se mantiene como fallback si `public_driver_profiles` está vacía o Supabase no accesible.

## Corrección post-QA: BUG-01 (2026-05-13)

**Problema:** `callEdgeFunction()` usaba `fetch()` crudo con extracción manual del token JWT via `client.auth.getSession()`. Si el token expiraba entre operaciones, la petición fallaba con 401 hasta el siguiente refresco automático del SDK.

**Fix:** Para `requiresAuth = true`, reemplazado por `client.functions.invoke(name, { body })`. El SDK gestiona el token internamente, incluyendo refresco automático antes de cada llamada.

```javascript
// Antes:
const { data: { session } } = await client.auth.getSession();
headers["Authorization"] = `Bearer ${session.access_token}`;
const res = await fetch(...);

// Después:
const { data, error } = await client.functions.invoke(name, { body });
```

Para `requiresAuth = false` (endpoint público `create-driver-payment-link`) se mantiene `fetch()` sin header de auth, porque `client.functions.invoke()` siempre inyecta el token de sesión activa si existe, lo que rompería la intención de una llamada anónima.

La interfaz de `callEdgeFunction(name, body, requiresAuth)` no ha cambiado. Los 5 callers existentes no se han modificado.

---

## Archivos NO modificados
- `supabase.sql` ✅
- `create-driver-payment-link/index.ts` ✅
- `stripe-webhook/index.ts` ✅
