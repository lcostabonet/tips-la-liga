# Sprint 3E Checklist: Creación autoservicio de perfil de conductor

## Estado general
- [ ] Sprint iniciado
- [ ] Código implementado
- [ ] Revisión QA completada
- [ ] Sprint aprobado

---

## HTML

- [ ] `#driverSetupBtn` añadido en topbar entre `#adminBtn` y `#driverLinkBtn`
- [ ] `#driverSetupBtn` nace con clase `hidden`
- [ ] `#driverSetupSection` añadida después de `#driverSelfSection`
- [ ] Formulario `#driverSetupForm` con campos: `setupDisplayName` (required), `setupVehicleInfo`, `setupRouteInfo`
- [ ] Botón "← Volver" con id `#backFromSetupBtn`
- [ ] Botón "Cancelar" con id `#cancelSetupBtn`
- [ ] Disclaimer visible en el formulario

## CSS

- [ ] Sin clases nuevas — reutiliza `.driver-self-header`, `.driver-self-card`, `.disclaimer-box` de Sprint 3C

## `els` en `app.js`

- [ ] `driverSetupBtn: $("#driverSetupBtn")`
- [ ] `driverSetupSection: $("#driverSetupSection")`
- [ ] `backFromSetupBtn: $("#backFromSetupBtn")`
- [ ] `driverSetupForm: $("#driverSetupForm")`
- [ ] `setupDisplayName: $("#setupDisplayName")`
- [ ] `setupVehicleInfo: $("#setupVehicleInfo")`
- [ ] `setupRouteInfo: $("#setupRouteInfo")`

## `onAuthStateChanged()`

- [ ] `els.driverSetupSection.classList.add("hidden")` añadido al inicio
- [ ] `els.driverSetupBtn.classList.add("hidden")` añadido en el bloque de logout
- [ ] En login: si `driverSelfProfile` → mostrar `driverLinkBtn`; si no → mostrar `driverSetupBtn`
- [ ] Los dos botones nunca visibles simultáneamente

## Navegación

- [ ] `showTipSection()` oculta `#driverSetupSection`
- [ ] `showAdminSection()` oculta `#driverSetupSection`
- [ ] `showDriverSelfSection()` oculta `#driverSetupSection`
- [ ] `showDriverMethodsSection()` oculta `#driverSetupSection`

## `setupEvents()`

- [ ] Listener `driverSetupBtn` → `showDriverSetupSection`
- [ ] Listener `backFromSetupBtn` → `hideDriverSetupSection`
- [ ] Listener `driverSetupForm submit` → `saveDriverProfile`

## `showDriverSetupSection()`

- [ ] Guarda `if (!currentUser) return`
- [ ] Oculta todas las secciones antes de mostrarse
- [ ] Prerrellena `setupDisplayName` con `currentProfile?.display_name || ""`
- [ ] Limpia `setupVehicleInfo` y `setupRouteInfo`

## `hideDriverSetupSection()`

- [ ] Oculta `#driverSetupSection`
- [ ] Vuelve a `appSection` si hay sesión activa

## `saveDriverProfile()`

- [ ] Guarda `if (!currentUser) return` tras `event.preventDefault()`
- [ ] Valida que `displayName` no esté vacío → toast si falta
- [ ] INSERT a `driver_payment_profiles` con:
  - `driver_id: currentUser.id`
  - `display_name: <valor del campo>`
  - `vehicle_info: <valor o null>`
  - `route_info: <valor o null>`
  - `is_active: true`
  - `is_visible: false`
- [ ] Tras INSERT exitoso: `loadDriverSelfProfile()` actualiza `driverSelfProfile`
- [ ] Tras INSERT exitoso: `driverSetupBtn` oculto, `driverLinkBtn` visible
- [ ] Tras INSERT exitoso: `showDriverSelfSection()` se abre automáticamente
- [ ] Toast "Perfil creado. Ahora añade tu método de pago."
- [ ] Error de DB (ej. UNIQUE violation): toast con el error, sin crash

## Comportamiento correcto

- [ ] Usuario sin perfil: ve `driverSetupBtn`, no ve `driverLinkBtn`
- [ ] Usuario con perfil: ve `driverLinkBtn`, no ve `driverSetupBtn`
- [ ] Admin con perfil: ve `adminBtn` Y `driverLinkBtn` (puede tener los dos)
- [ ] Admin sin perfil: ve `adminBtn` Y `driverSetupBtn`
- [ ] Tras crear perfil: ve `driverLinkBtn` y "Mi enlace" se abre automáticamente
- [ ] `is_visible = false` → el conductor NO aparece en "Dar propina" hasta activarlo
- [ ] El conductor puede activarse desde "Mi enlace" → toggle `is_visible`

## Seguridad

- [ ] `driver_id = currentUser.id` — RLS `dpp_conductor_insert_own` lo verifica en DB
- [ ] Sin PayPal API, sin Revolut API
- [ ] Sin claves secretas
- [ ] Sin procesamiento de pagos
- [ ] `guard_stripe_fields` no interfiere (es BEFORE UPDATE, no INSERT)

## Sin regresiones

- [ ] "Dar propina" sigue funcionando
- [ ] Panel admin sigue funcionando
- [ ] "Mi enlace" sigue funcionando para conductores con perfil existente
- [ ] Rankings y propinas sin cambios
- [ ] `supabase.sql` sin cambios
- [ ] Edge Functions sin cambios

## Documentación

- [ ] `docs/sprint-3E/plan.md` entregado
- [ ] `docs/sprint-3E/handoff-dev.md` entregado
- [ ] `docs/sprint-3E/checklist.md` entregado (este archivo)
- [ ] `docs/sprint-3E/qa-plan.md` entregado
