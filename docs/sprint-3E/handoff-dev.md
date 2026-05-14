# Sprint 3E Handoff Dev: Creación autoservicio de perfil de conductor

## Contexto
La política `dpp_conductor_insert_own` ya existe en DB. No hay cambios en `supabase.sql`. Solo frontend: un botón nuevo en topbar, una sección con formulario estático y tres funciones en `app.js`. Reutiliza clases CSS de Sprint 3C.

---

## Paso 1: `index.html`

### 1.1 — Botón `#driverSetupBtn` en topbar

Añadir entre `#adminBtn` y `#driverLinkBtn`:

```html
<button id="adminBtn" class="btn ghost admin-btn hidden" type="button">🚌 Conductores</button>
<button id="driverSetupBtn" class="btn ghost driver-link-btn hidden" type="button">🎫 Crear mi perfil</button>
<button id="driverLinkBtn" class="btn ghost driver-link-btn hidden" type="button">🔗 Mi enlace</button>
```

### 1.2 — Sección `#driverSetupSection`

Añadir después de `#driverSelfSection` y antes de `#driverMethodsSection`:

```html
<section id="driverSetupSection" class="hidden">
  <div class="section-title driver-self-header">
    <button id="backFromSetupBtn" class="btn ghost" type="button">← Volver</button>
    <h2>🎫 Crear mi perfil de conductor</h2>
  </div>
  <div class="driver-self-card">
    <form id="driverSetupForm" class="form compact">
      <p class="help" style="margin-bottom:4px">
        Crea tu perfil para configurar tu enlace de PayPal o Revolut y aparecer en "Dar propina".
      </p>

      <label for="setupDisplayName">Nombre público</label>
      <input id="setupDisplayName" type="text" maxlength="60" required
             placeholder="Tu nombre como conductor" />
      <p class="help" style="margin-top:-4px">Es el nombre que verán los clientes.</p>

      <label for="setupVehicleInfo">Vehículo (opcional)</label>
      <input id="setupVehicleInfo" type="text" maxlength="80" placeholder="Ej. Bus 🚌" />

      <label for="setupRouteInfo">Ruta (opcional)</label>
      <input id="setupRouteInfo" type="text" maxlength="80" placeholder="Ej. Ruta aeropuerto" />

      <div class="disclaimer-box">
        Tu perfil no será visible en "Dar propina" hasta que actives al menos un método de pago
        y te hagas visible desde "Mi enlace".
      </div>

      <div class="dialog-actions" style="margin-top:8px">
        <button id="cancelSetupBtn" class="btn ghost" type="button">Cancelar</button>
        <button class="btn primary" type="submit">Crear perfil</button>
      </div>
    </form>
  </div>
</section>
```

---

## Paso 2: `style.css`

No se necesitan clases nuevas. El formulario reutiliza:
- `.driver-self-header` — cabecera con botón "Volver" (Sprint 3C)
- `.driver-self-card` — card del formulario (Sprint 3C)
- `.disclaimer-box` — aviso amarillo (Sprint 3C)
- `.form.compact`, `.dialog-actions`, `.btn.ghost`, `.btn.primary` — existentes

---

## Paso 3: `app.js`

### 3.1 — Nuevas referencias en `els`

```javascript
driverSetupBtn:     $("#driverSetupBtn"),
driverSetupSection: $("#driverSetupSection"),
backFromSetupBtn:   $("#backFromSetupBtn"),
driverSetupForm:    $("#driverSetupForm"),
setupDisplayName:   $("#setupDisplayName"),
setupVehicleInfo:   $("#setupVehicleInfo"),
setupRouteInfo:     $("#setupRouteInfo"),
```

### 3.2 — Actualizar `onAuthStateChanged()`

**Al inicio de la función** (junto a los demás hides):
```javascript
els.driverSetupSection.classList.add("hidden");
```

**En el bloque de logout** (junto a los demás hides):
```javascript
els.driverSetupBtn.classList.add("hidden");
```

**En el bloque de login** (tras `loadDriverSelfProfile()`):
```javascript
await loadDriverSelfProfile();
if (driverSelfProfile) {
  els.driverLinkBtn.classList.remove("hidden");
} else {
  els.driverSetupBtn.classList.remove("hidden");
}
```

Reemplaza el `if (driverSelfProfile) els.driverLinkBtn.classList.remove("hidden")` existente por esta versión extendida.

### 3.3 — Actualizar las funciones de navegación

Añadir `els.driverSetupSection.classList.add("hidden")` al inicio de:
- `showTipSection()`
- `showAdminSection()`
- `showDriverSelfSection()`
- `showDriverMethodsSection()`

### 3.4 — Nuevos listeners en `setupEvents()`

```javascript
els.driverSetupBtn.addEventListener("click", showDriverSetupSection);
els.backFromSetupBtn.addEventListener("click", hideDriverSetupSection);
els.driverSetupForm.addEventListener("submit", saveDriverProfile);
```

### 3.5 — Nueva función `showDriverSetupSection()`

```javascript
function showDriverSetupSection() {
  if (!currentUser) return;
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  els.driverSetupSection.classList.remove("hidden");

  // Pre-rellenar con el nombre del ranking si existe
  els.setupDisplayName.value = currentProfile?.display_name || "";
  els.setupVehicleInfo.value = "";
  els.setupRouteInfo.value = "";
}
```

### 3.6 — Nueva función `hideDriverSetupSection()`

```javascript
function hideDriverSetupSection() {
  els.driverSetupSection.classList.add("hidden");
  if (currentUser) els.appSection.classList.remove("hidden");
  else els.authSection.classList.remove("hidden");
}
```

### 3.7 — Nueva función `saveDriverProfile()`

```javascript
async function saveDriverProfile(event) {
  event.preventDefault();
  if (!currentUser) return;

  const displayName = els.setupDisplayName.value.trim();
  if (!displayName) { toast("El nombre público es obligatorio."); return; }

  const newProfile = {
    driver_id:    currentUser.id,
    display_name: displayName,
    vehicle_info: els.setupVehicleInfo.value.trim() || null,
    route_info:   els.setupRouteInfo.value.trim() || null,
    is_active:    true,
    is_visible:   false,
  };

  try {
    const { error } = await client
      .from("driver_payment_profiles")
      .insert(newProfile);
    if (error) throw error;

    await loadDriverSelfProfile();
    els.driverSetupBtn.classList.add("hidden");
    els.driverLinkBtn.classList.remove("hidden");
    toast("Perfil creado. Ahora añade tu método de pago.");
    showDriverSelfSection();
  } catch (err) {
    toast(err.message || "Error al crear el perfil.");
  }
}
```

Notas:
- `is_visible = false` — el conductor no aparece en "Dar propina" hasta que lo active desde "Mi enlace".
- `is_active = true` — perfil activo desde el inicio. El trigger `guard_stripe_fields` no afecta a INSERT.
- Tras el INSERT, `loadDriverSelfProfile()` carga la fila recién creada y actualiza `driverSelfProfile`.
- `showDriverSelfSection()` se abre automáticamente para que el conductor configure su primer método de pago.

---

## Casos límite

### Usuario ya tiene perfil y pulsa el botón de setup (no debería ser posible, pero por robustez)
En `saveDriverProfile()`, si ya existe una fila para ese `driver_id`, el INSERT fallará con error de constraint `UNIQUE (driver_id)` en `driver_payment_profiles`. El toast mostrará el error. Sin daño.

### Error de red durante el INSERT
`saveDriverProfile()` captura el error → toast. `driverSelfProfile` sigue siendo null → `driverSetupBtn` sigue visible.

### `currentProfile` es null (error previo cargando el perfil del ranking)
`els.setupDisplayName.value = currentProfile?.display_name || ""` — el campo queda vacío, el usuario lo rellena manualmente. La validación `if (!displayName)` lo requiere.

---

## Archivos a NO modificar
- `supabase.sql`
- Edge Functions
- Stripe Connect
