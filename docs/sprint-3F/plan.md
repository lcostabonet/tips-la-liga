# Sprint 3F Plan: Estabilización de múltiples métodos de pago y limpieza legacy

## Contexto

Sprint 3D introdujo `driver_payment_methods` como tabla principal de métodos de pago por conductor.
Sprint 3E añadió creación autoservicio de perfiles.
El modelo anterior (`payment_provider / payment_url / payment_instructions` en `driver_payment_profiles`) sigue presente como fallback y como fuente de datos del panel admin.

Sprint 3F estabiliza la convivencia entre ambos modelos, mejora la experiencia de usuario en estados vacíos y elimina código muerto de Sprint 3C que quedó sin borrar tras la reescritura de Sprint 3D.

---

## Objetivo

1. Limpiar código muerto de Sprint 3C (`updateSelfUrlPreview`, `saveDriverSelfProfile`).
2. Mejorar los mensajes de estado vacío en "Mi enlace" y "Dar propina".
3. Corregir RIESGO-01 de Sprint 3D (condición Stripe en `handleTipPayment`).
4. Ajustar el SELECT de `loadDriverSelfProfile()` para no pedir campos legacy que ya no usa.
5. Documentar qué partes del código siguen usando campos legacy y por qué se mantienen.

---

## Cambios planificados

### C01 — Eliminar código muerto de Sprint 3C (`app.js`)

Dos funciones quedaron sin caller tras la reescritura de `showDriverSelfSection()` en Sprint 3D:

| Función | Por qué es muerta | Línea aprox. |
|---|---|---|
| `updateSelfUrlPreview()` | Referencia elementos dinámicos (`selfPaymentProvider`, `selfPaymentUrl`) que ya no existen en `showDriverSelfSection()` | ~1334 |
| `saveDriverSelfProfile()` | El formulario que la invocaba fue reemplazado por `renderMethodList()` en Sprint 3D | ~1382 |
| `selfQrPreviewTimer` | Solo usada por `updateSelfUrlPreview()` | ~1332 |

**Fix:** eliminar las tres declaraciones.

---

### C02 — Limpiar SELECT de `loadDriverSelfProfile()` (`app.js`)

`loadDriverSelfProfile()` selecciona `payment_provider, payment_url, payment_instructions` (campos legacy).
`showDriverSelfSection()` ya no los usa — ahora usa `renderMethodList()` con datos de `driver_payment_methods`.

**Fix:** eliminar los tres campos del SELECT. Mantener `id, driver_id, display_name, is_visible`.

---

### C03 — Mejorar estado vacío en "Mi enlace" (`app.js`)

`renderMethodList()` cuando `methods.length === 0`:
```javascript
// Actual:
container.innerHTML = "<p class='help' style='margin-bottom:12px'>Sin métodos configurados.</p>";
```
Mensaje demasiado escueto. El conductor recién creado no sabe qué hacer.

**Fix:** mensaje más orientativo:
```
Aún no tienes métodos de pago.
Añade PayPal o Revolut para aparecer en "Dar propina".
```

---

### C04 — Mejorar mensaje en "Dar propina" sin métodos activos (`app.js`)

`showDriverPayView()` cuando `!hasExternalPay` y el conductor no es mock y no tiene slug:
```javascript
// Actual:
"Este conductor aún no tiene método de pago configurado."
```
Correcto, pero no orientativo para el conductor que ve su propia tarjeta.

**Fix:** mismo texto, añadir sugerencia visual con clase o texto más claro:
```
"Sin método de pago configurado aún."
```
(Cambio mínimo — no hay UI para conductores en esta sección.)

---

### C05 — Corregir RIESGO-01 de Sprint 3D: condición Stripe en `handleTipPayment()` (`app.js`)

`handleTipPayment()` activa la rama Stripe cuando:
```javascript
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url)
```
Si un conductor tiene `payment_methods` pero `payment_url` legacy es `null`, la condición es `true` y se intenta Stripe — aunque en la práctica `payTipBtn` está oculto cuando `hasExternalPay = true` (barrera implícita).

**Fix:** hacer la barrera explícita:
```javascript
if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url && !selectedDriver.payment_methods?.length)
```

---

## Alcance — qué NO cambia

- `supabase.sql` — sin cambios. Las columnas legacy se mantienen.
- Edge Functions — sin tocar.
- Panel admin "Editar" (`saveEditDriver`) — sigue escribiendo en legacy fields. Correcto: es el mecanismo de migración manual hasta que se decida eliminar las columnas.
- `renderDriverProfiles()` — sigue mostrando badge de `payment_provider` legacy. Correcto.
- `showDriverPayView()` flujo legacy — fallback a `payment_url` si no hay `payment_methods`. Se mantiene.
- `loadPublicDrivers()` — sigue pidiendo campos legacy porque el flujo fallback los necesita.
- `index.html`, `style.css` — sin cambios.
- Stripe Connect — aparcado, sin tocar.

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `app.js` | C01, C02, C03, C04, C05 |

---

## Archivos no modificar

- `supabase.sql`
- `supabase/functions/**`
- `index.html`
- `style.css`

---

## Tareas del sprint

| ID | Descripción | Tipo |
|---|---|---|
| C01 | Eliminar `updateSelfUrlPreview()`, `saveDriverSelfProfile()`, `selfQrPreviewTimer` | Limpieza |
| C02 | Quitar campos legacy del SELECT en `loadDriverSelfProfile()` | Ajuste |
| C03 | Mejorar mensaje vacío en `renderMethodList()` | UX |
| C04 | Ajustar texto "sin método" en `showDriverPayView()` | UX |
| C05 | Corregir condición Stripe en `handleTipPayment()` | Fix |

---

## Resultado esperado

- Código de Sprint 3C completamente eliminado (no queda código inalcanzable).
- Conductores sin métodos ven mensajes claros sobre qué hacer.
- La condición de activación de Stripe es explícita y no depende de la ausencia de `payment_url` legacy.
- `loadDriverSelfProfile()` no solicita campos que no usa.
- Ningún cambio de comportamiento visible para usuarios que ya tienen métodos configurados.

---

## Siguiente sprint sugerido (Sprint 3G)

Una vez Sprint 3D esté ejecutado en Supabase y todos los conductores con datos legacy tengan sus métodos migrados a `driver_payment_methods`, se podrá ejecutar Sprint 3G:
- Eliminar columnas `payment_provider / payment_url / payment_instructions` de `driver_payment_profiles`.
- Simplificar `loadPublicDrivers()` y `renderDriverProfiles()`.
- Eliminar el flujo legacy de `showDriverPayView()`.
- Eliminar el dialog de edición legacy del panel admin o convertirlo en un formulario orientado a `driver_payment_methods`.
