# Sprint 2D Plan: Panel admin + integración frontend con Edge Functions

## Objetivo del sprint
Conectar el frontend con las Edge Functions de Sprint 2C y con `driver_payment_profiles` de Sprint 2B. El admin puede gestionar perfiles de conductores, iniciar onboarding de Stripe, generar links de pago de prueba y ver QR reales. Todo en modo test, sin dinero real.

## Contexto
- **Sprint 2B:** tabla `driver_payment_profiles` con RLS y trigger `guard_stripe_fields`.
- **Sprint 2C:** 4 Edge Functions desplegadas (`create-driver-connect-account`, `refresh-driver-onboarding-link`, `create-driver-payment-link`, `stripe-webhook` placeholder). Pendiente: `generate-tip-link`.
- **Sprint 2A:** pestaña "Dar propina" con `MOCK_DRIVERS` hardcodeados — se reemplazarán con datos reales.
- El admin se identifica por `ADMIN_EMAIL` ya definido en `app.js`.

## Alcance

### Incluye
- Nueva Edge Function `generate-tip-link` (pendiente de Sprint 2C).
- Panel admin visual para gestionar `driver_payment_profiles`.
- Actualización de la sección "Dar propina" para leer `public_driver_profiles` en lugar de `MOCK_DRIVERS`.
- Llamadas a las 4 Edge Functions desde `app.js`.
- Visualización de estado Stripe por conductor.
- QR real generado a partir de `public_url`.
- Modo test completo (Stripe test mode, sin dinero real).

### Excluye explícitamente
- Claves Stripe live.
- Webhook real (procesamiento de eventos de pago) — Sprint 2E.
- Panel de conductor autónomo (el conductor gestiona su propio perfil) — Sprint 2E.
- Registro de pagos en `external_tip_payments` — Sprint 2E.
- Cambios en `supabase.sql` (salvo que sea imprescindible).

---

## Nueva Edge Function: `generate-tip-link`

Pendiente de Sprint 2C. Debe implementarse en `supabase/functions/generate-tip-link/index.ts`.

**Auth:** JWT requerido (conductor o admin).

**Lógica:**
1. Obtener `display_name` y `tip_link_slug` actuales del conductor via `service_role`.
2. Si `tip_link_slug` ya existe: usar el existente.
3. Si no: generar slug = slugify(`display_name`) + sufijo aleatorio (4 chars). Verificar unicidad.
4. Construir `public_url = ${SITE_URL}/tip/${slug}`.
5. Actualizar `driver_payment_profiles` con `tip_link_slug` y `public_url` via `service_role`.
6. Devolver `{ tip_link_slug, public_url, qr_url }`.

`qr_url = https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<public_url_encoded>`

---

## Panel admin: flujo visual

```
[Panel admin] (solo visible si isAdmin())
      ↓
Lista de conductores desde driver_payment_profiles
(display_name, stripe_status badge, charges_enabled, is_visible toggle)
      ↓
[+ Crear conductor] → formulario: display_name, vehicle_info, route_info
      ↓
Acciones por conductor:
  [Iniciar onboarding]   → create-driver-connect-account → abre onboarding_url
  [Actualizar estado]    → refresh-driver-onboarding-link → actualiza badge
  [Generar link/QR]     → generate-tip-link → muestra QR + public_url
  [Test: pagar 1€]       → create-driver-payment-link → abre session_url
  [Editar]               → formulario inline: display_name, vehicle_info, route_info, is_visible
```

### Badges de estado Stripe

| `stripe_status` | Color | Texto |
|---|---|---|
| `not_connected` | Gris | Sin conectar |
| `pending` | Amarillo | Onboarding pendiente |
| `restricted` | Naranja | Restringida |
| `active` | Verde | Activa ✓ |

---

## Actualización de "Dar propina"

Reemplazar `MOCK_DRIVERS` hardcodeados en `app.js` por lectura de `public_driver_profiles` (vista pública segura) vía Supabase client anon.

```javascript
const { data } = await client
  .from('public_driver_profiles')
  .select('id, display_name, vehicle_info, route_info, tip_link_slug, public_url')
  .order('display_name');
```

- La vista filtra `is_active = true AND is_visible = true` automáticamente.
- El QR de cada conductor usa su `public_url` real (o el placeholder si aún no tiene slug).
- El botón "Pagar" llama a `create-driver-payment-link` con el `tip_link_slug` real.

---

## Flujo de pago test completo (admin)

1. Admin crea perfil de conductor.
2. Admin pulsa "Iniciar onboarding" → se abre Stripe Express onboarding (test mode).
3. Admin completa el onboarding con datos de prueba de Stripe.
4. Admin pulsa "Actualizar estado" → `stripe_status` cambia a `'active'`, `charges_enabled = true`.
5. Admin pulsa "Generar link/QR" → aparece QR real y `public_url`.
6. Admin pulsa "Test: pagar 1€" → se abre Stripe Checkout (test) → pago con tarjeta `4242 4242 4242 4242`.
7. Stripe confirma pago (test) → redirige a `success_url`.

---

## Criterios de aceptación

- [ ] Panel admin visible solo para usuarios con `ADMIN_EMAIL`.
- [ ] Lista de conductores cargada desde `driver_payment_profiles` vía Supabase.
- [ ] Admin puede crear un nuevo perfil de conductor.
- [ ] Admin puede editar `display_name`, `vehicle_info`, `route_info`, `is_visible`.
- [ ] `create-driver-connect-account` devuelve `onboarding_url` y se abre.
- [ ] `refresh-driver-onboarding-link` actualiza `stripe_status` en UI.
- [ ] `generate-tip-link` genera slug y QR; se muestran en el panel.
- [ ] `create-driver-payment-link` devuelve `session_url` que abre Stripe Checkout test.
- [ ] "Dar propina" lee conductores reales de `public_driver_profiles`.
- [ ] Sin claves secretas en `app.js`, `index.html` ni `style.css`.
- [ ] Sin dinero real movido (todo test mode).
- [ ] Funcionalidad existente (login, propinas, rankings) sin regresiones.

---

## Archivos a modificar

| Archivo | Qué cambia |
|---|---|
| `app.js` | Panel admin + llamadas Edge Functions + reemplazar MOCK_DRIVERS |
| `index.html` | Sección HTML del panel admin |
| `style.css` | Estilos del panel admin (badges, tabla conductores) |
| `supabase/functions/generate-tip-link/index.ts` | Nueva Edge Function |

## Archivos a NO modificar
- `supabase.sql`
- Funciones Edge ya existentes (salvo bug crítico)

## Siguiente paso (Sprint 2E)
- Panel de conductor autónomo (el propio conductor gestiona su perfil).
- Webhook real con `STRIPE_WEBHOOK_SECRET` y registro en `external_tip_payments`.
- Historial de pagos por conductor.
