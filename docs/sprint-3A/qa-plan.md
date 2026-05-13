# Sprint 3A QA Plan: Pago externo PayPal

## Setup de entorno

- Conductor de prueba en `driver_payment_profiles` con:
  - `payment_provider = 'paypal'`
  - `payment_url = 'https://paypal.me/username_test'` (real o ficticio)
  - `payment_instructions = 'Pon tu nombre en el concepto'` (opcional)
  - `is_active = true`, `is_visible = true`
- Segundo conductor sin `payment_url` para probar el estado vacío.
- Sesión de admin disponible.

---

## Pruebas del flujo principal

### T01 — Admin configura enlace PayPal

| Paso | Resultado esperado |
|---|---|
| Login como admin → "🚌 Conductores" | Lista de conductores cargada |
| Pulsar "Editar" en un conductor | Dialog abre con campos pre-rellenados |
| Seleccionar "PayPal" en el selector | Select muestra "PayPal" |
| Introducir `https://paypal.me/test_usuario` | Input acepta la URL |
| Introducir instrucciones | Textarea acepta el texto |
| Pulsar "Guardar" | Toast "Perfil actualizado." |
| Verificar badge en la tarjeta | Badge azul "PayPal" visible |

**Verificar en DB:**
```sql
select payment_provider, payment_url, payment_instructions
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
```

### T02 — Cliente ve QR y botón PayPal

| Paso | Resultado esperado |
|---|---|
| Pulsar "💸 Dar propina" | Lista con conductores reales de Supabase |
| Seleccionar el conductor con PayPal | Vista de pago del conductor |
| Verificar QR | QR generado a partir de `payment_url` (no URL demo) |
| Verificar instrucciones | Texto de instrucciones visible si existe |
| Verificar botón | "Pagar con PayPal →" visible |
| Verificar aviso | "El pago se completa en PayPal…" visible |

### T03 — Botón abre PayPal

| Paso | Resultado esperado |
|---|---|
| Seleccionar importe 5€ | Chips o input activos |
| Pulsar "Pagar con PayPal →" | Nueva pestaña con `https://paypal.me/test_usuario/5.00` |
| Sin importe seleccionado | Nueva pestaña con `https://paypal.me/test_usuario` |

**DevTools → Network:** verificar que no hay llamadas a Edge Functions al pulsar el botón.

### T04 — Conductor sin pago configurado

| Paso | Resultado esperado |
|---|---|
| Seleccionar conductor sin `payment_url` | Vista de pago sin QR real |
| Verificar aviso | "Este conductor aún no tiene método de pago configurado." |
| Verificar botón | Sin botón de pago externo |

### T05 — MOCK_DRIVERS (fallback)

| Paso | Resultado esperado |
|---|---|
| Vaciar `public_driver_profiles` de conductores visibles (o simular con is_visible = false) | Lista muestra MOCK_DRIVERS |
| Seleccionar mock conductor | Vista con QR ficticio |
| Aviso | "🧪 Modo demo — el pago no es real" |
| Pulsar "Pagar" | Simulación (no abre PayPal, no llama Edge Function) |

---

## Pruebas de seguridad

### T06 — Sin claves secretas en el frontend

- Revisar `app.js`: sin `paypal_secret`, `client_id`, `sk_`, `pk_live_`.
- `payment_url` es una URL pública — correcto.

### T07 — Vista pública no expone campos sensibles

```sql
select column_name
from information_schema.columns
where table_name = 'public_driver_profiles' and table_schema = 'public';
-- payment_provider, payment_url, payment_instructions: presentes ✓
-- stripe_account_id, driver_id: ausentes ✓
```

### T08 — DevTools: sin llamadas a APIs externas desde el código

Verificar en Network que:
- El click en "Pagar con PayPal" solo hace un `window.open()`, sin fetch ni XMLHttpRequest.
- No hay llamadas a `api.paypal.com` desde JS (el pago ocurre en el navegador del cliente, no en el código).

---

## Pruebas de no regresión

| Test | Resultado esperado |
|---|---|
| Login/registro usuario normal | Sin cambios |
| Añadir propina EUR/USD | Sin cambios |
| Ver rankings | Sin cambios |
| Panel admin: botones Onboarding/Refresh (Stripe aparcado) | Siguen visibles |
| `guard_stripe_fields` intacto | `update stripe_account_id` directo sigue bloqueado |

---

## Verificaciones de DB finales

```sql
-- Columnas nuevas presentes
select column_name from information_schema.columns
where table_name = 'driver_payment_profiles' and table_schema = 'public'
and column_name in ('payment_provider', 'payment_url', 'payment_instructions');
-- Esperado: 3 filas

-- Vista actualizada correctamente
select column_name from information_schema.columns
where table_name = 'public_driver_profiles' and table_schema = 'public'
order by ordinal_position;
-- Esperado: 11 columnas incluidas las 3 nuevas

-- Conductor de prueba configurado
select display_name, payment_provider, payment_url
from public.driver_payment_profiles
where payment_provider is not null;
-- Al menos 1 fila con payment_provider = 'paypal'
```
