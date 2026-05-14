# Sprint 3D Frontend Plan: UI para múltiples métodos de pago

## Cambios por sección

---

## 1. Validación de dominios (`app.js`)

### Reemplazar `VALID_PAYPAL_DOMAINS` e `isValidPaymentUrl()` por un mapa extensible

```javascript
// Antes (Sprint 3B):
const VALID_PAYPAL_DOMAINS = ["https://paypal.me/", ...];
function isValidPaymentUrl(provider, url) { ... }

// Después (Sprint 3D):
const VALID_PAYMENT_DOMAINS = {
  paypal:  ["https://paypal.me/", "https://www.paypal.me/",
            "https://paypal.com/", "https://www.paypal.com/"],
  revolut: ["https://revolut.me/", "https://app.revolut.com/"],
};

function isValidPaymentUrl(provider, url) {
  if (!url) return null;
  const domains = VALID_PAYMENT_DOMAINS[provider];
  if (!domains) return true;  // proveedor desconocido: sin restricción
  return domains.some((d) => url.startsWith(d));
}
```

`VALID_PAYPAL_DOMAINS` se elimina. Las referencias existentes en `saveEditDriver()` y `saveDriverSelfProfile()` pasan a usar la nueva versión de `isValidPaymentUrl()` — sin cambio en la interfaz de la función.

---

## 2. "Dar propina" (`showDriverPayView`)

### Lógica de prioridad

```
driver.payment_methods (array de la vista, no nulo y no vacío)
  → Flujo multi-método Sprint 3D
driver.payment_url (columna legacy de Sprint 3A)
  → Flujo legacy Sprint 3A (sin cambios)
Ninguno
  → Aviso "Sin método configurado"
```

### UI multi-método

Cuando `driver.payment_methods` tiene entradas activas:

```
[QR del método seleccionado — 180×180]

Texto explicativo (si existe instrucción del método seleccionado)

[Pagar con PayPal →]    ← botón azul PayPal
[Pagar con Revolut →]   ← botón gris/violeta Revolut
```

**Comportamiento de los botones:**
- El QR se inicializa con el primer método de la lista (`display_order ASC`).
- Al pulsar "Pagar con X →": actualiza el QR con la URL de ese método Y abre `window.open(url, '_blank', 'noopener')`.
- No hay estado de "método seleccionado" persistente — cada clic es independiente.

**Sin chips de importe:** igual que en Sprint 3A, los chips se ocultan cuando hay pago externo. El importe de PayPal.me puede añadirse a la URL si el conductor lo configura en las instrucciones.

### Nuevos elementos HTML en `#driverPayView`

Sustituye el bloque `.external-pay-section` actual por uno que soporte múltiples métodos:

```html
<div class="external-pay-section hidden">
  <p class="payment-instructions help"></p>
  <div class="payment-methods-list"></div>
  <p class="payment-provider-notice help">
    🔗 El pago se completa en el proveedor externo. Esta app no procesa ni registra la transacción.
  </p>
</div>
```

El `div.payment-methods-list` se rellena dinámicamente con un botón por método.

---

## 3. Panel admin — gestión de métodos

### Cambio de flujo

El dialog `#editDriverDialog` actual gestiona un único método (campos planos). En Sprint 3D:
- Los campos legacy (`editPaymentProvider`, `editPaymentUrl`, etc.) se **ocultan del dialog** — ya no se usan para el nuevo flujo.
- Se añade un nuevo `<section id="driverMethodsSection">` (similar a `#driverSelfSection`).
- Desde la tarjeta del conductor en el panel admin, el botón "Editar" abre `#editDriverDialog` (datos básicos: nombre, vehículo, ruta, visibilidad) y aparece un nuevo botón "Métodos de pago" que abre `#driverMethodsSection`.

### `#driverMethodsSection` — admin

```
← Volver        🔗 Métodos de pago — [Nombre del conductor]

[Lista de métodos existentes]
  PayPal   https://paypal.me/...   [Editar] [Eliminar]
  Revolut  https://revolut.me/...  [Editar] [Eliminar]

[+ Añadir método]
```

El formulario de edición/creación de un método incluye:
- Selector de proveedor (PayPal / Revolut)
- Campo URL con validación en tiempo real (reutiliza `isValidPaymentUrl`)
- Badge de proveedor + indicador verde/rojo (reutiliza clases Sprint 3B)
- QR preview + botón "Probar enlace →" (reutiliza clases Sprint 3B)
- Campo de instrucciones
- Toggle "Activo"
- Botones Guardar / Cancelar

---

## 4. "Mi enlace" (`#driverSelfSection`)

Sustituye los campos planos actuales por gestión de la tabla `driver_payment_methods`.

La sección pasa de mostrar un formulario de campo único a una lista de métodos del conductor, igual que la vista admin pero limitada a los propios métodos.

```
← Volver        🔗 Mi enlace de propinas

[Lista de métodos propios]
  PayPal   https://paypal.me/usuario   [Editar] [Eliminar]
  Revolut  (sin configurar)            [+ Añadir]

[+ Añadir método]

Tips La Liga no procesa pagos...
```

### Funciones afectadas

| Función actual | Cambio en Sprint 3D |
|---|---|
| `loadDriverSelfProfile()` | Añadir carga de `driver_payment_methods` propios |
| `showDriverSelfSection()` | Renderizar lista de métodos en lugar de campos planos |
| `saveDriverSelfProfile()` | Sustituir por `insertDriverMethod()` / `updateDriverMethod()` / `deleteDriverMethod()` |
| `updateSelfUrlPreview()` | Reutilizada para el formulario inline de método |

---

## 5. Nuevas funciones en `app.js`

| Función | Descripción |
|---|---|
| `loadDriverMethods(driverId)` | SELECT de `driver_payment_methods` para un conductor (admin) |
| `loadSelfMethods()` | SELECT de `driver_payment_methods` para el usuario actual |
| `insertDriverMethod(driverId, data)` | INSERT nuevo método |
| `updateDriverMethod(methodId, data)` | UPDATE método existente |
| `deleteDriverMethod(methodId)` | DELETE método |
| `renderMethodList(methods, targetEl, driverId)` | Renderiza lista de métodos en un contenedor |
| `showMethodForm(methodId, driverId, targetEl)` | Muestra formulario inline de edición/creación |
| `showDriverMethodsSection(driverDataset)` | Abre sección de métodos del admin para un conductor |

---

## 6. Nuevos estilos CSS

| Clase | Propósito |
|---|---|
| `.payment-methods-list` | Lista vertical de botones de método en "Dar propina" |
| `.payment-method-btn` | Botón base de método de pago |
| `.payment-method-btn.paypal` | Botón PayPal (azul `#009cde`) |
| `.payment-method-btn.revolut` | Botón Revolut (violeta `#7c3aed`) |
| `.method-list-item` | Fila de método en panel admin / "Mi enlace" |
| `.method-list-item .method-actions` | Botones editar/eliminar por método |

---

## 7. Compatibilidad con Sprint 3A durante la transición

`showDriverPayView()` comprueba en este orden:
1. `driver.payment_methods` (array no nulo y no vacío) → flujo multi-método
2. `driver.payment_url` (legacy) → flujo Sprint 3A sin cambios
3. Ninguno → aviso

`loadPublicDrivers()` actualiza su SELECT para incluir `payment_methods` en la lista de campos:
```javascript
.select("id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions, payment_methods")
```
