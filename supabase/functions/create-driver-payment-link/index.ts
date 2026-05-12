import { getCorsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

  try {
    let body: { slug?: string; amount?: number; currency?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, 400, 'Cuerpo JSON inválido');
    }

    const { slug, amount, currency = 'eur' } = body;

    if (!slug || typeof slug !== 'string') return errorResponse(req, 400, 'El campo slug es obligatorio');
    if (!amount || typeof amount !== 'number' || amount < 0.5) {
      return errorResponse(req, 400, 'El importe debe ser un número mayor o igual a 0.50');
    }

    const { data: publicProfile, error: viewError } = await supabaseAdmin
      .from('public_driver_profiles')
      .select('id, display_name')
      .eq('tip_link_slug', slug)
      .single();

    if (viewError || !publicProfile) return errorResponse(req, 404, 'Conductor no encontrado');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('stripe_account_id, charges_enabled')
      .eq('id', publicProfile.id)
      .single();

    if (profileError || !profile) return errorResponse(req, 404, 'Perfil de pago no encontrado');
    if (!profile.stripe_account_id) return errorResponse(req, 400, 'Este conductor no tiene cuenta Stripe configurada.');
    if (!profile.charges_enabled) return errorResponse(req, 400, 'Este conductor aún no puede recibir pagos.');

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
    const amountCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
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

    return okResponse(req, { session_url: session.url });
  } catch (err) {
    // Endpoint público: nunca devolver detalles internos al cliente.
    console.error('[create-driver-payment-link]', err);
    return errorResponse(req, 500, 'Error procesando la solicitud. Inténtalo de nuevo.');
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
