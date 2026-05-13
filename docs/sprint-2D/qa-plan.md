# Sprint 2D QA Plan: Panel admin + integración frontend

## Setup de entorno de pruebas
- Supabase con `driver_payment_profiles` poblado (mínimo 2 conductores de prueba, uno con `charges_enabled = true` y otro con `stripe_status = 'not_connected'`).
- Stripe test mode activo (`STRIPE_SECRET_KEY = sk_test_...`).
- Sesión de admin iniciada (`ADMIN_EMAIL` configurado).
- Sesión de usuario no-admin para pruebas de acceso.

---

## 1. Panel admin: visibilidad y acceso

| Test | Pasos | Resultado esperado |
|---|---|---|
| Solo admin ve el panel | Iniciar sesión como non-admin | `#adminDriversSection` no visible |
| Admin ve el panel | Iniciar sesión como admin | `#adminDriversSection` visible |
| Panel aparece en navegación | Admin navega a la sección | Lista de conductores cargada |

---

## 2. Crear conductor

| Test | Pasos | Resultado esperado |
|---|---|---|
| Formulario vacío | Pulsar guardar sin `display_name` | Validación HTML5 bloquea |
| Crear nuevo conductor | Rellenar y guardar | Conductor aparece en lista; fila en `driver_payment_profiles` |
| Conductor duplicado | Crear conductor con mismo `display_name` | El comportamiento depende de la implementación; sin duplicado en DB (un usuario solo puede tener un perfil por `driver_id`) |

**Verificar en DB:**
```sql
select display_name, stripe_status, charges_enabled
from public.driver_payment_profiles
order by created_at desc limit 3;
```

---

## 3. `create-driver-connect-account`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Sin `stripe_account_id` | Conductor nuevo → "Iniciar onboarding" | `onboarding_url` devuelto; nueva pestaña con Stripe Connect test |
| Cuenta ya existente | Volver a pulsar "Iniciar onboarding" | Mismo conductor, nuevo `onboarding_url` (cuenta reutilizada) |
| DB actualizado | Tras primera llamada exitosa | `stripe_account_id` no null, `stripe_status = 'pending'` |

**Verificar en Stripe Dashboard (test mode):**
- Connect → Accounts → ver cuenta creada.

---

## 4. `refresh-driver-onboarding-link`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Estado inicial | Conductor con onboarding incompleto | `stripe_status = 'pending'`, `charges_enabled = false`, devuelve `onboarding_url` |
| Tras completar onboarding | Completar en Stripe → "Actualizar estado" | `stripe_status = 'active'`, `charges_enabled = true`, badge verde |
| Badge actualizado en UI | Después del refresh | Badge cambia de color sin recargar la página |

**Verificar en DB:**
```sql
select stripe_status, charges_enabled, payouts_enabled
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
```

---

## 5. `generate-tip-link`

| Test | Pasos | Resultado esperado |
|---|---|---|
| Sin slug previo | Conductor sin `tip_link_slug` → "Generar link/QR" | Slug generado, QR aparece en tarjeta, `public_url` visible |
| Con slug existente | Volver a pulsar "Generar link/QR" | Mismo slug, no se genera uno nuevo |
| QR visible | Ver imagen QR | Imagen cargada desde `api.qrserver.com`, codifica `public_url` |
| `public_url` correcta | Revisar el enlace | URL con formato `${SITE_URL}/tip/${slug}` |

**Verificar en DB:**
```sql
select tip_link_slug, public_url
from public.driver_payment_profiles
where display_name = '[nombre conductor test]';
```

---

## 6. `create-driver-payment-link` (desde panel admin "Test 1€")

| Test | Pasos | Resultado esperado |
|---|---|---|
| Conductor activo con slug | "Test: pagar 1€" | `session_url` devuelto; Stripe Checkout test en nueva pestaña |
| Pago completado | Pagar con `4242 4242 4242 4242`, fecha 12/30, CVC 123 | Redirige a `success_url` con `?payment=success` |
| Pago cancelado | Pulsar "Cancelar" en Checkout | Redirige a `cancel_url` con `?payment=cancel` |
| Conductor sin `charges_enabled` | Pulsar "Test 1€" para conductor `not_connected` | Error 400 en UI: "Este conductor aún no puede recibir pagos." |
| Sin slug | Conductor sin `tip_link_slug` | Botón desactivado o error controlado |

**Verificar en Stripe Dashboard:**
- Payments → sesión creada en test mode.
- `transfer_data.destination` = `stripe_account_id` del conductor.

---

## 7. Sección "Dar propina" con datos reales

| Test | Pasos | Resultado esperado |
|---|---|---|
| Conductores reales | Abrir "Dar propina" | Lista cargada desde `public_driver_profiles` (no MOCK_DRIVERS) |
| Solo visibles | Conductor con `is_visible = false` | No aparece en la lista |
| QR real | Conductor con `public_url` | QR usa `public_url` real, no URL demo |
| Sin public_url | Conductor sin `tip_link_slug` | QR placeholder o mensaje informativo |
| Pago desde UI | Seleccionar importe → "Pagar" | Llama a `create-driver-payment-link` con slug real |

---

## 8. Seguridad

| Test | Pasos | Resultado esperado |
|---|---|---|
| `stripe_account_id` no en UI | Inspeccionar HTML/JS | No aparece en ningún elemento visible |
| Non-admin no ve panel | Login como non-admin | `#adminDriversSection` oculta |
| Sin claves secretas | Revisar `app.js` con grep | Sin `sk_test_`, `sk_live_`, `whsec_`, `service_role` literals |
| JWT en Edge Function calls | Capturar request en DevTools | Header `Authorization: Bearer <token>` presente |

---

## 9. Sin regresiones

| Test | Pasos | Resultado esperado |
|---|---|---|
| Login/logout | Flujo completo | Sin cambios |
| Añadir propina | Formulario + guardar | Propina guardada en Supabase |
| Rankings | Cambiar mes | Rankings actualizados |
| Export CSV | Pulsar "Exportar CSV" | Descarga CSV del mes |
| Editar/borrar propina | Click en propina → editar | Sin cambios en comportamiento |

---

## 10. Checks finales de código

- [ ] `MOCK_DRIVERS` no produce resultados en producción (o está eliminado).
- [ ] `stripe_account_id` no aparece en ningún `select` que se muestre en UI.
- [ ] Ninguna clave live en `app.js`, `index.html` ni `style.css`.
- [ ] Todas las llamadas a Edge Functions usan `${SUPABASE_URL}/functions/v1/`.
- [ ] Estado de carga (loading) visible al llamar a Edge Functions (botones desactivados o spinner).
- [ ] Errores de Edge Functions mostrados con `toast()` al usuario.
