import { getCorsHeaders } from '../_shared/cors.ts';

// Sprint 2D: implementar procesamiento real de eventos Stripe.
//
// Eventos previstos:
//   - checkout.session.completed  → registrar pago en external_tip_payments
//   - payment_intent.succeeded    → confirmar pago en DB
//   - payment_intent.payment_failed → marcar intento fallido
//   - account.updated             → sincronizar charges_enabled / payouts_enabled
//
// Requisitos Sprint 2D:
//   - Configurar STRIPE_WEBHOOK_SECRET en Supabase Secrets.
//   - Validar Stripe-Signature con stripe.webhooks.constructEvent().
//   - Usar supabaseAdmin (service_role) para escribir en external_tip_payments.
//   - Garantizar idempotencia verificando stripe_payment_id antes de insertar.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

  // Placeholder: acepta el evento y responde 200 sin procesarlo.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
});
