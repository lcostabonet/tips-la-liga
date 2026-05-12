# Sprint 2C Handoff Dev: Edge Functions Stripe Connect

## Contexto
Sprint 2B creó la tabla `driver_payment_profiles` con RLS y el trigger `guard_stripe_fields` que permite actualizaciones de campos Stripe solo a `service_role` y admin. Sprint 2C implementa las Edge Functions en TypeScript/Deno que usan ese `service_role`.

## Setup inicial

### Prerequisitos
```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Inicializar proyecto Supabase local (si no existe)
supabase init

# Login
supabase login
```

### Estructura de directorios a crear
```
supabase/
  functions/
    _shared/
      stripe.ts          # instancia compartida de Stripe
      supabase.ts        # cliente service_role compartido
      cors.ts            # headers CORS compartidos
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

## Módulos compartidos (`supabase/functions/_shared/`)

### `cors.ts`
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### `stripe.ts`
```typescript
import Stripe from 'https://esm.sh/stripe@14?target=deno';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});
```

### `supabase.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
```

---

## 1. `create-stripe-account/index.ts`

```typescript
import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Autenticar al usuario por JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return error(401, 'No autorizado');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return error(401, 'Token inválido');

    // Obtener perfil de pago del conductor (service_role para leer stripe_account_id)
    const { data: profile } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, stripe_account_id, stripe_status, display_name')
      .eq('driver_id', user.id)
      .single();

    if (!profile) return error(404, 'Perfil de conductor no encontrado');

    let stripeAccountId = profile.stripe_account_id;

    // Crear cuenta Stripe Connect si no existe
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        metadata: { supabase_user_id: user.id },
      });
      stripeAccountId = account.id;

      // Actualizar DB con service_role (el trigger guard_stripe_fields lo permite)
      await supabaseAdmin
        .from('driver_payment_profiles')
        .update({ stripe_account_id: stripeAccountId, stripe_status: 'pending' })
        .eq('driver_id', user.id);
    }

    // Generar enlace de onboarding (NO se persiste — expira)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${Deno.env.get('SITE_URL')}/onboarding-refresh`,
      return_url: `${Deno.env.get('SITE_URL')}/onboarding-complete`,
      type: 'account_onboarding',
    });

    return ok({ onboarding_url: accountLink.url });
  } catch (err) {
    return error(500, err.message);
  }
});

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## 2. `refresh-stripe-account/index.ts`

```typescript
// Mismos imports que arriba...

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // [auth igual que create-stripe-account]

    const { data: profile } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('stripe_account_id')
      .eq('driver_id', user.id)
      .single();

    if (!profile?.stripe_account_id) return error(400, 'Cuenta Stripe no iniciada');

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const stripeStatus =
      account.charges_enabled ? 'active' :
      account.requirements?.disabled_reason ? 'restricted' : 'pending';

    await supabaseAdmin
      .from('driver_payment_profiles')
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        stripe_status: stripeStatus,
      })
      .eq('driver_id', user.id);

    return ok({ stripe_status: stripeStatus, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled });
  } catch (err) {
    return error(500, err.message);
  }
});
```

---

## 3. `generate-tip-link/index.ts`

```typescript
// Mismos imports...

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // [auth igual que create-stripe-account]

    const { data: profile } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, tip_link_slug, display_name')
      .eq('driver_id', user.id)
      .single();

    if (!profile) return error(404, 'Perfil no encontrado');

    let slug = profile.tip_link_slug;

    if (!slug) {
      // Generar slug: slugify(display_name) + sufijo aleatorio
      const base = profile.display_name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const suffix = Math.random().toString(36).slice(2, 6);
      slug = `${base}-${suffix}`;
    }

    const siteUrl = Deno.env.get('SITE_URL')!;
    const publicUrl = `${siteUrl}/tip/${slug}`;

    await supabaseAdmin
      .from('driver_payment_profiles')
      .update({ tip_link_slug: slug, public_url: publicUrl })
      .eq('driver_id', user.id);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;

    return ok({ tip_link_slug: slug, public_url: publicUrl, qr_url: qrUrl });
  } catch (err) {
    return error(500, err.message);
  }
});
```

---

## 4. `create-payment-session/index.ts`

```typescript
// Mismos imports...

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { slug, amount, currency = 'eur' } = await req.json();
    if (!slug || !amount || amount < 0.5) return error(400, 'Parámetros inválidos');

    // Obtener perfil público del conductor por slug
    const { data: publicProfile } = await supabaseAdmin
      .from('public_driver_profiles')
      .select('id, display_name')
      .eq('tip_link_slug', slug)
      .single();

    if (!publicProfile) return error(404, 'Conductor no encontrado');

    // Obtener campos sensibles via service_role
    const { data: profile } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('stripe_account_id, charges_enabled')
      .eq('id', publicProfile.id)
      .single();

    if (!profile?.charges_enabled) {
      return error(400, 'Este conductor aún no puede recibir pagos.');
    }

    const siteUrl = Deno.env.get('SITE_URL')!;
    const amountCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: `Propina para ${publicProfile.display_name}` },
        },
        quantity: 1,
      }],
      mode: 'payment',
      transfer_data: { destination: profile.stripe_account_id },
      success_url: `${siteUrl}/tip/${slug}?payment=success`,
      cancel_url: `${siteUrl}/tip/${slug}?payment=cancel`,
    });

    return ok({ session_url: session.url });
  } catch (err) {
    return error(500, err.message);
  }
});
```

---

## Despliegue

```bash
# Desplegar una función
supabase functions deploy create-stripe-account --no-verify-jwt

# create-payment-session es pública (no requiere JWT)
supabase functions deploy create-payment-session --no-verify-jwt

# Las demás requieren JWT
supabase functions deploy refresh-stripe-account
supabase functions deploy generate-tip-link
```

> **Nota:** `--no-verify-jwt` deshabilita la verificación automática del JWT por parte de Supabase. Se usa en funciones que manejan su propia autenticación o son públicas. Para `create-stripe-account` y `refresh-stripe-account` se recomienda **quitar** `--no-verify-jwt` y dejar que Supabase valide el JWT automáticamente.

---

## Variables de entorno necesarias
Ver `docs/sprint-2C/secrets-plan.md` para configuración completa.

```bash
# Configurar secretos en Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set SITE_URL=https://lcostabonet.github.io/tips-la-liga
```

---

## Archivos a NO modificar
- `app.js`
- `index.html`
- `style.css`
- `supabase.sql` (a menos que sea una migración documentada)
