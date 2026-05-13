# QA Sign-off: Sprint 2E — Pruebas E2E de Stripe Connect (modo test)

**Fecha:** 2026-05-13
**Tipo de revisión:** Análisis estático de código + revisión documental
**Limitación importante:** Sprint 2E requiere prueba E2E en entorno real (browser + Stripe test account + Edge Functions desplegadas + Supabase con datos). Este sign-off documenta lo que se puede verificar estáticamente y lo que queda pendiente de validación en vivo.

---

## Pruebas realizadas

| # | Check | Método | Alcance |
|---|---|---|---|
| 1 | Panel admin visible para admin | Lectura `app.js` lógica `isAdmin()` + `adminBtn` | Estático |
| 2 | Lectura de perfiles existentes | Lectura `loadDriverProfiles()` + RLS `dpp_admin_read_all` | Estático |
| 3 | Crear/actualizar perfil | Lectura `saveEditDriver()` + RLS `dpp_admin_update_all` | Estático |
| 4 | Llamar `create-driver-connect-account` | Lectura `adminOnboarding()` + `callEdgeFunction()` | Estático |
| 5 | Stripe crea o reutiliza cuenta Connect test | Lectura Edge Function + idempotency key | Estático |
| 6 | Genera onboarding link test | Lectura Edge Function `stripe.accountLinks.create()` | Estático |
| 7 | `driver_payment_profiles` se actualiza | Lectura Edge Functions + trigger `guard_stripe_fields` | Estático |
| 8 | Llamar `refresh-driver-onboarding-link` | Lectura `adminRefresh()` | Estático |
| 9 | Llamar `create-driver-payment-link` | Lectura `adminTestPay()` + `handleTipPayment()` | Estático |
| 10 | Genera payment link test | Lectura Edge Function `stripe.checkout.sessions.create()` | Estático |
| 11 | QR/link en "Dar propina" | Lectura `loadPublicDrivers()` + `showDriverPayView()` | Estático |
| 12 | Vista pública no expone `stripe_account_id` | Lectura `supabase.sql` — SELECT list de la view | Estático ✅ |
| 13 | Sin claves secretas en frontend | Grep `sk_\|pk_live\|service_role\|STRIPE_SECRET` | Estático ✅ |
| 14 | Sin `sk_live_` | Grep `sk_live_` en frontend | Estático ✅ |
| 15 | Sin dinero real | Lectura `_shared/stripe.ts` assert `sk_test_` | Estático ✅ |
| 16 | Sin errores críticos en consola | Análisis estático de flujos JS | Estático (parcial) |

---

## Checks aprobados — verificación estática completa

**[12] Vista pública no expone `stripe_account_id`**
`supabase.sql` líneas 226–237: SELECT list de `public_driver_profiles` incluye exactamente `id, display_name, vehicle_info, route_info, tip_link_slug, public_url, is_active, is_visible`. Ni `stripe_account_id`, ni `driver_id`, ni `stripe_status`, ni `payouts_enabled`, ni `charges_enabled`. Filtro `WHERE is_active = true AND is_visible = true`. ✅ Verificado sin ambigüedad.

**[13] Sin claves secretas en frontend**
Grep `sk_|pk_live|service_role|STRIPE_SECRET` en `app.js` e `index.html`: **0 coincidencias**. Solo presentes `SUPABASE_ANON_KEY` (pública, prefijo `sb_publishable_`) y `ADMIN_EMAIL` (email, no clave secreta). ✅

**[14] Sin `sk_live_`**
Grep `sk_live_` en `app.js`, `index.html`, `style.css`: **0 coincidencias**. ✅

**[15] Sin dinero real**
`supabase/functions/_shared/stripe.ts` líneas 5–9: `if (!stripeKey.startsWith('sk_test_')) throw new Error(...)`. Todas las Edge Functions importan `stripe` desde este módulo. Si el Secret configura una clave live, la función lanza error en startup antes de cualquier llamada a Stripe. ✅ Enforced en código, no solo en documentación.

---

## Checks aprobados — análisis estático (pendiente confirmación E2E)

**[1] Admin puede abrir el panel de perfiles de pago**
`adminBtn` clase `hidden` por defecto en HTML. Solo se muestra en `onAuthStateChanged()` cuando `isAdmin()` es true. `showAdminSection()` solo accesible via `adminBtn`. Lógica correcta. ✅ Estático.

**[2] Admin puede ver perfiles existentes**
`loadDriverProfiles()` usa `client.from("driver_payment_profiles").select(...)` con 14 campos (sin `stripe_account_id`). Admin JWT activa `dpp_admin_read_all`. Resultado en `adminDrivers []` → `renderDriverProfiles()`. ✅ Estático. ⏳ Requiere datos en DB para confirmar en vivo.

**[3] Admin puede actualizar perfil de conductor**
`saveEditDriver()` actualiza `display_name`, `vehicle_info`, `route_info`, `is_visible` via `client.from("driver_payment_profiles").update(...)`. Política `dpp_admin_update_all` + trigger permite campos no-Stripe. Crear perfiles nuevos no disponible desde UI (limitación documentada). ✅ Estático (update). ⏳ Requiere DB en vivo.

**[4] Admin puede llamar a `create-driver-connect-account`**
`adminOnboarding(driverId)` → `callEdgeFunction("create-driver-connect-account", { driver_id: driverId })` → `client.functions.invoke()` con JWT de admin. ✅ Estático. ⏳ Requiere EF desplegada + Secrets.

**[5] EF crea o reutiliza cuenta Stripe Connect test**
Edge Function verifica `stripe_account_id` en DB. Si null: `stripe.accounts.create({ type: 'express', ... }, { idempotencyKey: 'create-connect-account-${targetDriverId}' })`. Si existe: reutiliza. Idempotencia garantizada dentro de 24h. ✅ Estático. ⏳ Requiere Stripe test account.

**[6] Se genera onboarding link test**
Edge Function llama `stripe.accountLinks.create(...)` y devuelve `{ onboarding_url }`. No se persiste. `window.open(result.onboarding_url, "_blank")` en frontend. ✅ Estático. ⏳ Requiere Stripe en vivo.

**[7] `driver_payment_profiles` se actualiza correctamente**
- `create-driver-connect-account`: actualiza `stripe_account_id` + `stripe_status = 'pending'` via `supabaseAdmin`.
- `refresh-driver-onboarding-link`: actualiza `charges_enabled`, `payouts_enabled`, `stripe_status` via `supabaseAdmin`.
- Trigger `guard_stripe_fields`: permite actualizaciones para `service_role`. ✅ Estático. ⏳ Requiere DB + Stripe en vivo.

**[8] Se puede llamar a `refresh-driver-onboarding-link`**
`adminRefresh(driverId)` → `callEdgeFunction("refresh-driver-onboarding-link", { driver_id: driverId })`. Tras la llamada: `loadDriverProfiles()` + `renderDriverProfiles()` actualiza la UI. ✅ Estático. ⏳ Requiere EF desplegada.

**[9] Se puede llamar a `create-driver-payment-link`**
`adminTestPay(slug)` y `handleTipPayment()` llaman `callEdgeFunction("create-driver-payment-link", {...}, false)` (sin auth, `fetch()`). ✅ Estático. ⏳ Requiere EF desplegada.

**[10] Se genera payment link test**
Edge Function valida slug en `public_driver_profiles`, obtiene `stripe_account_id` via `service_role`, llama `stripe.checkout.sessions.create()` con `transfer_data.destination`. Devuelve `{ session_url }`. ✅ Estático. ⏳ Requiere `charges_enabled = true` y Stripe en vivo.

**[11] QR/link test en "Dar propina"**
`loadPublicDrivers()` consulta `public_driver_profiles` con fallback a `MOCK_DRIVERS`. `showDriverPayView()` usa `driver.public_url` para el QR. `demoNoticeEl.textContent` cambia a "🧪 Modo test" cuando el conductor tiene slug. ✅ Estático. ⏳ Requiere datos reales en `public_driver_profiles`.

**[16] Sin errores críticos en consola (análisis estático)**
- Try/catch en todos los handlers admin.
- `escapeHtml()` en todo el contenido de usuario.
- `loadPublicDrivers()` con try/catch retorna `MOCK_DRIVERS` en cualquier error.
- `if (!client) return MOCK_DRIVERS` guard.
- ✅ Sin errores de código estáticos. ⏳ Requiere ejecución en browser para confirmar en runtime.

---

## Checks fallidos

Ninguno en análisis estático. Los checks 1–11 y 16 están pendientes de confirmación E2E en entorno real.

---

## Bugs encontrados

### BUG-01 — MOCK_DRIVERS con slugs causan error en "Dar propina" en modo fallback
- **Gravedad:** Baja
- **Afecta a:** Escenario de fallback (cuando `public_driver_profiles` está vacía o Supabase no accesible)
- **Descripción:** `MOCK_DRIVERS` contienen `slug: "marta-g"` etc. Al seleccionar un conductor mock y pulsar "Pagar", `handleTipPayment()` detecta el slug y llama a `create-driver-payment-link`. La Edge Function devuelve 404 "Conductor no encontrado" (el slug mock no existe en `public_driver_profiles`). El usuario ve un toast de error en lugar del flujo simulado anterior.
- **Impacto real:** Solo afecta al escenario de fallback sin datos reales en Supabase. Con datos reales en `public_driver_profiles`, este código path no se activa.
- **Recomendación:** En `MOCK_DRIVERS`, establecer `slug: null` para que `handleTipPayment()` siempre use la simulación para datos mock. Alternativamente, añadir un flag `isMock: true` y comprobar antes de llamar la Edge Function.

---

## Riesgos

### RIESGO-01 — `ADMIN_EMAIL` Secret no configurado (heredado de Sprint 2D)
- **Gravedad:** Media
- **Descripción:** Si `ADMIN_EMAIL` no está en Supabase Secrets, las Edge Functions no reconocerán al admin y usarán su propio `driver_id`. El panel admin no podrá gestionar perfiles de conductores.
- **Verificación:** Confirmar en Supabase Dashboard → Settings → Edge Functions → Secrets.

### RIESGO-02 — Edge Functions no desplegadas o con Secrets incorrectos
- **Gravedad:** Alta (bloquea prueba E2E)
- **Descripción:** Si alguna de las 5 Edge Functions no está desplegada, o `STRIPE_SECRET_KEY` es inválido, el flujo E2E falla en el primer paso. El assert `sk_test_` en `_shared/stripe.ts` dará un error claro: `"STRIPE_SECRET_KEY inválida"`.
- **Verificación previa:** `supabase functions list` y verificar todos los Secrets antes de iniciar la prueba.

### RIESGO-03 — Onboarding Stripe puede quedar en estado `restricted`
- **Gravedad:** Media (bloquea paso 6 y 7 del flujo)
- **Descripción:** En Stripe test mode, el onboarding Express puede requerir información adicional antes de activar `charges_enabled`. Si el onboarding no se completa correctamente, `refresh-driver-onboarding-link` devolverá `stripe_status: 'restricted'` y el botón "Test 1€" permanecerá desactivado.
- **Mitigación:** Documentado en `handoff-qa.md`: verificar requirements en Stripe Dashboard → Connect → Accounts.

### RIESGO-04 — Verificación de Stripe Dashboard requiere acceso humano
- **Gravedad:** Informativa
- **Descripción:** Los checks de `transfer_data.destination`, estado del pago y cuenta Connect en Stripe solo se pueden verificar con acceso al Stripe Dashboard test mode. No verificable estáticamente.

### RIESGO-05 — `public_driver_profiles` vacía activa MOCK_DRIVERS (BUG-01)
- **Gravedad:** Baja
- **Descripción:** Si no hay datos en `driver_payment_profiles` o todos tienen `is_active = false` / `is_visible = false`, la sección "Dar propina" usa MOCK_DRIVERS, que ahora intentan llamadas Edge Functions fallidas (ver BUG-01).

---

## Resumen de estado por tipo de verificación

| Tipo | Checks | Estado |
|---|---|---|
| **Estático completo** | 12, 13, 14, 15 | ✅ Aprobados sin reservas |
| **Estático parcial** | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16 | ✅ Código correcto, pendiente E2E |
| **Requiere entorno live** | 4–11, 16 | ⏳ Pendiente de prueba manual |
| **Fallidos** | Ninguno | — |

---

## Prerrequisitos para aprobar la prueba E2E en vivo

1. ✅ Leer y seguir `docs/sprint-2E/handoff-qa.md` paso a paso.
2. ✅ Configurar los 4 Secrets en Supabase antes de empezar.
3. ✅ Verificar con `supabase functions list` que las 5 funciones están desplegadas.
4. ✅ Tener al menos 1 fila en `driver_payment_profiles` con `driver_id` de un usuario real.
5. ✅ Tener acceso al Stripe Dashboard en modo test.
6. ✅ Corregir BUG-01 antes de la prueba si se usa el flujo de fallback.

---

## Decisión final

**APROBADO PARA PRUEBA E2E ✅ — pendiente validación en entorno real**

El análisis estático confirma que:
- El código del frontend no contiene claves secretas ni referencias a claves live.
- La vista pública `public_driver_profiles` excluye correctamente todos los campos sensibles de Stripe.
- El assert `sk_test_` en `_shared/stripe.ts` impide físicamente el uso de claves live.
- Todos los flujos de llamada a Edge Functions usan `client.functions.invoke()` (autenticadas) o `fetch()` sin auth (endpoint público) de forma correcta.
- La lógica de UI del panel admin es correcta según el análisis estático.

La validación definitiva requiere un tester humano con acceso al entorno desplegado. Se recomienda corregir BUG-01 antes de ejecutar la prueba E2E para evitar confusión en el escenario de fallback.
