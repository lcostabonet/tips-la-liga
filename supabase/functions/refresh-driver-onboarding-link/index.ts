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
      .select('stripe_account_id')
      .eq('driver_id', user.id)
      .single();

    if (profileError || !profile) return errorResponse(req, 404, 'Perfil de conductor no encontrado');
    if (!profile.stripe_account_id) {
      return errorResponse(req, 400, 'Cuenta Stripe no iniciada. Usa create-driver-connect-account primero.');
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const stripeStatus: string =
      account.charges_enabled ? 'active' :
      account.requirements?.disabled_reason ? 'restricted' : 'pending';

    const { error: updateError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        stripe_status: stripeStatus,
      })
      .eq('driver_id', user.id);

    if (updateError) {
      console.error('[refresh-driver-onboarding-link] DB update failed:', updateError.message);
      return errorResponse(req, 500, 'Error interno del servidor');
    }

    const result: Record<string, unknown> = {
      stripe_status: stripeStatus,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };

    if (!account.charges_enabled) {
      const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: `${siteUrl}/?onboarding=refresh`,
        return_url: `${siteUrl}/?onboarding=complete`,
        type: 'account_onboarding',
      });
      result.onboarding_url = accountLink.url;
    }

    return okResponse(req, result);
  } catch (err) {
    console.error('[refresh-driver-onboarding-link]', err);
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
