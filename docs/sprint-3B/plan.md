# Sprint 3B Plan: Panel admin mejorado para enlaces de pago externos

## Objetivo del sprint
Mejorar la experiencia del admin al configurar enlaces de pago por conductor, eliminando la necesidad de editar Supabase manualmente. El admin puede ver en tiempo real si el enlace es válido, previsualizar el QR antes de guardar y probar el enlace directamente desde el dialog.

## Contexto
- **Sprint 3A** añadió las columnas `payment_provider`, `payment_url`, `payment_instructions` y el flujo de pago externo en "Dar propina". La validación de dominio PayPal existe en frontend y en DB (`payment_url_provider_match`).
- **Sprint 3B** es 100% frontend. No hay cambios en Supabase, no hay Edge Functions, no hay secretos.

## Alcance

### Incluye
- Indicador de validación en tiempo real del `payment_url` dentro del dialog de edición.
- Previsualización del QR dentro del dialog (se actualiza al escribir).
- Botón "Probar enlace →" que abre el `payment_url` en nueva pestaña.
- Selector de proveedor mejorado visualmente.
- Mantener validación de dominio PayPal (existente de Sprint 3A).

### Excluye explícitamente
- PayPal API.
- Claves secretas.
- Procesamiento de pagos.
- Cambios en `supabase.sql`.
- Modificaciones en Edge Functions.
- Stripe Connect (sigue aparcado, sin tocar).

---

## Nuevas funcionalidades en el dialog de edición

### 1. Indicador de validación en tiempo real

Al escribir en el campo `payment_url`:
- URL vacía → sin indicador.
- URL válida para el proveedor seleccionado → `✓ Enlace válido` (verde).
- URL inválida para PayPal → `✗ El enlace no parece de PayPal` (rojo).
- Proveedor sin configurar con URL → indicador neutral.

Se activa en cada `input` sobre `editPaymentUrl` y en cada `change` sobre `editPaymentProvider`.

### 2. Previsualización del QR

Un `<img>` pequeño (120×120 px) dentro del dialog que:
- Aparece solo cuando hay una URL válida.
- Se genera con `api.qrserver.com` igual que el QR del "Dar propina".
- Se actualiza con un debounce de 500 ms para no saturar requests al escribir.
- Se oculta si la URL es inválida o vacía.

### 3. Botón "Probar →"

Un botón compacto situado debajo del campo `payment_url`:
- Abre `payment_url` en nueva pestaña con `window.open(..., '_blank', 'noopener')`.
- Desactivado si la URL está vacía o es inválida.
- No guarda nada — solo permite al admin verificar que el enlace funciona antes de guardar.

### 4. Selector de proveedor mejorado

El `<select id="editPaymentProvider">` se complementa con:
- Un badge de color junto al selector que cambia según el proveedor seleccionado.
- La misma paleta de colores que los badges del panel (`payment-paypal`, `payment-none`).

---

## Flujo del admin (con mejoras)

```
[Editar conductor]
        ↓
Dialog abierto con campos actuales prellenados
        ↓
Admin selecciona proveedor (PayPal)
    → Badge azul "PayPal" aparece junto al selector
        ↓
Admin escribe https://paypal.me/usuario
    → Indicador: ✓ Enlace válido (verde)
    → QR preview aparece (120×120) con el enlace codificado
    → Botón "Probar →" se activa
        ↓
Admin pulsa "Probar →" (opcional)
    → Nueva pestaña con el enlace de PayPal
        ↓
Admin pulsa "Guardar"
    → Validación frontend (ya existente)
    → UPDATE a Supabase si válido
    → Dialog se cierra, tarjeta se actualiza
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `index.html` | Añadir en el dialog: `.url-validation-hint`, `.qr-preview-box`, botón `testLinkBtn` |
| `style.css` | Estilos para validación, QR preview, botón test |
| `app.js` | `updatePaymentUrlPreview()`, debounce, event listeners, `testLinkBtn` en `els` |

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Columnas/RLS de Supabase

## Criterios de aceptación

- [ ] Indicador verde "✓ Enlace válido" al introducir URL PayPal correcta.
- [ ] Indicador rojo "✗ El enlace no parece de PayPal" para URL inválida con proveedor PayPal.
- [ ] QR preview visible en el dialog con URL válida.
- [ ] QR preview oculto con URL vacía o inválida.
- [ ] Botón "Probar →" activo solo con URL válida.
- [ ] Botón "Probar →" abre enlace en nueva pestaña sin guardar nada.
- [ ] Badge de color junto al selector de proveedor.
- [ ] Validación existente de Sprint 3A sigue funcionando al guardar.
- [ ] Sin claves secretas. Sin PayPal API. Sin procesamiento de pagos.
- [ ] Stripe Connect aparcado, sin modificar.

## Siguiente paso (Sprint 3C)
Añadir soporte para más proveedores de pago externo (Bizum, Revolut, transferencia bancaria). Plantilla de instrucciones por proveedor.
