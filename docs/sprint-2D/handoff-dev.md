# Sprint 2D Handoff Dev: Panel admin + integración frontend

## Contexto
- Sprint 2B: tabla `driver_payment_profiles` con RLS (admin lee todo vía `dpp_admin_read_all`).
- Sprint 2C: Edge Functions en `supabase/functions/`. El frontend aún usa `MOCK_DRIVERS`.
- Sprint 2D: conectar todo. El admin gestiona conductores desde el navegador.

---

## 1. Nueva Edge Function: `generate-tip-link`

Crear `supabase/functions/generate-tip-link/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse(req, 401, 'No autorizado');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse(req, 401, 'Token inválido');

    // Admins pueden generar links para cualquier conductor (pasan driver_id en body)
    // Conductores generan su propio link (driver_id = user.id)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetDriverId: string = body.driver_id ?? user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, display_name, tip_link_slug')
      .eq('driver_id', targetDriverId)
      .single();

    if (profileError || !profile) return errorResponse(req, 404, 'Perfil no encontrado');

    let slug: string = profile.tip_link_slug;

    if (!slug) {
      const base = profile.display_name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const suffix = Math.random().toString(36).slice(2, 6);
      slug = `${base}-${suffix}`;
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
    const publicUrl = `${siteUrl}/tip/${slug}`;

    await supabaseAdmin
      .from('driver_payment_profiles')
      .update({ tip_link_slug: slug, public_url: publicUrl })
      .eq('driver_id', targetDriverId);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;

    return okResponse(req, { tip_link_slug: slug, public_url: publicUrl, qr_url: qrUrl });
  } catch (err) {
    console.error('[generate-tip-link]', err);
    return errorResponse(req, 500, 'Error interno del servidor');
  }
});

function okResponse(req: Request, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function errorResponse(req: Request, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
```

Desplegar:
```bash
supabase functions deploy generate-tip-link
```

---

## 2. Cómo llamar a las Edge Functions desde `app.js`

```javascript
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function callEdgeFunction(name, body = {}, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Sin sesión activa');
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}
```

Ejemplos de uso:
```javascript
// Iniciar onboarding de un conductor (el admin llama como si fuera el conductor)
const { onboarding_url } = await callEdgeFunction('create-driver-connect-account');
window.open(onboarding_url, '_blank');

// Actualizar estado
const status = await callEdgeFunction('refresh-driver-onboarding-link');
// { stripe_status, charges_enabled, payouts_enabled, onboarding_url? }

// Generar link/QR para un conductor específico (admin pasa driver_id)
const link = await callEdgeFunction('generate-tip-link', { driver_id: conductorId });
// { tip_link_slug, public_url, qr_url }

// Crear sesión de pago de prueba (público, sin auth)
const { session_url } = await callEdgeFunction(
  'create-driver-payment-link',
  { slug: 'marta-g-x7k2', amount: 1.00, currency: 'eur' },
  false  // sin auth
);
window.open(session_url, '_blank');
```

---

## 3. Leer `driver_payment_profiles` como admin

```javascript
async function loadDriverProfiles() {
  const { data, error } = await client
    .from('driver_payment_profiles')
    .select('id, driver_id, display_name, vehicle_info, route_info, stripe_status, charges_enabled, payouts_enabled, tip_link_slug, public_url, is_active, is_visible, updated_at')
    .order('display_name');
  if (error) throw error;
  return data; // RLS dpp_admin_read_all permite ver todos
}
```

**Nota:** nunca seleccionar `stripe_account_id` para mostrarlo en UI.

---

## 4. Reemplazar `MOCK_DRIVERS` en "Dar propina"

Sustituir el array `MOCK_DRIVERS` hardcodeado por:
```javascript
async function loadPublicDrivers() {
  const { data, error } = await client
    .from('public_driver_profiles')
    .select('id, display_name, vehicle_info, route_info, tip_link_slug, public_url')
    .order('display_name');
  if (error) return [];
  return data;
}
```

Llamar `loadPublicDrivers()` al entrar en la sección "Dar propina" y usar los resultados en `renderDriverList()`. Si un conductor no tiene `tip_link_slug`, mostrar un QR placeholder en su lugar.

---

## 5. Estructura HTML del panel admin

Añadir en `index.html` dentro de `#appSection` (solo renderizada si `isAdmin()`):

```html
<section id="adminDriversSection" class="hidden">
  <div class="section-title">
    <h2>🚌 Perfiles de pago de conductores</h2>
    <button id="createDriverBtn" class="btn primary" type="button">+ Nuevo conductor</button>
  </div>

  <!-- Formulario crear/editar conductor -->
  <div id="driverForm" class="card hidden">
    <h3 id="driverFormTitle">Nuevo conductor</h3>
    <form id="driverProfileForm" class="form compact">
      <input type="hidden" id="driverFormId" />
      <label for="driverDisplayName">Nombre público</label>
      <input id="driverDisplayName" type="text" required maxlength="60" />
      <label for="driverVehicleInfo">Vehículo</label>
      <input id="driverVehicleInfo" type="text" maxlength="80" placeholder="Ej. Bus 🚌" />
      <label for="driverRouteInfo">Ruta</label>
      <input id="driverRouteInfo" type="text" maxlength="80" placeholder="Ej. Ruta aeropuerto" />
      <div class="dialog-actions">
        <button id="cancelDriverFormBtn" class="btn ghost" type="button">Cancelar</button>
        <button class="btn primary" type="submit">Guardar</button>
      </div>
    </form>
  </div>

  <!-- Lista de conductores -->
  <div id="driverProfilesList" class="driver-profiles-list"></div>
</section>
```

Cada tarjeta de conductor (renderizada por JS):
```html
<div class="driver-profile-card">
  <div class="driver-profile-header">
    <strong>[display_name]</strong>
    <span class="stripe-badge stripe-[stripe_status]">[label]</span>
  </div>
  <p class="help">[vehicle_info] · [route_info]</p>
  <div class="driver-stripe-flags">
    <span class="flag [charges ? 'flag-ok' : 'flag-no']">Cobros: [sí/no]</span>
    <span class="flag [payouts ? 'flag-ok' : 'flag-no']">Pagos: [sí/no]</span>
  </div>
  <div class="driver-actions">
    <button data-action="onboarding" data-driver-id="[id]">Iniciar onboarding</button>
    <button data-action="refresh"    data-driver-id="[id]">Actualizar estado</button>
    <button data-action="tiplink"    data-driver-id="[id]">Generar link/QR</button>
    <button data-action="testpay"    data-driver-id="[id]" data-slug="[slug]">Test 1€</button>
    <button data-action="edit"       data-driver-id="[id]">Editar</button>
  </div>
  <!-- QR (visible solo si public_url existe) -->
  <div class="driver-qr-box hidden">
    <img src="[qr_url]" alt="QR de pago" width="180" height="180" />
    <a href="[public_url]" target="_blank">[public_url]</a>
  </div>
</div>
```

---

## 6. CSS necesario (`style.css`)

```css
.driver-profiles-list { display: grid; gap: 16px; }

.driver-profile-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.driver-profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stripe-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}
.stripe-not_connected { background: #f1f1f1; color: #555; }
.stripe-pending       { background: #fff4d2; color: #7a5200; }
.stripe-restricted    { background: #fff0e0; color: #a05000; }
.stripe-active        { background: #edfaf3; color: #177245; }

.driver-stripe-flags {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  font-size: 13px;
}
.flag-ok  { color: var(--success); font-weight: 700; }
.flag-no  { color: var(--muted); }

.driver-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.driver-qr-box {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.driver-qr-box a { font-size: 13px; color: var(--muted); word-break: break-all; }
```

---

## 7. Seguridad

- El panel admin solo se renderiza si `isAdmin()` es `true` (verificación por email del JWT, igual que el resto de la app).
- Las llamadas a Edge Functions que requieren auth incluyen el `access_token` de la sesión activa.
- `stripe_account_id` nunca se selecciona ni se muestra en UI.
- Las Edge Functions se encargan de la autorización real (verifican el JWT de Supabase).

## 8. Despliegue de la nueva Edge Function

```bash
supabase functions deploy generate-tip-link
```

Añadir `PUBLIC_SITE_URL` a Supabase Secrets si aún no está configurado:
```bash
supabase secrets set PUBLIC_SITE_URL=https://lcostabonet.github.io/tips-la-liga
```
