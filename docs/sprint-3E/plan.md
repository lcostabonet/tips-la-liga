# Sprint 3E Plan: Creación autoservicio de perfil de conductor

## Problema resuelto

Un usuario logueado no ve el botón "🔗 Mi enlace" si no tiene fila en `driver_payment_profiles`. La tabla fue diseñada en Sprint 2B como de gestión admin (poblada desde SQL Editor). Sprint 3E permite que cualquier usuario autenticado cree su propio perfil básico desde la web.

**No es un bug de visibilidad ni de RLS.** La lógica es correcta: si no hay perfil, no hay botón. Sprint 3E cierra el ciclo añadiendo la UI de creación.

---

## Contexto técnico

La política `dpp_conductor_insert_own` ya existe desde Sprint 2B:
```sql
create policy "dpp_conductor_insert_own"
  on public.driver_payment_profiles
  for insert to authenticated
  with check (driver_id = auth.uid());
```

El trigger `guard_stripe_fields` es `BEFORE UPDATE` — no afecta a INSERT. El conductor puede hacer INSERT de su propia fila con cualquier valor en `is_active`.

**No se necesitan cambios en `supabase.sql`.**

---

## Objetivo

Cuando un usuario logueado no tiene `driver_payment_profiles`, mostrarle un botón "🎫 Crear mi perfil" que le permita crear su fila básica e inmediatamente acceder a "Mi enlace" para configurar métodos de pago.

---

## Alcance

### Incluye
- Botón `#driverSetupBtn` en topbar, visible solo cuando el usuario logueado no tiene perfil.
- Sección `#driverSetupSection` con formulario de creación.
- Campos del formulario: `display_name` (prerelleno con el nombre del usuario en el ranking), `vehicle_info` y `route_info` opcionales.
- INSERT en `driver_payment_profiles` con `driver_id = currentUser.id`, `is_active = true`, `is_visible = false`.
- Tras la creación: ocultar `#driverSetupBtn`, mostrar `#driverLinkBtn`, abrir "Mi enlace" automáticamente.

### Excluye
- Creación de `driver_payment_methods` durante el setup (el conductor lo hace en "Mi enlace" después).
- Generación de slug o QR (sigue siendo acción admin via Edge Function).
- PayPal API, Revolut API.
- Claves secretas.
- Procesamiento de pagos.
- Stripe Connect.
- Edge Functions.
- Cambios en `supabase.sql`.

---

## Decisiones de diseño

### `is_visible = false` en la creación
El conductor no aparece en la lista pública "Dar propina" hasta que active al menos un método de pago y se haga visible manualmente desde "Mi enlace". Evita perfiles vacíos en la lista de conductores.

### `is_active = true` en la creación
El perfil está activo desde el inicio. Solo el admin puede desactivarlo. El trigger `guard_stripe_fields` bloquea cambios de `is_active` en UPDATE, no en INSERT, así que no hay problema.

### Pre-rellenar `display_name` con `currentProfile.display_name`
El usuario ya tiene un nombre público en el sistema de rankings (`profiles` table). Se usa como valor por defecto para el perfil de conductor. El usuario puede modificarlo antes de confirmar.

### Botón `#driverSetupBtn` mutuamente exclusivo con `#driverLinkBtn`
- Sin perfil → `driverSetupBtn` visible, `driverLinkBtn` oculto.
- Con perfil → `driverLinkBtn` visible, `driverSetupBtn` oculto.
- Nunca los dos visibles al mismo tiempo.

---

## Flujo del conductor

```
[Login]
        ↓
loadDriverSelfProfile() → null (sin perfil)
        ↓
Botón "🎫 Crear mi perfil" visible en topbar
        ↓
Conductor pulsa el botón
        ↓
Formulario prellenado con su nombre público actual
        ↓
Conductor confirma (o ajusta nombre/vehículo/ruta) y pulsa "Crear perfil"
        ↓
INSERT driver_payment_profiles:
  driver_id = auth.uid(), display_name = <valor>, is_active = true, is_visible = false
        ↓
loadDriverSelfProfile() → perfil recién creado
        ↓
driverSetupBtn oculto, driverLinkBtn visible
"Mi enlace" se abre automáticamente → conductor añade PayPal/Revolut
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `index.html` | Añadir `#driverSetupBtn` en topbar + `#driverSetupSection` con formulario estático |
| `app.js` | `els` nuevos, `onAuthStateChanged` actualizado, 3 funciones nuevas, navegación actualizada |
| `style.css` | Mínimo — reutiliza clases Sprint 3C (`.driver-self-card`, `.driver-self-header`, `.disclaimer-box`) |

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Stripe Connect

---

## Criterios de aceptación

- [ ] Usuario sin perfil ve "🎫 Crear mi perfil" al loguearse.
- [ ] Usuario con perfil no ve ese botón.
- [ ] El formulario prerrellena `display_name` con el nombre del ranking.
- [ ] Guardar crea la fila en `driver_payment_profiles` (`driver_id = auth.uid()`).
- [ ] Tras crear, aparece "🔗 Mi enlace" y desaparece "🎫 Crear mi perfil".
- [ ] "Mi enlace" se abre automáticamente tras la creación.
- [ ] `is_active = true`, `is_visible = false` en la fila creada.
- [ ] Si el usuario ya tiene perfil al loguearse, no aparece el botón de setup.
- [ ] Sin claves secretas. Sin PayPal/Revolut API. Sin procesamiento de pagos.
- [ ] Stripe Connect intacto.

## Siguiente paso (Sprint 3F)
Limpieza: eliminar columnas legacy `payment_provider/url/instructions` de `driver_payment_profiles`. Añadir Bizum como tercer proveedor en `driver_payment_methods`.
