import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, stripe_account_id, display_name')
      .eq('driver_id', user.id)
      .single();

    if (profileError || !profile) return errorResponse(req, 404, 'Perfil de conductor no encontrado');

    let stripeAccountId: string = profile.stripe_account_id;

    if (!stripeAccountId) {
      // Idempotency key basada en user.id: Stripe devuelve la misma cuenta
      // en reintentos dentro de 24h, evitando cuentas duplicadas si el
      // DB update falla en un intento previo.
      const account = await stripe.accounts.create(
        { type: 'express', country: 'ES', metadata: { supabase_user_id: user.id } },
        { idempotencyKey: `create-connect-account-${user.id}` },
      );
      stripeAccountId = account.id;

      const { error: updateError } = await supabaseAdmin
        .from('driver_payment_profiles')
        .update({ stripe_account_id: stripeAccountId, stripe_status: 'pending' })
        .eq('driver_id', user.id);

      if (updateError) {
        // La cuenta existe en Stripe aunque no se haya guardado en DB.
        // Se loguea para investigación pero no se bloquea al conductor:
        // el próximo intento recuperará la misma cuenta via idempotency key
        // y reintentará el update.
        console.error('[create-driver-connect-account] DB update failed:', updateError.message);
      }
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${siteUrl}/?onboarding=refresh`,
      return_url: `${siteUrl}/?onboarding=complete`,
      type: 'account_onboarding',
    });

    return okResponse(req, { onboarding_url: accountLink.url });
  } catch (err) {
    console.error('[create-driver-connect-account]', err);
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
