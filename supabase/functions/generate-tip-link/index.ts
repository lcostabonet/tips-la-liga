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

    // Admin puede generar el link de cualquier conductor pasando driver_id en el body
    const body = await req.json().catch(() => ({}));
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
    const isAdminUser = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
    const targetDriverId: string = (isAdminUser && body.driver_id) ? body.driver_id : user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .select('id, display_name, tip_link_slug')
      .eq('driver_id', targetDriverId)
      .single();

    if (profileError || !profile) return errorResponse(req, 404, 'Perfil de conductor no encontrado');

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

    const { error: updateError } = await supabaseAdmin
      .from('driver_payment_profiles')
      .update({ tip_link_slug: slug, public_url: publicUrl })
      .eq('driver_id', targetDriverId);

    if (updateError) {
      console.error('[generate-tip-link] DB update failed:', updateError.message);
      return errorResponse(req, 500, 'Error interno del servidor');
    }

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
