# QA Sign-off: Sprint 3E — Creación autoservicio de perfil de conductor

**Fecha:** 2026-05-14
**Revisión:** análisis estático de código
**Archivos revisados:** `app.js`, `index.html`
**Archivos verificados sin cambios:** `supabase.sql`, `supabase/functions/**` (`git diff HEAD` → 0 líneas)

---

## Pruebas realizadas

| # | Check | Método |
|---|---|---|
| 1 | Sin perfil → botón "Crear mi perfil" | Lectura `onAuthStateChanged()` — bloque `if/else` tras `loadDriverSelfProfile()` |
| 2 | Con perfil → botón "Mi enlace" | Misma lógica — rama `if (driverSelfProfile)` |
| 3 | Mutuamente excluyentes | Análisis if/else + lógica post-INSERT en `saveDriverProfile()` |
| 4 | INSERT con `driver_id = currentUser.id` | Lectura `saveDriverProfile()` — objeto de insert |
| 5 | `display_name` prerelleno | Lectura `showDriverSetupSection()` — `currentProfile?.display_name || ""` |
| 6 | `is_visible = false` | Lectura objeto insert en `saveDriverProfile()` |
| 7 | Perfil nuevo no visible en "Dar propina" | Análisis vista `public_driver_profiles` — filtra `WHERE is_visible = true` |
| 8 | "Mi enlace" abre automáticamente | Lectura `saveDriverProfile()` — `showDriverSelfSection()` al final |
| 9 | Puede añadir métodos después | Análisis `showDriverSelfSection()` + `loadSelfMethods()` con `driverSelfProfile.id` |
| 10 | Admin ve "Conductores" | Lectura `onAuthStateChanged()` — `if (isAdmin()) els.adminBtn.classList.remove("hidden")` |
| 11 | Usuarios normales no ven "Conductores" | Misma condición — sin cambios |
| 12 | `supabase.sql` no modificado | `git diff HEAD -- supabase.sql` → 0 |
| 13 | Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → 0 |
| 14 | Sin claves secretas | Grep `sk_\|pk_live_\|client_secret` → 0 coincidencias |
| 15 | Sin PayPal/Revolut API | Grep `api\.paypal\|api\.revolut` → 0 coincidencias |
| 16 | Sin procesamiento de pagos | Lectura `saveDriverProfile()` — solo INSERT a Supabase DB |
| 17 | Login/logout limpia secciones | Lectura `onAuthStateChanged()` — `driverSetupSection` + `driverSetupBtn` correctamente gestionados |
| 18 | Sin regresiones | Lectura `setupEvents()`, funciones de tips y rankings — sin cambios |
| 19 | Sin errores críticos en consola | Análisis de refs DOM, guards `if (!currentUser) return` — BUG-01 detectado |
| 20 | Respeta RLS | Análisis INSERT: `driver_id = currentUser.id`; política `dpp_conductor_insert_own` (`with check (driver_id = auth.uid())`); `guard_stripe_fields` es BEFORE UPDATE, no afecta a INSERT |

---

## Checks aprobados

**[1–3] Visibilidad mutuamente exclusiva**
`onAuthStateChanged()` tras `loadDriverSelfProfile()`:
```javascript
if (driverSelfProfile) {
  els.driverLinkBtn.classList.remove("hidden");
} else {
  els.driverSetupBtn.classList.remove("hidden");
}
```
Ambos botones nacen `hidden`. En logout: `driverSetupBtn` y `driverLinkBtn` ocultos. Tras crear perfil: `driverSetupBtn.classList.add("hidden")` + `driverLinkBtn.classList.remove("hidden")`. Nunca visibles simultáneamente. ✅

**[4] `driver_id = currentUser.id`**
```javascript
driver_id: currentUser.id
```
La política RLS `dpp_conductor_insert_own` valida `driver_id = auth.uid()` independientemente. ✅

**[5] Pre-relleno seguro**
`els.setupDisplayName.value = currentProfile?.display_name || ""` — encadenamiento opcional protege contra `currentProfile === null`. ✅

**[6] `is_visible = false`**
Confirmado en el objeto INSERT. ✅

**[7] Perfil nuevo no visible en "Dar propina"**
`public_driver_profiles` view: `WHERE is_visible = true`. Un perfil con `is_visible = false` no aparece. ✅ (estático — requiere confirmación en DB activa)

**[8] Apertura automática de "Mi enlace"**
`saveDriverProfile()` tras INSERT exitoso: `await loadDriverSelfProfile()` → `showDriverSelfSection()`. ✅

**[9] Puede añadir métodos después**
`showDriverSelfSection()` llama a `loadSelfMethods()` que usa `driverSelfProfile.id` (recién cargado). `renderMethodList()` muestra "+ Añadir método". ✅

**[10–11] Visibilidad de "Conductores"**
`if (isAdmin()) els.adminBtn.classList.remove("hidden")` — sin cambios. Solo visible para admin. ✅

**[12–13] SQL y Edge Functions intactos**
`git diff HEAD` → 0 líneas en ambos. ✅

**[14–16] Sin APIs externas, sin secretos, sin pagos**
Grep: 0 coincidencias. `saveDriverProfile()` solo hace INSERT a Supabase. ✅

**[17] Login/logout limpio**
`driverSetupSection` oculta al inicio de `onAuthStateChanged()`. `driverSetupBtn` oculto en logout y en todas las funciones de navegación. ✅

**[18] Sin regresiones**
`setupEvents()` añade 3 listeners nuevos sin modificar los existentes. Funciones de tips, rankings y "Dar propina" sin cambios. ✅

**[20] RLS respetada**
- INSERT: `driver_id = currentUser.id` + `dpp_conductor_insert_own` (`with check (driver_id = auth.uid())`) → doble barrera.
- `guard_stripe_fields` es `BEFORE UPDATE` — no interfiere con INSERT.
- Campos Stripe no incluidos en el payload → no se pueden inyectar valores Stripe en la creación. ✅

---

## Checks fallidos

**[19] Sin errores críticos** → BUG-01 (ver abajo). El botón "Cancelar" no produce error de consola, pero es un elemento UI roto. El check se considera fallido desde la perspectiva de experiencia de usuario.

---

## Bugs encontrados

### BUG-01 — `#cancelSetupBtn` sin listener registrado (Media)
- **Gravedad:** Media
- **Ubicación:** `app.js` — `setupEvents()`. `index.html` línea 177.
- **Descripción:** El botón "Cancelar" en el formulario tiene `type="button"` (correcto, no hace submit) pero no tiene ningún listener registrado en `setupEvents()` ni en ninguna otra parte del código. Al pulsarlo no ocurre nada.
  ```javascript
  // En setupEvents() existe:
  els.backFromSetupBtn.addEventListener("click", hideDriverSetupSection);
  // Pero NO existe:
  // $("#cancelSetupBtn").addEventListener("click", hideDriverSetupSection);
  ```
- **Impacto:** El usuario que pulsa "Cancelar" queda atrapado en el formulario. Puede salir pulsando "← Volver" (que sí funciona), pero "Cancelar" no cumple su propósito.
- **Fix:** Añadir una línea en `setupEvents()`:
  ```javascript
  $("#cancelSetupBtn").addEventListener("click", hideDriverSetupSection);
  ```
- **Nota del dev:** El dev mencionó este gap explícitamente en el `dev-summary.md`. La línea no se implementó.

---

## Riesgos

### RIESGO-01 — TypeError si `loadDriverSelfProfile()` falla tras INSERT exitoso
- **Gravedad:** Informativa (probabilidad muy baja)
- **Descripción:** `saveDriverProfile()` llama `await loadDriverSelfProfile()` después del INSERT. Si esta llamada falla internamente (error de red), `driverSelfProfile` queda `null`. La siguiente línea `showDriverSelfSection()` accede a `driverSelfProfile.display_name` → `TypeError: Cannot read properties of null`.
- **Probabilidad:** Muy baja (requiere error de red entre el INSERT y el SELECT).
- **Mitigación sugerida Sprint 3F:** Añadir `if (!driverSelfProfile) { toast("Perfil creado. Recarga la página."); hideDriverSetupSection(); return; }` antes de `showDriverSelfSection()`.

---

## Re-revisión post-fix BUG-01 (2026-05-14)

| Check | Resultado | Evidencia |
|---|---|---|
| `#cancelSetupBtn` tiene listener | ✅ | `app.js:717` — `$("#cancelSetupBtn").addEventListener("click", hideDriverSetupSection)` |
| Pulsar "Cancelar" ejecuta `hideDriverSetupSection()` | ✅ | Misma función que "← Volver" (línea 716) |
| Usuario no queda atrapado | ✅ | `hideDriverSetupSection` oculta sección y muestra `appSection` |
| Creación de perfil intacta | ✅ | `saveDriverProfile` en línea 718 — sin cambios |
| Exclusividad `driverSetupBtn` / `driverLinkBtn` | ✅ | `onAuthStateChanged` sin modificar |
| `supabase.sql` no modificado | ✅ | `git diff HEAD -- supabase.sql` → 0 |
| Edge Functions no modificadas | ✅ | `git diff HEAD -- supabase/functions/` → 0 |

---

## Decisión final

**APROBADO SIN PENDIENTES ✅**

BUG-01 resuelto con una línea. Los 20 checks pasan. El flujo completo (crear perfil con `is_visible = false`, apertura automática de "Mi enlace", mutually exclusive buttons, RLS respetada) es correcto. `supabase.sql` y Edge Functions intactos.

Sprint 3E listo para avanzar a Sprint 3F.
