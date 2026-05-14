# Sprint 3F Checklist

## Cambios a implementar

### C01 — Eliminar código muerto de Sprint 3C
- [ ] Variable `selfQrPreviewTimer` eliminada
- [ ] Función `updateSelfUrlPreview()` eliminada (completa)
- [ ] Función `saveDriverSelfProfile()` eliminada (completa)
- [ ] Ninguna referencia residual a `selfPaymentProvider`, `selfPaymentUrl`, `selfUrlValidationHint`, `selfTestLinkBtn`, `selfProviderBadge`, `selfQrPreview`, `selfQrPreviewImg`

### C02 — SELECT de `loadDriverSelfProfile()`
- [ ] SELECT contiene exactamente: `id, driver_id, display_name, is_visible`
- [ ] Campos eliminados: `payment_provider`, `payment_url`, `payment_instructions`
- [ ] `driverSelfProfile.display_name` sigue disponible (incluido en SELECT) ✓
- [ ] `driverSelfProfile.is_visible` sigue disponible (incluido en SELECT) ✓
- [ ] `driverSelfProfile.id` sigue disponible para `loadSelfMethods()` ✓

### C03 — Mensaje vacío en `renderMethodList()`
- [ ] Mensaje contiene "Añade PayPal o Revolut"
- [ ] Mensaje referencia "Dar propina"

### C04 — Mensaje sin método en `showDriverPayView()`
- [ ] Texto actualizado a "Sin método de pago configurado aún."

### C05 — Condición Stripe en `handleTipPayment()`
- [ ] Condición incluye `!selectedDriver.payment_methods?.length`
- [ ] No afecta al flujo cuando `payment_methods` tiene elementos (rama Stripe nunca activa)
- [ ] No afecta al flujo legacy (cuando `payment_url` existe, condición ya es `false`)

---

## Verificación de no-regresiones

### Frontend
- [ ] Login y registro funcionan
- [ ] Añadir / editar / borrar propinas funciona
- [ ] Rankings mensuales y globales se muestran
- [ ] "Dar propina" — conductores con `payment_methods` muestran sus bloques
- [ ] "Dar propina" — conductores sin métodos muestran texto correcto
- [ ] "Mi enlace" — conductores con métodos los ven y gestionan
- [ ] "Mi enlace" — conductores sin métodos ven el nuevo mensaje orientativo
- [ ] Panel admin "Conductores" sigue funcionando
- [ ] Botón "Métodos de pago" en panel admin abre la sección correcta
- [ ] Login/logout limpia todas las secciones
- [ ] Botón "Cancelar" en formulario de creación de perfil funciona (Sprint 3E)

### Seguridad
- [ ] Sin claves secretas añadidas
- [ ] Sin PayPal API ni Revolut API
- [ ] Sin procesamiento de pagos interno
- [ ] `supabase.sql` no modificado
- [ ] Edge Functions no modificadas

### Base de datos
- [ ] `driver_payment_methods` — no se borran columnas de `driver_payment_profiles`
- [ ] `public_driver_profiles` — vista intacta (columnas legacy siguen en ella)
- [ ] Fallback a `payment_url` legacy en "Dar propina" sigue operativo

---

## Archivos modificados

- [ ] Solo `app.js` modificado

## Archivos NO modificados

- [ ] `index.html`
- [ ] `style.css`
- [ ] `supabase.sql`
- [ ] `supabase/functions/**`
