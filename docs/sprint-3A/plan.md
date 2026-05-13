# Sprint 3A Plan: Enlaces de pago externos por conductor (PayPal)

## Contexto y decisión de arquitectura
Stripe Connect queda **aparcado** (no eliminado). Su infraestructura de base de datos y Edge Functions permanece intacta para retomarse en el futuro. Sprint 3A adopta un enfoque más simple: cada conductor tiene un enlace de pago externo que la app muestra como QR y botón. El pago ocurre completamente fuera de la app — no hay API, no hay secretos, no hay procesamiento interno.

## Objetivo del sprint
Permitir que cada conductor tenga un enlace de pago externo configurable (PayPal.me en Sprint 3A). La sección "Dar propina" mostrará el QR del enlace y un botón que abre el enlace en el navegador del cliente. El admin puede configurar el enlace de cada conductor desde el panel existente.

## Alcance

### Incluye
- 3 columnas nuevas en `driver_payment_profiles`: `payment_provider`, `payment_url`, `payment_instructions`.
- Actualización de la vista pública `public_driver_profiles` para exponer esas 3 columnas.
- Sección "Dar propina": muestra QR del `payment_url`, badge del proveedor y botón "Pagar con PayPal".
- Panel admin: formulario de edición ampliado con los 3 campos nuevos.
- Instrucciones de pago por conductor (texto libre mostrado al cliente).
- Soporte para PayPal.me y URLs de pago de PayPal estándar.

### Excluye explícitamente
- PayPal API, OAuth, webhooks de PayPal.
- Claves secretas de ningún tipo.
- Procesamiento de pagos dentro de la app.
- Registro de pagos en base de datos.
- Stripe Connect activo (queda aparcado, no eliminado).
- Dinero real manejado por el código.

---

## Proveedores soportados en Sprint 3A

| `payment_provider` | Ejemplo de `payment_url` | Formato |
|---|---|---|
| `paypal` | `https://paypal.me/username/10` | PayPal.me con cantidad opcional |
| `paypal` | `https://www.paypal.com/paypalme/username` | URL alternativa PayPal |
| `null` | — | Sin método configurado (muestra aviso) |

Estructura diseñada para añadir `bizum`, `revolut`, `stripe` en sprints futuros sin cambios de esquema.

---

## Flujo de pago (cliente)

```
[Dar propina] → Seleccionar conductor
        ↓
Si conductor tiene payment_url:
  Mostrar QR del payment_url
  Mostrar badge "PayPal"
  Mostrar payment_instructions (si existe)
  Mostrar botón "Pagar con PayPal →"
        ↓
  Cliente pulsa botón → window.open(payment_url, '_blank')
  [Pago se completa en PayPal, fuera de la app]
        ↓
Si conductor NO tiene payment_url:
  Mostrar QR demo (fallback actual)
  Mostrar aviso "Este conductor no tiene método de pago configurado"
```

## Flujo de configuración (admin)

```
[🚌 Conductores] → panel admin
        ↓
"Editar" conductor → dialog
        ↓
Seleccionar proveedor: [PayPal | Sin configurar]
Introducir payment_url: https://paypal.me/username
Introducir instrucciones (opcional): "Pon tu nombre en el concepto"
        ↓
Guardar → UPDATE driver_payment_profiles via Supabase client
        ↓
El conductor aparece con badge "PayPal" y QR real
```

---

## Relación con Stripe Connect (aparcado)

| Componente | Estado en Sprint 3A |
|---|---|
| Columnas Stripe en `driver_payment_profiles` | Intactas, sin eliminar |
| Edge Functions de Stripe Connect | Desplegadas, sin modificar |
| Panel admin — botones Onboarding/Refresh | Se pueden mantener o ocultar |
| `guard_stripe_fields` trigger | Sigue activo, protege campos Stripe |
| `payment_provider = 'stripe'` | Reservado para cuando Stripe Connect se reactive |

Los campos `payment_provider` y `payment_url` coexisten con los campos Stripe. En el futuro, si `payment_provider = 'stripe'` y `charges_enabled = true`, la app podría retomar el flujo de Stripe Checkout.

---

## Criterios de aceptación

- [ ] Columnas `payment_provider`, `payment_url`, `payment_instructions` añadidas a `driver_payment_profiles`.
- [ ] Vista pública expone los 3 campos nuevos (sin exponer datos Stripe).
- [ ] Admin puede configurar el enlace PayPal de un conductor desde el panel.
- [ ] "Dar propina" muestra QR real del `payment_url` si existe.
- [ ] Botón "Pagar con PayPal" abre el enlace en nueva pestaña.
- [ ] `payment_instructions` se muestra al cliente si existe.
- [ ] Si no hay `payment_url`, se muestra un aviso al cliente.
- [ ] Sin claves secretas en el código.
- [ ] `isMock: true` funciona correctamente (MOCK_DRIVERS nunca abren URLs externas).
- [ ] Stripe Connect no se elimina del código ni de la base de datos.

---

## Archivos a modificar

| Archivo | Qué cambia |
|---|---|
| `supabase.sql` | 3 columnas nuevas + actualizar vista + migracion |
| `index.html` | Elementos UI en "Dar propina" + formulario admin ampliado |
| `style.css` | Badge de proveedor, botón de pago externo |
| `app.js` | Lógica de pago externo, edición admin, render de conductor |

## Siguiente paso (Sprint 3B)
Añadir soporte para más proveedores (Bizum, Revolut, transferencia bancaria). Opcionalmente añadir una página pública `/tip/:slug` real alojada en GitHub Pages.
