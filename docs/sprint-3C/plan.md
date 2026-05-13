# Sprint 3C Plan: Autoservicio de enlace de pago para conductores

## Objetivo
Permitir que cada conductor configure su propio enlace de pago externo (PayPal) desde la web, sin necesitar la intervención del admin.

## Contexto

- **Sprint 3A** añadió `payment_provider`, `payment_url`, `payment_instructions` a `driver_payment_profiles` y el flujo de pago en "Dar propina".
- **Sprint 3B** mejoró el panel admin con validación en tiempo real, QR preview y botón "Probar →".
- **Sprint 3C** traslada esa misma experiencia al conductor, que ahora puede gestionar su propio enlace desde su sesión.

### ¿Requiere cambios en Supabase SQL?

No. La infraestructura ya está lista:

| Componente | Estado |
|---|---|
| `dpp_conductor_read_own` (SELECT where `driver_id = auth.uid()`) | ✅ Existe |
| `dpp_conductor_update_own` (UPDATE where `driver_id = auth.uid()`) | ✅ Existe |
| `guard_stripe_fields` (bloquea Stripe e `is_active`) | ✅ No bloquea `payment_provider`, `payment_url`, `payment_instructions`, `is_visible` |

El conductor puede leer y actualizar sus propios campos de pago externo con su sesión autenticada, sin pasar por Edge Functions ni admin.

---

## Alcance

### Incluye
- Botón **"🔗 Mi enlace"** en la barra superior, visible solo al conductor que tiene fila en `driver_payment_profiles`.
- Sección **"Mi enlace de propinas"** con formulario de edición.
- Campos editables: `payment_provider`, `payment_url`, `payment_instructions`, `is_visible`.
- `display_name` mostrado como solo lectura (contexto, no editable desde autoservicio).
- Validación PayPal en tiempo real reutilizando `isValidPaymentUrl()` de Sprint 3B.
- QR preview con debounce 500ms (mismo patrón que Sprint 3B).
- Botón **"Probar enlace →"** que abre la URL en nueva pestaña.
- Disclaimer: _"Tips La Liga no procesa pagos. El pago se realiza fuera de la app y llega directamente a ti."_
- Toast de confirmación al guardar.
- Si el conductor no tiene fila en `driver_payment_profiles`: el botón no aparece.

### Excluye explícitamente
- Editar `display_name` desde autoservicio (lo gestiona el admin).
- Crear un perfil de conductor nuevo desde el frontend (requiere admin o SQL).
- PayPal API, OAuth, webhooks de PayPal.
- Claves secretas.
- Procesamiento de pagos.
- Cambios en Stripe Connect.
- Cambios en `supabase.sql`.
- Edge Functions nuevas o modificadas.

---

## Flujo del conductor

```
[Iniciar sesión]
        ↓
loadDriverSelfProfile() — SELECT de driver_payment_profiles where driver_id = auth.uid()
        ↓
Si existe fila → botón "🔗 Mi enlace" visible en topbar
        ↓
Conductor pulsa "🔗 Mi enlace"
        ↓
Sección muestra sus datos actuales prellenados:
  - display_name (solo lectura)
  - Selector de proveedor + badge dinámico
  - Campo URL + indicador verde/rojo
  - QR preview (si hay URL válida)
  - Botón "Probar enlace →"
  - Instrucciones para el cliente
  - Toggle "Visible en Dar propina"
        ↓
Conductor edita campos y pulsa "Guardar"
        ↓
Validación frontend: si PayPal con URL inválida → toast de error, sin guardar
        ↓
UPDATE driver_payment_profiles via Supabase client (auth del conductor)
  → RLS dpp_conductor_update_own: permite si driver_id = auth.uid()
  → guard_stripe_fields: permite payment_provider, payment_url, payment_instructions, is_visible
        ↓
Toast "Enlace guardado." → conductor vuelve a la app
```

---

## Relación con el resto de la app

| Elemento | Impacto en Sprint 3C |
|---|---|
| Panel admin (`#adminDriversSection`) | Sin cambios — el admin sigue gestionando todos los conductores |
| "Dar propina" (`#tipDriverSection`) | Sin cambios — sigue usando `public_driver_profiles` |
| MOCK_DRIVERS | Sin cambios |
| Stripe Connect | Aparcado, sin tocar |
| `isValidPaymentUrl()` | Reutilizada sin modificar |

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `index.html` | Añadir `#driverSelfSection` y botón `#driverLinkBtn` |
| `style.css` | Estilos para la nueva sección |
| `app.js` | `loadDriverSelfProfile()`, `showDriverSelfSection()`, `hideDriverSelfSection()`, `updateSelfUrlPreview()`, `saveDriverSelfProfile()`, nuevas refs en `els`, listeners |

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Sección "Dar propina"
- Panel admin del conductor (sin tocar la lógica existente)

---

## Criterios de aceptación

- [ ] Botón "🔗 Mi enlace" visible solo al conductor con perfil creado.
- [ ] Sección prellenada con los valores actuales al abrirse.
- [ ] Indicador verde "✓ Enlace válido" con URL PayPal correcta.
- [ ] Indicador rojo "✗ El enlace no parece de PayPal" con URL inválida.
- [ ] QR preview visible con URL válida (tras 500ms).
- [ ] Botón "Probar enlace →" abre la URL en nueva pestaña sin guardar.
- [ ] Guardar actualiza la DB correctamente.
- [ ] Si PayPal con URL inválida al guardar: toast de error, sin UPDATE.
- [ ] Disclaimer visible: "Tips La Liga no procesa pagos."
- [ ] Sin claves secretas. Sin PayPal API.
- [ ] Stripe Connect intacto. `supabase.sql` sin cambios.
- [ ] Si no hay fila en `driver_payment_profiles`: botón no aparece.

---

## Siguiente paso (Sprint 3D)
Soporte para más proveedores de pago externo (Bizum, Revolut, transferencia bancaria). Plantilla de instrucciones por proveedor con textos sugeridos.
