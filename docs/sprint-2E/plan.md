# Sprint 2E Plan: Pruebas E2E de Stripe Connect en modo test

## Objetivo del sprint
Validar el flujo completo extremo a extremo en modo test: el admin gestiona un perfil de conductor desde la web, se crea la cuenta Stripe Connect de prueba, se completa el onboarding, se genera el QR/link de pago, y el link aparece funcional en la pestaña "Dar propina". Todo sin dinero real.

## Contexto
- **Sprint 2B:** tabla `driver_payment_profiles` con RLS y trigger `guard_stripe_fields`.
- **Sprint 2C:** 4 Edge Functions desplegadas en Supabase. Secrets `STRIPE_SECRET_KEY`, `SITE_URL`, `PUBLIC_SITE_URL` y `ADMIN_EMAIL` deben estar configurados.
- **Sprint 2D:** panel admin en frontend + llamadas a Edge Functions via `client.functions.invoke()`. `MOCK_DRIVERS` como fallback si `public_driver_profiles` está vacío.
- **Sprint 2E:** no hay código nuevo — es validación E2E del trabajo de los sprints anteriores.

## Alcance

### Incluye
- Flujo completo admin → onboarding Stripe Connect test → pago test.
- Verificación de estado en Supabase (`driver_payment_profiles`).
- Verificación de la vista pública (`public_driver_profiles`): sin campos sensibles.
- Comprobación de que no hay claves secretas expuestas en frontend.
- Comprobación de que las Edge Functions responden con los datos correctos.
- Prueba del flujo de "Dar propina" con conductores reales.

### Excluye explícitamente
- Claves Stripe live.
- Dinero real.
- Webhook real (`stripe-webhook` sigue siendo placeholder).
- Panel de conductor autónomo (Sprint 2F).
- `external_tip_payments` (Sprint 2F).

---

## Prerrequisitos obligatorios

### 1. Supabase configurado
- Tabla `driver_payment_profiles` existente con al menos 1 fila de prueba (seed data de Sprint 2B).
- Vista `public_driver_profiles` existente.
- Trigger `guard_stripe_fields` activo.
- RLS habilitada.

### 2. Edge Functions desplegadas
```bash
supabase functions deploy create-driver-connect-account
supabase functions deploy refresh-driver-onboarding-link
supabase functions deploy generate-tip-link
supabase functions deploy create-driver-payment-link
supabase functions deploy stripe-webhook
```

### 3. Secrets en Supabase configurados
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set SITE_URL=https://lcostabonet.github.io/tips-la-liga
supabase secrets set PUBLIC_SITE_URL=https://lcostabonet.github.io/tips-la-liga
supabase secrets set ADMIN_EMAIL=lluis15basket@hotmail.es
```

### 4. Usuario admin existente en Supabase Auth
El email `lluis15basket@hotmail.es` debe ser un usuario registrado en el proyecto Supabase.

### 5. Modo test activo en Stripe
- Stripe Dashboard en modo test.
- `STRIPE_SECRET_KEY` empieza por `sk_test_` (verificado por assert en Edge Function).

---

## Flujo E2E completo

```
[1] Admin abre la web y hace login
        ↓
[2] Admin ve botón "🚌 Conductores" en topbar
        ↓
[3] Admin entra en el panel de conductores
        → Lista de driver_payment_profiles con badges de estado
        ↓
[4] Admin pulsa "Onboarding" para un conductor
        → Edge Function create-driver-connect-account
        → Stripe crea cuenta Express (test)
        → DB: stripe_account_id + stripe_status = 'pending'
        → Browser abre onboarding_url
        ↓
[5] Admin completa el onboarding de Stripe (test mode)
        → Introducir datos de prueba en el formulario Stripe
        → Stripe redirige a return_url (?onboarding=complete)
        ↓
[6] Admin pulsa "Actualizar estado"
        → Edge Function refresh-driver-onboarding-link
        → DB: charges_enabled = true, stripe_status = 'active'
        → Badge cambia a verde "Activa ✓"
        ↓
[7] Admin pulsa "Generar QR"
        → Edge Function generate-tip-link
        → DB: tip_link_slug + public_url actualizados
        → QR real aparece en la tarjeta
        ↓
[8] Admin pulsa "Test 1€"
        → Edge Function create-driver-payment-link (sin auth)
        → Stripe Checkout test abre en nueva pestaña
        → Pagar con tarjeta 4242 4242 4242 4242
        → Stripe redirige a success_url (?payment=success)
        ↓
[9] Abrir "Dar propina" (mismo conductor, mismo navegador o incógnito)
        → Conductores reales desde public_driver_profiles
        → QR real del conductor visible
        → Pagar → Stripe Checkout test
        ↓
[10] Verificar estado final en Supabase y Stripe Dashboard
```

---

## Tarjetas de test Stripe

| Tarjeta | Resultado esperado |
|---|---|
| `4242 4242 4242 4242` | Pago completado ✓ |
| `4000 0000 0000 9995` | Fondos insuficientes ✗ |
| `4000 0025 0000 3155` | Requiere 3D Secure |

CVC: cualquier 3 dígitos. Fecha: cualquier fecha futura (ej. `12/30`).

---

## Criterios de aceptación

- [ ] Admin puede completar el flujo E2E de onboarding sin errores.
- [ ] `driver_payment_profiles` refleja el estado correcto en cada paso.
- [ ] `public_driver_profiles` muestra el conductor sin campos sensibles.
- [ ] El QR generado codifica la `public_url` real del conductor.
- [ ] "Test 1€" abre Stripe Checkout test y el pago se procesa.
- [ ] "Dar propina" muestra conductores reales (no `MOCK_DRIVERS`).
- [ ] No hay `stripe_account_id` ni claves secretas en ninguna respuesta del frontend.
- [ ] Las Edge Functions responden correctamente con los datos esperados.

---

## Archivos entregados
- `docs/sprint-2E/plan.md` (este archivo)
- `docs/sprint-2E/checklist-e2e.md`
- `docs/sprint-2E/handoff-qa.md`

## Siguiente paso (Sprint 2F)
- Implementar webhook real con `STRIPE_WEBHOOK_SECRET`.
- Registrar pagos en `external_tip_payments`.
- Panel de conductor autónomo (el conductor gestiona su propio perfil).
