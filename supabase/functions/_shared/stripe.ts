import Stripe from 'https://esm.sh/stripe@14?target=denonext';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

if (!stripeKey.startsWith('sk_test_')) {
  throw new Error(
    'STRIPE_SECRET_KEY inválida: solo se permiten claves de test (sk_test_) en este entorno.',
  );
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});
