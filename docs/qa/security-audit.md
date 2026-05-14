# Auditoría de Seguridad — Tips La Liga

**Fecha:** 2026-05-14
**Método:** análisis estático de código fuente, `supabase.sql` y Edge Functions
**Alcance:** `app.js`, `index.html`, `supabase.sql`, `supabase/functions/**`, `.gitignore`, historial de git
**Entorno:** sin ejecutar datos reales, sin peticiones a producción

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | Sin claves secretas en frontend | Lectura `app.js` + grep `sk_\|pk_live_\|service_role\|paypal.*secret\|DATABASE_URL` en `*.js`, `*.html` |
| 2 | Sin `service_role` key en el repo | `git grep sk_test_\|sk_live_\|service_role` — análisis de todos los archivos commiteados |
| 3 | `public_driver_profiles` no expone campos sensibles | Lectura SELECT list en `supabase.sql` (Sprint 2B y Sprint 3A) |
| 4 | RLS impide editar perfiles ajenos | Lectura políticas `dpp_conductor_*` + función `guard_stripe_fields` en `supabase.sql` |
| 5 | Botón "Conductores" solo para admin | Lectura `onAuthStateChanged()` + `isAdmin()` en `app.js` |
| 6 | Conductor solo edita su propio "Mi enlace" | Lectura `loadDriverSelfProfile()`, `showDriverSelfSection()`, `saveDriverSelfProfile()` |
| 7 | PayPal solo acepta paypal.me / paypal.com | Lectura `isValidPaymentUrl()` + `VALID_PAYPAL_DOMAINS` + constraint `payment_url_provider_match` |
| 8 | Constraint `payment_url_provider_match` existe | Lectura bloque `DO $$ ... $$` en `supabase.sql` Sprint 3A |
| 9 | Sin XSS en campos visibles | Análisis de todos los `innerHTML` + revisión `escapeHtml()` |
| 10 | Logout/login no deja secciones privadas visibles | Lectura `onAuthStateChanged()` — limpieza de estado y secciones |
| 11 | Git sin archivos temporales o secrets | Lectura `.gitignore` + `git log` + `git ls-files --others` |
| 12 | Edge Functions Stripe aparcadas sin exponer secretos | Lectura `stripe.ts`, `supabase.ts`, `stripe-webhook`, `create-driver-payment-link` |

---

## Hallazgos por check

### [1] Claves secretas en frontend

**`app.js` contiene:**
```javascript
const SUPABASE_URL  = "https://uwnaioghebzrnbsxbouu.supabase.co";  // URL pública
const SUPABASE_ANON_KEY = "sb_publishable_...";                     // anon key (pública por diseño)
const ADMIN_EMAIL   = "lluis15basket@hotmail.es";                   // email hardcodeado
```

- `SUPABASE_URL` y `SUPABASE_ANON_KEY` son credenciales públicas — correcto para GitHub Pages + Supabase. La seguridad real recae en RLS. ✅
- `ADMIN_EMAIL` no es una clave secreta, pero su presencia en el código fuente público revela el email del administrador. → **Ver HALLAZGO-01.**
- Grep de `sk_|pk_live_|service_role|paypal.*secret|DATABASE_URL` en archivos frontend: **0 coincidencias.** ✅

---

### [2] service_role key en el repo

`git grep` encuentra referencias en:
- Archivos de documentación (`.md`) — solo como texto explicativo, sin valores reales ✅
- `supabase/functions/_shared/supabase.ts`: `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — lee de variable de entorno, no hardcodeada ✅
- `supabase/functions/_shared/stripe.ts`: `Deno.env.get('STRIPE_SECRET_KEY')` — ídem ✅

Ningún archivo commiteado contiene una clave con valor real. ✅

---

### [3] `public_driver_profiles` — campos expuestos

La vista activa (Sprint 3A, `supabase.sql` líneas 363–380):

```sql
select id, display_name, vehicle_info, route_info,
       tip_link_slug, public_url, is_active, is_visible,
       payment_provider, payment_url, payment_instructions
from public.driver_payment_profiles
where is_active = true and is_visible = true;
```

**Nunca expuestos:** `driver_id`, `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`, `created_at`, `updated_at`. ✅

`payment_url` es intencional: es una URL pública de PayPal.me, necesaria para que el cliente realice el pago. ✅

`security_invoker = false` — la vista corre como su owner (postgres), bypassando RLS en la tabla. El filtro `WHERE` y la lista de columnas son la barrera de seguridad. ✅

---

### [4] RLS — edición de perfiles ajenos

**Políticas activas:**

| Política | Op | Condición |
|---|---|---|
| `dpp_conductor_update_own` | UPDATE | `driver_id = auth.uid()` (using + with check) |
| `dpp_conductor_read_own` | SELECT | `driver_id = auth.uid()` |
| `dpp_admin_update_all` | UPDATE | `public.is_admin()` |

**Trigger `guard_stripe_fields`:**
Bloquea cambios en `stripe_account_id`, `stripe_status`, `payouts_enabled`, `charges_enabled`, `is_active` para cualquier usuario que no sea `postgres`, `service_role` o admin. Aplica BEFORE UPDATE, enforced a nivel de base de datos. ✅

**Frontend (`saveDriverSelfProfile()`):**
`.eq("driver_id", currentUser.id)` — barrera de frontend alineada con RLS. Un usuario no puede siquiera construir un UPDATE dirigido a otro `driver_id` válido. ✅

El UPDATE del autoservicio solo incluye `payment_provider`, `payment_url`, `payment_instructions`, `is_visible` — los cuatro permitidos por el trigger. ✅

---

### [5] Botón "Conductores" — visibilidad por admin

```javascript
// index.html:
<button id="adminBtn" class="btn ghost admin-btn hidden">  // nace hidden

// app.js — onAuthStateChanged():
if (isAdmin()) els.adminBtn.classList.remove("hidden");    // única instrucción que lo muestra

function isAdmin() {
  return currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
```

No existe ningún otro punto en el código donde `adminBtn` se muestre. En logout: `els.adminBtn.classList.add("hidden")`. ✅

---

### [6] "Mi enlace" — aislamiento por conductor

Tres capas de verificación:

1. **`loadDriverSelfProfile()`:** `.eq("driver_id", currentUser.id)` — solo carga la fila propia
2. **Guardas de función:** `if (!currentUser) return` al inicio de `showDriverSelfSection()` y `saveDriverSelfProfile()`
3. **RLS `dpp_conductor_update_own`:** bloquea cualquier UPDATE donde `driver_id ≠ auth.uid()`, independientemente del frontend

El UPDATE nunca incluye `display_name` ni campos Stripe. ✅

---

### [7] Validación dominio PayPal

**Capa 1 — frontend (`isValidPaymentUrl()`):**
```javascript
const VALID_PAYPAL_DOMAINS = [
  "https://paypal.me/", "https://www.paypal.me/",
  "https://paypal.com/", "https://www.paypal.com/",
];
```
Aplica en tiempo real (UI) y en `saveEditDriver()` / `saveDriverSelfProfile()` antes del UPDATE. ✅

**Capa 2 — DB constraint (`payment_url_provider_match`):**
```sql
check (
  payment_provider is null or payment_provider <> 'paypal'
  or payment_url is null
  or payment_url like 'https://paypal.me/%'  ...
)
```
Casos límite cubiertos: `http://paypal.me/` (sin https) bloqueado, `https://paypal.me` (sin barra) bloqueado. ✅

---

### [8] Constraint `payment_url_provider_match` en DB

Presente en `supabase.sql` dentro de un bloque `DO $$ ... $$` idempotente (comprueba `pg_constraint` antes de añadir). → **Ver HALLAZGO-03.**

---

### [9] XSS — campos en el DOM

**`escapeHtml()` escapa:** `&`, `<`, `>`, `"` → `&quot;`, `'` → `&#039;`. Cubre los vectores clásicos de HTML injection. ✅

**Campos de DB renderizados via `innerHTML` — todos escapados:**

| Campo | Uso | Escapado |
|---|---|---|
| `display_name` | `innerHTML`, atributos data-* | `escapeHtml()` ✅ |
| `vehicle_info`, `route_info` | `innerHTML` | `escapeHtml()` ✅ |
| `payment_provider` | clase CSS + `innerHTML` | `escapeHtml()` ✅ |
| `payment_url` | atributo `href` + `value` + `innerHTML` | `escapeHtml()` ✅ |
| `payment_instructions` | `innerHTML`, `textContent` | `escapeHtml()` / `textContent` ✅ |
| `tip.comment` | `innerHTML` | `escapeHtml()` ✅ |
| `driver_id`, `tip_link_slug` | atributos data-* | `escapeHtml()` ✅ |

**Campos renderizados via `textContent` (seguro por diseño):**
`payDriverName`, `payDriverBio`, `payment_instructions` en "Dar propina", badges de proveedor, texto del botón de pago. ✅

`payment_url` en `href` del panel admin: `escapeHtml()` previene injection de atributos. Sin embargo, una URL `javascript:alert(1)` no es bloqueada por `escapeHtml`. → **Ver HALLAZGO-02.** (mitigado en la práctica: solo admin configura `public_url`; `payment_url` debe empezar por `https://paypal` — validado en ambas capas).

---

### [10] Logout/login — limpieza de estado

`onAuthStateChanged()` al inicio de cada llamada:
```javascript
els.tipDriverSection.classList.add("hidden");
els.adminDriversSection.classList.add("hidden");
els.driverSelfSection.classList.add("hidden");
currentUser = session?.user || null;
```

En logout: `currentProfile = null`, `allTips = []`, `adminDrivers = []`, `driverSelfProfile = null`, `adminBtn` y `driverLinkBtn` ocultos, `appSection` oculto, `authSection` visible. ✅

No existe ninguna sección que pueda quedar visible tras el logout. ✅

---

### [11] Git — archivos temporales y secrets

**`.gitignore` cubre:**
```
supabase/.temp/
.env
.env.local
supabase/.env
supabase/functions/.env
```
✅

**Archivos sin trackear en el working tree:** solo `.claude/settings.json` (directorio de memoria de Claude Code). No commiteable, sin secrets. ✅

**Historial de commits:** ningún commit introduce archivos `.env` o con claves reales. ✅

---

### [12] Edge Functions Stripe — aparcadas

| Función | Estado | Secretos expuestos |
|---|---|---|
| `create-driver-connect-account` | Operativa, requiere JWT | No — detalles internos solo en `console.error` |
| `refresh-driver-onboarding-link` | Operativa, requiere JWT | No |
| `create-driver-payment-link` | Operativa, pública | `stripe_account_id` nunca devuelto al cliente ✅ |
| `stripe-webhook` | Placeholder (`{ received: true }`) | No |
| `_shared/stripe.ts` | `sk_test_` assertion activa | Bloquea live keys ✅ |
| `_shared/supabase.ts` | Lee `SUPABASE_SERVICE_ROLE_KEY` de env | No hardcodeado ✅ |

`stripe-webhook` no valida `Stripe-Signature` → **Ver HALLAZGO-04.** (sin impacto real porque no procesa nada).

---

## Hallazgos

### HALLAZGO-01 — `ADMIN_EMAIL` expuesto en código fuente del frontend
- **Severidad:** Informativa
- **Descripción:** `ADMIN_EMAIL = "lluis15basket@hotmail.es"` está hardcodeado en `app.js`, visible para cualquiera que inspeccione el código fuente de la página.
- **Impacto real:** No permite obtener acceso admin (se requieren credenciales de Supabase Auth). Expone el email del administrador, lo que puede ser un vector de phishing o spam.
- **Recomendación:** A largo plazo, sustituir la lógica de admin por un campo `is_admin` en la tabla `profiles` o un custom claim en el JWT de Supabase. En el alcance actual (proyecto personal, fuente pública en GitHub) el riesgo es aceptable.

---

### HALLAZGO-02 — `javascript:` URLs no bloqueadas en `href` del panel admin
- **Severidad:** Muy baja
- **Descripción:** El campo `public_url` se renderiza como `<a href="...">` en el panel admin. `escapeHtml()` previene HTML injection pero no filtra esquemas `javascript:`. Si un admin configurara `public_url = "javascript:alert(1)"`, se ejecutaría al hacer clic.
- **Impacto real:** Ninguno en la práctica. `public_url` es generado por la Edge Function `generate-tip-link` (URL de Supabase), no es editable directamente desde el frontend. Solo un actor con acceso directo a la DB podría insertar un valor `javascript:`.
- **Recomendación:** Añadir `rel="noopener noreferrer"` (ya presente) y opcionalmente validar que `public_url` empiece por `https://` antes de renderizarlo como href.

---

### HALLAZGO-03 — `payment_url_provider_match` solo verificable en DB activa — **RESUELTO**
- **Severidad:** Informativa
- **Descripción:** El constraint existe en `supabase.sql` dentro de un `DO $$ ... $$` idempotente, pero solo está activo en la base de datos si ese bloque fue ejecutado en el SQL Editor de Supabase tras Sprint 3A.
- **Verificación manual (2026-05-14):** Confirmado en Supabase — `payment_url_provider_match` existe sobre `driver_payment_profiles` y bloquea URLs no PayPal cuando `payment_provider = 'paypal'`. La segunda capa de validación está activa en producción. ✅

---

### HALLAZGO-04 — `stripe-webhook` no valida firma Stripe
- **Severidad:** Informativa (sin impacto actual)
- **Descripción:** El endpoint `stripe-webhook` es un placeholder que responde `{ received: true }` a cualquier POST sin verificar el header `Stripe-Signature`. Cualquier cliente puede hacer POST y recibir 200.
- **Impacto real:** Ninguno actualmente — el webhook no procesa ni almacena datos.
- **Recomendación:** Cuando se implemente el webhook completo, añadir `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` como primera acción. Documentado en el propio archivo.

---

## Resumen de riesgos

| # | Hallazgo | Severidad | Acción |
|---|---|---|---|
| 01 | `ADMIN_EMAIL` en fuente pública | Informativa | Aceptar en alcance actual; revisar al escalar |
| 02 | `javascript:` URLs en `href` de admin | Muy baja | `public_url` no editable desde frontend |
| 03 | Constraint DB no verificable estáticamente | Informativa | **Verificado manualmente — activo en producción ✅** |
| 04 | `stripe-webhook` sin validación de firma | Informativa | Sin impacto hasta implementar el webhook real |

**Sin hallazgos de severidad media, alta o crítica.**

---

## Decisión final

**APROBADO ✅**

El proyecto no expone claves secretas en el frontend. La seguridad real recae en las políticas RLS de Supabase (`dpp_conductor_update_own`, `guard_stripe_fields`), que protegen la base de datos independientemente del código frontend. La validación PayPal tiene dos capas (frontend + DB constraint). El botón de admin y el autoservicio de conductores están correctamente controlados por `isAdmin()` y `driver_id = auth.uid()`. El historial de git no contiene archivos sensibles.

Los cuatro hallazgos son informativos o de muy baja severidad, sin riesgo operativo inmediato para el alcance actual del proyecto.
