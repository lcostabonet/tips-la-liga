# Sprint 2C Secrets Plan: Variables de entorno y secretos

## Principios

1. **Ninguna clave secreta en el código fuente ni en commits.**
2. Las claves de Stripe live (`sk_live_`, `pk_live_`) no se usan en Sprint 2C.
3. `SUPABASE_SERVICE_ROLE_KEY` no se hardcodea — Supabase lo inyecta automáticamente en Edge Functions.
4. `STRIPE_PUBLISHABLE_KEY` es la única clave que puede ir en el frontend (Sprint 2D).

---

## Variables secretas (Edge Functions únicamente)

Configurar en: **Supabase Dashboard → Settings → Edge Functions → Secrets**

| Variable | Dónde obtenerla | Puede ir en frontend | Sprint 2C |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key (test) | **Nunca** | Requerida |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret | **Nunca** | Sprint 2D |
| `SITE_URL` | URL pública de la app (GitHub Pages) | Sí (no es secreta) | Requerida para `public_url` |

**`SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL`** son inyectadas automáticamente por Supabase en el entorno de Edge Functions. No es necesario declararlas ni commitearlas.

---

## Variables del frontend (Sprint 2D)

Estas pueden estar en `app.js` porque son públicas por diseño:

| Variable | Valor | Segura en frontend |
|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Sí (solo test) |
| `SUPABASE_URL` | Ya presente en `app.js` | Sí |
| `SUPABASE_ANON_KEY` | Ya presente en `app.js` (`sb_publishable_...`) | Sí |

---

## Qué NUNCA debe aparecer en el código ni en commits

```
sk_test_...      ← STRIPE_SECRET_KEY test
sk_live_...      ← STRIPE_SECRET_KEY live (jamás en este proyecto)
pk_live_...      ← STRIPE_PUBLISHABLE_KEY live (jamás en Sprint 2C)
whsec_...        ← STRIPE_WEBHOOK_SECRET
service_role...  ← SUPABASE_SERVICE_ROLE_KEY
```

---

## Cómo acceder a los secretos en una Edge Function

```typescript
// Supabase inyecta automáticamente:
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Configurados manualmente en Supabase Secrets:
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const siteUrl = Deno.env.get('SITE_URL')!;
```

---

## Cómo configurar STRIPE_SECRET_KEY en Supabase

1. Ir a [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys).
2. Copiar la **Secret key** del modo **Test** (`sk_test_...`).
3. En Supabase Dashboard → **Settings → Edge Functions → Add new secret**.
4. Nombre: `STRIPE_SECRET_KEY`. Valor: `sk_test_...`.
5. Hacer lo mismo con `SITE_URL` (ej. `https://lcostabonet.github.io/tips-la-liga`).

---

## Verificación antes de desplegar

- [ ] `STRIPE_SECRET_KEY` empieza por `sk_test_` (no `sk_live_`).
- [ ] `STRIPE_SECRET_KEY` no aparece en ningún archivo `.ts`, `.js`, `.env` commiteado.
- [ ] `.gitignore` incluye `.env` y `supabase/.env`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún archivo fuente.
- [ ] `SITE_URL` apunta a la URL real del proyecto (sin barra final).

---

## .gitignore recomendado (añadir si no existe)

```
.env
.env.local
supabase/.env
supabase/functions/.env
```

---

## Separación test / live (para el futuro)

| Entorno | Stripe key | Estado |
|---|---|---|
| Sprint 2C (test) | `sk_test_...` | ✅ Activo |
| Producción (live) | `sk_live_...` | ❌ No usar hasta validación legal completa |

Antes de activar claves live es obligatorio: revisar requisitos de KYC de Stripe Connect, confirmar cumplimiento fiscal y obtener aprobación del equipo.
