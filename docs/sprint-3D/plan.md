# Sprint 3D Plan: Múltiples métodos de pago externos por conductor

## Objetivo
Pasar de un modelo de pago único por conductor (Sprint 3A) a un modelo flexible donde cada conductor puede tener varios métodos activos simultáneamente, empezando por PayPal y Revolut.

## Contexto

### Estado actual (Sprint 3A–3C)
`driver_payment_profiles` tiene tres columnas planas:
- `payment_provider` — un solo proveedor
- `payment_url` — un solo enlace
- `payment_instructions` — texto libre

Esto solo permite un método de pago activo por conductor.

### Problema
Un conductor que usa tanto PayPal como Revolut no puede configurar ambos. El admin tampoco puede activar varios métodos para un conductor.

### Solución
Nueva tabla `driver_payment_methods` — relación N:1 con el conductor. Cada fila es un método de pago activo. Las columnas planas de Sprint 3A se mantienen como campo de compatibilidad durante la migración y se eliminan en un sprint posterior.

---

## Proveedores soportados en Sprint 3D

| `provider` | Dominios válidos | Formato de enlace |
|---|---|---|
| `paypal` | `paypal.me`, `www.paypal.me`, `paypal.com`, `www.paypal.com` | `https://paypal.me/usuario` |
| `revolut` | `revolut.me`, `app.revolut.com` | `https://revolut.me/usuario` |

Estructura diseñada para añadir `bizum`, `transferencia`, `stripe` en sprints futuros.

---

## Alcance

### Incluye
- Nueva tabla `driver_payment_methods` con RLS, constraint de dominios por proveedor y trigger `updated_at`.
- Vista pública `public_driver_profiles` actualizada con columna `payment_methods` (JSON array de métodos activos del conductor).
- Migración de datos: copia de `payment_provider/url/instructions` → `driver_payment_methods`.
- "Dar propina": muestra un botón por método activo del conductor; QR se actualiza al seleccionar método.
- Panel admin: gestión de métodos por conductor (añadir, editar, eliminar).
- "Mi enlace": gestión de métodos propios por conductor (sustituye los campos planos).
- Validación de dominios extendida: PayPal (existente) + Revolut.
- Compatibilidad regresiva: si `payment_methods` está vacío, la app usa `payment_url` de las columnas legacy.

### Excluye
- Eliminar columnas `payment_provider/url/instructions` de `driver_payment_profiles` (limpieza Sprint 3E).
- PayPal API, Revolut API.
- Claves secretas.
- Procesamiento de pagos.
- Stripe Connect (aparcado).
- Edge Functions nuevas o modificadas.

---

## Modelo de datos

```
driver_payment_profiles (existente)
  └── id (uuid)
  └── driver_id
  └── payment_provider  ← legacy, se vacía tras migración
  └── payment_url       ← legacy
  └── payment_instructions ← legacy

driver_payment_methods (nueva)
  └── id (uuid)
  └── driver_id → auth.users(id)
  └── provider  (paypal | revolut | ...)
  └── payment_url
  └── instructions
  └── is_active
  └── display_order
  └── UNIQUE (driver_id, provider)
```

---

## Flujo del cliente en "Dar propina"

```
Seleccionar conductor
        ↓
payment_methods = array de métodos activos (de la vista)
        ↓
Si array no vacío:
  Mostrar QR del primer método
  Mostrar botón por cada método: "Pagar con PayPal →", "Pagar con Revolut →"
  Al pulsar un botón:
    → Actualizar QR con URL del método pulsado
    → window.open(url, '_blank', 'noopener')
        ↓
Si array vacío Y payment_url legacy existe:
  Flujo existente (compatibilidad Sprint 3A)
        ↓
Si ambos vacíos:
  Aviso "Sin método de pago configurado"
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `supabase.sql` | Nueva tabla, RLS, constraint, migración, vista actualizada |
| `app.js` | Validación extendida, render multi-método, gestión de métodos |
| `index.html` | Sección de gestión de métodos en admin y "Mi enlace" |
| `style.css` | Estilos para lista de métodos y botones por proveedor |

## Archivos a NO modificar
- Edge Functions
- Stripe Connect

---

## Criterios de aceptación

- [ ] Un conductor puede tener PayPal y Revolut activos al mismo tiempo.
- [ ] "Dar propina" muestra un botón por método activo.
- [ ] QR se actualiza al seleccionar método.
- [ ] Validación de dominio Revolut activa en frontend y DB.
- [ ] Admin puede añadir, editar y eliminar métodos de cualquier conductor.
- [ ] Conductor puede gestionar sus propios métodos desde "Mi enlace".
- [ ] Datos de Sprint 3A migrados a la nueva tabla.
- [ ] Compatibilidad regresiva: conductores con `payment_url` legacy siguen funcionando.
- [ ] Sin PayPal API, sin Revolut API, sin claves secretas.
- [ ] Stripe Connect intacto.

## Siguiente paso (Sprint 3E)
Limpieza: eliminar columnas legacy `payment_provider/url/instructions` de `driver_payment_profiles`. Añadir `bizum` como tercer proveedor.
