# Legacy Cleanup Plan — Campos `payment_provider / payment_url / payment_instructions`

## Contexto

Sprint 3A añadió tres columnas a `driver_payment_profiles` para el modelo original de un solo método de pago:
- `payment_provider` (ej. `"paypal"`)
- `payment_url` (ej. `"https://paypal.me/usuario"`)
- `payment_instructions` (texto libre)

Sprint 3D introdujo `driver_payment_methods` como modelo nuevo de múltiples métodos.
Sprint 3F estabiliza la convivencia. Sprint 3G (futuro) eliminará las columnas cuando ya no sean necesarias.

---

## Inventario de usos en `app.js`

### Usos ACTIVOS que deben mantenerse

| Función | Campo(s) legacy | Por qué se mantiene |
|---|---|---|
| `loadPublicDrivers()` | `payment_provider, payment_url, payment_instructions` | Son necesarios para el flujo fallback en `showDriverPayView()` cuando un conductor aún no tiene `payment_methods` |
| `renderDriverList()` — objeto `normalized` | `payment_provider, payment_url, payment_instructions` | Propaga los campos al objeto `selectedDriver` para el flujo legacy |
| `showDriverPayView()` — rama else de `methods` | `driver.payment_url`, `driver.payment_instructions`, `driver.payment_provider` | Flujo legacy activo cuando `payment_methods` es null/vacío |
| `setupEvents()` — listener `externalPayBtn` | `selectedDriver.payment_url` | Solo activo en el flujo legacy; correcto |
| `loadDriverProfiles()` | `payment_provider, payment_url, payment_instructions` | Admin necesita ver y editar los campos legacy hasta que se eliminen |
| `renderDriverProfiles()` | `driver.payment_provider` (badge) | Indica al admin si el conductor tiene método legacy configurado |
| `openEditDriverDialog()` | `dataset.paymentProvider, dataset.paymentUrl, dataset.paymentInstructions` | Admin puede editar / migrar manualmente cada conductor |
| `saveEditDriver()` | `payment_provider, payment_url, payment_instructions` | Escritura admin a legacy fields — mecanismo de migración manual |

### Usos ELIMINADOS en Sprint 3F

| Función / Variable | Campo(s) legacy | Motivo de eliminación |
|---|---|---|
| `loadDriverSelfProfile()` SELECT | `payment_provider, payment_url, payment_instructions` | `showDriverSelfSection()` ya no los usa tras Sprint 3D |
| `updateSelfUrlPreview()` (función entera) | `selfPaymentProvider`, `selfPaymentUrl` (dinámicos) | Código muerto — forma dinámica de Sprint 3C eliminada en Sprint 3D |
| `saveDriverSelfProfile()` (función entera) | `payment_provider, payment_url, payment_instructions` | Código muerto — formulario Sprint 3C eliminado en Sprint 3D |

### Código ya ausente (Sprint 3C → Sprint 3D)

El formulario inline de Sprint 3C con campos `selfPaymentProvider`, `selfPaymentUrl`, `selfPaymentInstructions`, `selfDriverVisible` ya no existe en `showDriverSelfSection()`. `renderMethodList()` lo reemplazó. Las referencias dinámicas a esos IDs son inalcanzables.

---

## Estado de cada campo legacy por contexto

### `payment_provider`

| Contexto | Estado |
|---|---|
| `public_driver_profiles` vista | Expuesto (para flujo fallback "Dar propina") |
| `loadPublicDrivers()` SELECT | Activo |
| `showDriverPayView()` fallback | Activo — label del botón "Pagar con PayPal →" |
| Panel admin — badge y edición | Activo |
| `loadDriverSelfProfile()` SELECT | **Eliminado en Sprint 3F** |
| `saveDriverSelfProfile()` (dead code) | **Eliminado en Sprint 3F** |

### `payment_url`

| Contexto | Estado |
|---|---|
| `public_driver_profiles` vista | Expuesto (para QR fallback) |
| `loadPublicDrivers()` SELECT | Activo |
| `showDriverPayView()` fallback | Activo — QR source y URL de `externalPayBtn` |
| `handleTipPayment()` condición Stripe | Activo — `!selectedDriver.payment_url` |
| Panel admin — edición | Activo |
| `loadDriverSelfProfile()` SELECT | **Eliminado en Sprint 3F** |
| `saveDriverSelfProfile()` (dead code) | **Eliminado en Sprint 3F** |

### `payment_instructions`

| Contexto | Estado |
|---|---|
| `public_driver_profiles` vista | Expuesto (para instrucciones fallback) |
| `loadPublicDrivers()` SELECT | Activo |
| `showDriverPayView()` fallback | Activo — texto de instrucciones |
| Panel admin — edición | Activo |
| `loadDriverSelfProfile()` SELECT | **Eliminado en Sprint 3F** |
| `saveDriverSelfProfile()` (dead code) | **Eliminado en Sprint 3F** |

---

## Plan de eliminación completa (Sprint 3G — futuro)

**Condiciones previas para Sprint 3G:**
1. El bloque Sprint 3D de `supabase.sql` está ejecutado en Supabase.
2. Todos los conductores con datos en `payment_provider / payment_url` han sido migrados a `driver_payment_methods` (verificable con `select count(*) from driver_payment_profiles where payment_provider is not null`).
3. No quedan conductores usando el flujo legacy de "Dar propina" (verificable observando que `showDriverPayView()` nunca entra en la rama `else` con datos reales).

**Cambios en Sprint 3G:**
1. `supabase.sql` — DROP COLUMN de los tres campos (con backup previo).
2. `public_driver_profiles` — recrear vista sin las tres columnas.
3. `loadPublicDrivers()` — eliminar tres campos del SELECT.
4. `renderDriverList()` — eliminar tres campos del objeto `normalized`.
5. `showDriverPayView()` — eliminar rama legacy (bloque `else` de `methods`).
6. `setupEvents()` — eliminar listener de `externalPayBtn` (o reconvertirlo).
7. `loadDriverProfiles()` — eliminar tres campos del SELECT.
8. `renderDriverProfiles()` — eliminar badge de `payment_provider`.
9. `openEditDriverDialog()` y `saveEditDriver()` — eliminar campos del dialog o reemplazar el dialog de edición por un formulario orientado a `driver_payment_methods`.
10. `index.html` — eliminar campos legacy del `#editDriverDialog`.

---

## Columnas en `driver_payment_profiles` — estado actual

| Columna | Estado | Acción |
|---|---|---|
| `id` | Activa | Mantener |
| `driver_id` | Activa | Mantener |
| `display_name` | Activa | Mantener |
| `vehicle_info` | Activa | Mantener |
| `route_info` | Activa | Mantener |
| `stripe_account_id` | Activa (aparcada) | Mantener |
| `stripe_status` | Activa (aparcada) | Mantener |
| `payouts_enabled` | Activa (aparcada) | Mantener |
| `charges_enabled` | Activa (aparcada) | Mantener |
| `tip_link_slug` | Activa (aparcada) | Mantener |
| `public_url` | Activa (aparcada) | Mantener |
| `is_active` | Activa | Mantener |
| `is_visible` | Activa | Mantener |
| `payment_provider` | **Legacy** — fallback activo | Mantener hasta Sprint 3G |
| `payment_url` | **Legacy** — fallback activo | Mantener hasta Sprint 3G |
| `payment_instructions` | **Legacy** — fallback activo | Mantener hasta Sprint 3G |
| `created_at` | Activa | Mantener |
| `updated_at` | Activa | Mantener |
