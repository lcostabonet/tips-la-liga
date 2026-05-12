export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? '';

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isAllowed = (siteUrl && origin === siteUrl) || isLocalhost;

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (siteUrl || '*'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
