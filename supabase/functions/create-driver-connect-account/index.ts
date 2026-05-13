import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

  try {
    console.error('[STAGE_AUTH_JWT] start');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse(req, 401, 'No autorizado');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse(req, 401, 'Token inválido');
    console.error('[STAGE_AUTH_JWT] ok — user email domain:', user.email?.split('@')[1]);

    console.error('[STAGE_PARSE_BODY] start');
    const body = await req.json().catch(() => ({}));
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
    const isAdminUser = !!(adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase());
    const targetDriverId: string = (isAdminUser && body.driver_id) ? body.driver_id : user.id;
    console.error('[STAGE_PARSE_BODY] ok — isAdminUser:', isAdminUser, '| body.driver_id present:', !!body.driver_id, '| ADMIN_EMAIL configured:', !!adminEmail);

    console.error('[STAGE_LOAD_DRIVER_PROFILE] start — targetDriverId prefix:', targetDriverId.slice(0, 8));
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, stripe_account_id, display_name')
      .eq('driver_id', targetDriverId)
      .single();

    if (profileError || !profile) {
      console.error('[STAGE_LOAD_DRIVER_PROFILE] failed — profileError:', profileError?.code, profileError?.message);
      return errorResponse(req, 404, 'Perfil de conductor no encontrado');
    }
    console.error('[STAGE_LOAD_DRIVER_PROFILE] ok — has existing stripe_account_id:', !!profile.stripe_account_id);

    let stripeAccountId: string = profile.stripe_account_id;

    if (!stripeAccountId) {
      console.error('[STAGE_STRIPE_CREATE_ACCOUNT] start');
      const account = await stripe.accounts.create(
        { type: 'express', country: 'ES', metadata: { supabase_user_id: targetDriverId } },
        { idempotencyKey: `create-connect-account-${targetDriverId}` },
      );
      stripeAccountId = account.id;
      console.error('[STAGE_STRIPE_CREATE_ACCOUNT] ok — account id prefix:', stripeAccountId.slice(0, 8));

      console.error('[STAGE_UPDATE_DRIVER_PROFILE] start');
      const { error: updateError } = await supabaseAdmin
        .from('driver_payment_profiles')
        .update({ stripe_account_id: stripeAccountId, stripe_status: 'pending' })
        .eq('driver_id', targetDriverId);

      if (updateError) {
        console.error('[STAGE_UPDATE_DRIVER_PROFILE] failed:', updateError.code, updateError.message);
      } else {
        console.error('[STAGE_UPDATE_DRIVER_PROFILE] ok');
      }
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? Deno.env.get('PUBLIC_SITE_URL') ?? 'http://localhost:3000';
    console.error('[STAGE_STRIPE_CREATE_ACCOUNT_LINK] start — siteUrl configured:', siteUrl !== 'http://localhost:3000');
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${siteUrl}/?onboarding=refresh`,
      return_url: `${siteUrl}/?onboarding=complete`,
      type: 'account_onboarding',
    });
    console.error('[STAGE_STRIPE_CREATE_ACCOUNT_LINK] ok');

    return okResponse(req, { onboarding_url: accountLink.url });
  } catch (err) {
    const errName = err instanceof Error ? err.constructor.name : typeof err;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[create-driver-connect-account] UNHANDLED ERROR —', errName, ':', errMsg);
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
