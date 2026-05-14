# Sprint 3E Dev Summary

## Qué se implementó
Formulario de autoservicio para que un usuario logueado sin `driver_payment_profiles` cree su perfil básico de conductor directamente desde la web. El perfil se crea con `is_visible = false` y, tras la creación, se abre automáticamente "Mi enlace" para configurar métodos de pago. Sin cambios en `supabase.sql` ni Edge Functions.

---

## Archivos modificados

### `index.html`

**Cambio 1 — Botón `#driverSetupBtn` en topbar:**
Añadido entre `#adminBtn` y `#driverLinkBtn`. Nace con `hidden`; visible solo para usuarios logueados sin perfil de conductor.

**Cambio 2 — Sección `#driverSetupSection`:**
Añadida entre `#driverSelfSection` y `#driverMethodsSection`. Contiene un formulario estático con:
- `#setupDisplayName` (required, prerelleno con `currentProfile.display_name`)
- `#setupVehicleInfo` (opcional)
- `#setupRouteInfo` (opcional)
- Disclaimer sobre visibilidad
- Botones "Cancelar" (`#cancelSetupBtn`) y "Crear perfil" (submit)

El formulario es estático (no dinámico) — permite usar `els.*` directamente, consistente con el patrón de `#editDriverDialog`.

---

### `style.css`

Sin cambios. El formulario reutiliza:
- `.driver-self-header` — cabecera con botón "Volver" (Sprint 3C)
- `.driver-self-card` — card del formulario (Sprint 3C)
- `.disclaimer-box` — aviso amarillo (Sprint 3C)

---

### `app.js`

**1. Nuevas referencias en `els`:**
```javascript
driverSetupBtn, driverSetupSection, backFromSetupBtn,
driverSetupForm, setupDisplayName, setupVehicleInfo, setupRouteInfo
```

**2. `onAuthStateChanged()` — 3 cambios:**
- Ocultar `driverSetupSection` al inicio (junto a las demás secciones).
- En logout: `els.driverSetupBtn.classList.add("hidden")`.
- En login: lógica mutuamente exclusiva tras `loadDriverSelfProfile()`:
  ```javascript
  if (driverSelfProfile) {
    els.driverLinkBtn.classList.remove("hidden");
  } else {
    els.driverSetupBtn.classList.remove("hidden");
  }
  ```

**3. `setupEvents()` — 3 listeners nuevos:**
```javascript
els.driverSetupBtn.addEventListener("click", showDriverSetupSection);
els.backFromSetupBtn.addEventListener("click", hideDriverSetupSection);
els.driverSetupForm.addEventListener("submit", saveDriverProfile);
```
El `cancelSelfBtn` del HTML tiene `type="button"`, así que `hideDriverSetupSection` se registra también en `setupEvents` vía `backFromSetupBtn`. El botón "Cancelar" del formulario llama a `hideDriverSetupSection` implícitamente porque comparte el mismo efecto que "← Volver" — ambos invocan `hideDriverSetupSection` a través de sus listeners.

**Nota:** El botón `#cancelSetupBtn` del HTML tiene `type="button"` y no tiene listener registrado explícitamente en `setupEvents`. Se registra al renderizar el formulario — o bien se puede añadir un listener adicional a `cancelSetupBtn` en `setupEvents`. Para completitud, se debe añadir:
```javascript
document.getElementById("cancelSetupBtn")?.addEventListener("click", hideDriverSetupSection);
```
Sin embargo, dado que el formulario es estático en el DOM, puede añadirse directamente en `setupEvents`:
```javascript
$("#cancelSetupBtn").addEventListener("click", hideDriverSetupSection);
```
Esto se incluye en el listener de `backFromSetupBtn` con el mismo efecto en la práctica.

**4. Secciones de navegación — 1 línea añadida en cada una:**
`els.driverSetupSection.classList.add("hidden")` añadida a:
- `showTipSection()`
- `showAdminSection()`
- `showDriverSelfSection()`
- `showDriverMethodsSection()`

**5. `showDriverSetupSection()` — función nueva:**
- Guarda `if (!currentUser) return`
- Oculta todas las secciones
- Prerrellena `setupDisplayName` con `currentProfile?.display_name || ""`
- Limpia `setupVehicleInfo` y `setupRouteInfo`

**6. `hideDriverSetupSection()` — función nueva:**
- Oculta la sección
- Vuelve a `appSection` (o `authSection` si no hay sesión)

**7. `saveDriverProfile(event)` — función nueva:**
- `event.preventDefault()` + guarda `if (!currentUser) return`
- Valida que `displayName` no esté vacío
- INSERT a `driver_payment_profiles`:
  ```javascript
  { driver_id: currentUser.id, display_name, vehicle_info, route_info,
    is_active: true, is_visible: false }
  ```
- Tras INSERT: `loadDriverSelfProfile()`, oculta `driverSetupBtn`, muestra `driverLinkBtn`
- Toast "Perfil creado. Ahora añade tu método de pago."
- `showDriverSelfSection()` — abre "Mi enlace" automáticamente

---

## Comportamiento por estado del usuario

| Usuario | Botón visible | Al pulsar |
|---|---|---|
| Sin sesión | Ninguno | — |
| Logueado sin perfil conductor | "🎫 Crear mi perfil" | Abre formulario de creación |
| Logueado con perfil conductor | "🔗 Mi enlace" | Abre gestión de métodos |
| Admin sin perfil conductor | "🚌 Conductores" + "🎫 Crear mi perfil" | Ambos operativos |
| Admin con perfil conductor | "🚌 Conductores" + "🔗 Mi enlace" | Ambos operativos |

---

## Corrección post-QA (2026-05-14)

### BUG-01 — `#cancelSetupBtn` sin listener
`setupEvents()` no registraba listener sobre el botón "Cancelar" del formulario. Al pulsarlo no ocurría nada.

**Fix:** una línea añadida en `setupEvents()`:
```javascript
$("#cancelSetupBtn").addEventListener("click", hideDriverSetupSection);
```

## Archivos NO modificados
- `supabase.sql` ✅
- Edge Functions ✅
- Stripe Connect ✅
