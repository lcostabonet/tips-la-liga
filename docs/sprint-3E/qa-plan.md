# Sprint 3E QA Plan: Creación autoservicio de perfil de conductor

## Setup
- Cuenta A: usuario logueado **sin** fila en `driver_payment_profiles` (usuario de rankings normal).
- Cuenta B: usuario logueado **con** fila en `driver_payment_profiles` (conductor existente).
- Cuenta C: admin (`lluis15basket@hotmail.es`), con o sin perfil de conductor.

---

## T01 — Visibilidad de botones según estado del perfil

| Paso | Resultado esperado |
|---|---|
| Login con Cuenta A (sin perfil) | Botón "🎫 Crear mi perfil" visible en topbar |
| Verificar "🔗 Mi enlace" | NO visible para Cuenta A |
| Login con Cuenta B (con perfil) | Botón "🔗 Mi enlace" visible, "🎫 Crear mi perfil" NO visible |
| Login con Cuenta C (admin con perfil) | Botones "🚌 Conductores" y "🔗 Mi enlace" visibles |
| Logout | Ambos botones desaparecen |

---

## T02 — Abrir formulario de creación

| Paso | Resultado esperado |
|---|---|
| Pulsar "🎫 Crear mi perfil" (Cuenta A) | Sección de formulario abre |
| Verificar `display_name` prerelleno | Campo prerelleno con el nombre del ranking de Cuenta A |
| Verificar campos opcionales | Vacíos |
| Pulsar "← Volver" | Sección se cierra, vuelve a `appSection` |
| Verificar botón "🎫 Crear mi perfil" | Sigue visible (no se ha creado perfil) |

---

## T03 — Crear perfil correctamente

| Paso | Resultado esperado |
|---|---|
| Abrir formulario (Cuenta A) | Formulario visible |
| Editar nombre si se desea, pulsar "Crear perfil" | Toast "Perfil creado. Ahora añade tu método de pago." |
| Verificar topbar | "🎫 Crear mi perfil" desaparece, "🔗 Mi enlace" aparece |
| Verificar que "Mi enlace" se abre automáticamente | Sección de métodos de pago visible |
| Verificar en DB | Fila en `driver_payment_profiles` con `driver_id = auth.uid()`, `is_active = true`, `is_visible = false` |

---

## T04 — Conductor recién creado no aparece en "Dar propina"

| Paso | Resultado esperado |
|---|---|
| Abrir "Dar propina" tras crear perfil (Cuenta A) | Conductor NO aparece en la lista |
| Ir a "Mi enlace", activar toggle "Visible en Dar propina" | Toast "Ahora eres visible." |
| Abrir "Dar propina" de nuevo | Conductor aparece en la lista (sin métodos → "Sin método configurado") |

---

## T05 — Validación del formulario

| Paso | Resultado esperado |
|---|---|
| Borrar `display_name`, pulsar "Crear perfil" | Toast "El nombre público es obligatorio." — sin INSERT |
| Campo `display_name` solo espacios | Toast de error — sin INSERT |
| Campos opcionales vacíos + nombre válido | INSERT OK (`vehicle_info = null`, `route_info = null`) |

---

## T06 — Crear perfil con vehículo y ruta

| Paso | Resultado esperado |
|---|---|
| Rellenar los tres campos, crear perfil | INSERT con `vehicle_info` y `route_info` correctos |
| Abrir "Mi enlace" | Nombre, vehículo y ruta visibles (solo lectura) |

---

## T07 — Intentar crear perfil dos veces (mismo usuario)

| Paso | Resultado esperado |
|---|---|
| Cuenta A ya tiene perfil, no ve el botón de setup | Botón "🎫 Crear mi perfil" no visible → imposible en UI normal |
| Llamada directa a API (si se intentara) | RLS `dpp_conductor_insert_own` + UNIQUE `driver_id` → error de constraint |

---

## T08 — Añadir método de pago tras crear perfil

| Paso | Resultado esperado |
|---|---|
| Después de crear perfil, "Mi enlace" abre automáticamente | Lista de métodos vacía + botón "+ Añadir método" |
| Añadir PayPal con URL válida | Método guardado correctamente |
| Activar "Visible en Dar propina" | Toggle guardado |
| Abrir "Dar propina" | Conductor aparece con botón "Pagar con PayPal →" |

---

## T09 — Navegación no deja la sección de setup visible

| Paso | Resultado esperado |
|---|---|
| Abrir setup, pulsar "💸 Dar propina" | Setup oculto, sección "Dar propina" visible |
| Abrir setup, pulsar "🚌 Conductores" (admin) | Setup oculto, panel admin visible |
| Abrir setup, pulsar "🔗 Mi enlace" (si tiene perfil) | No aplicable — botones son mutuamente excluyentes |
| Logout mientras setup está abierto | Setup oculto, pantalla de login visible |

---

## T10 — Sin regresiones

| Componente | Verificar |
|---|---|
| Login/registro | Funcionan |
| Rankings y propinas CRUD | Funcionan |
| Panel admin (Conductores) | Sigue funcionando |
| "Dar propina" con conductores existentes | Sin cambios |
| "Mi enlace" con conductores existentes | Sin cambios |
| `supabase.sql` | Sin cambios |
| Edge Functions | Sin cambios |
| Stripe Connect | Aparcado, sin tocar |

---

## T11 — Seguridad

- `driver_id` en el INSERT siempre es `currentUser.id` — no hay campo editable en el formulario.
- RLS `dpp_conductor_insert_own` valida `driver_id = auth.uid()` independientemente del frontend.
- `is_active` y `is_visible` los fija el código, no el usuario directamente.
- Sin PayPal API, sin Revolut API, sin claves secretas.
