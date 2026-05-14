# Sprint 3I Handoff Dev

## Orden de implementación

1. `STRINGS` — añadir `driverNotFound`
2. `loadDriverSelfProfile()` — ampliar SELECT
3. `loadDriverBySlug(slug)` — función nueva
4. `openDirectDriverView(slug)` — función nueva
5. `init()` — leer `?driver=`
6. `showDriverSelfSection()` — sección de enlace público
7. `style.css` — estilos de enlace público

---

## Cambio 1 — `STRINGS`: clave `driverNotFound`

Añadir la clave en ambos idiomas, junto a las demás claves de `STRINGS`:

```javascript
// ES (después de noMethodNotice):
driverNotFound: "Conductor no encontrado o no disponible en este momento.",

// EN (después de noMethodNotice):
driverNotFound: "Driver not found or unavailable right now.",
```

---

## Cambio 2 — `loadDriverSelfProfile()`: ampliar SELECT

```javascript
// ANTES (línea ~1349):
.select("id, driver_id, display_name, is_visible")

// DESPUÉS:
.select("id, driver_id, display_name, is_visible, tip_link_slug")
```

`driverSelfProfile` pasa a incluir `tip_link_slug` (puede ser `null` si el admin aún no lo ha generado).

---

## Cambio 3 — Función nueva `loadDriverBySlug(slug)`

Añadir **antes de `loadPublicDrivers()`** (zona de funciones de carga de datos):

```javascript
async function loadDriverBySlug(slug) {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("public_driver_profiles")
      .select("id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions, payment_methods")
      .eq("tip_link_slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
```

Notas:
- `.maybeSingle()` — devuelve `null` sin error si no hay fila (conductor no existe, no visible o inactivo — la vista ya filtra `is_active = true AND is_visible = true`).
- SELECT idéntico al de `loadPublicDrivers()` — los campos que necesita `showDriverPayView()`.
- Funciona para `anon` — la vista tiene `grant select to anon`.

---

## Cambio 4 — Función nueva `openDirectDriverView(slug)`

Añadir **antes de `init()`** (al final del archivo, junto a las otras funciones de navegación):

```javascript
async function openDirectDriverView(slug) {
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverSetupSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  els.tipDriverSection.classList.remove("hidden");
  els.driverList.classList.remove("hidden");
  els.driverPayView.classList.add("hidden");
  els.driverList.innerHTML = `<p class='help' style='padding:16px'>${t("loading")}</p>`;

  const driver = await loadDriverBySlug(slug);
  if (!driver) {
    els.driverList.innerHTML = `<p class='help' style='padding:16px'>${t("driverNotFound")}</p>`;
    return;
  }

  const normalized = {
    id: driver.id,
    name: driver.display_name,
    bio: [driver.vehicle_info, driver.route_info].filter(Boolean).join(" · "),
    emoji: "🚌",
    slug: driver.tip_link_slug,
    tip_link_slug: driver.tip_link_slug,
    public_url: driver.public_url || null,
    isMock: false,
    payment_provider: driver.payment_provider || null,
    payment_url: driver.payment_url || null,
    payment_instructions: driver.payment_instructions || null,
    payment_methods: driver.payment_methods || null,
  };
  showDriverPayView(normalized);
}
```

Notas:
- No llama a `showTipSection()` — evita hacer la query de todos los conductores.
- Oculta explícitamente todas las secciones antes de mostrar `#tipDriverSection`.
- Estado de carga visible mientras se hace la query de Supabase.
- `normalized` replica exactamente la estructura que usa `showDriverPayView()`.

---

## Cambio 5 — `init()`: leer `?driver=`

```javascript
// ANTES:
async function init() {
  setupEvents();
  els.monthPicker.value = currentMonthKey();

  if (!isConfigured) { ... }

  const { data } = await client.auth.getSession();
  await onAuthStateChanged(data.session);

  client.auth.onAuthStateChange((_event, session) => {
    onAuthStateChanged(session);
  });
}

// DESPUÉS — añadir al final de init(), antes del cierre }:
  const driverSlug = new URLSearchParams(window.location.search).get("driver");
  if (driverSlug) openDirectDriverView(driverSlug);
```

Notas:
- Se ejecuta **después** de `onAuthStateChanged()` — el estado de auth ya está establecido, las secciones correctas ya son visibles.
- `openDirectDriverView()` las sobreescribe mostrando `#tipDriverSection`.
- Si no hay `?driver=` en la URL, `driverSlug` es `null` y el bloque se omite completamente.
- Funciona con y sin sesión activa.

---

## Cambio 6 — `showDriverSelfSection()`: sección de enlace público

Dentro del template `driverSelfContent.innerHTML`, añadir **entre `<div id="selfMethodList"></div>` y `<div class="disclaimer-box">`**:

```javascript
// Construir URL pública del conductor
const base = window.location.origin + window.location.pathname;
const selfPublicUrl = driverSelfProfile.tip_link_slug
  ? `${base}?driver=${encodeURIComponent(driverSelfProfile.tip_link_slug)}`
  : null;

const selfQrSrc = selfPublicUrl
  ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(selfPublicUrl)}`
  : null;
```

Y en el innerHTML del card, después de `<div id="selfMethodList"></div>`:

```html
${selfPublicUrl ? `
  <div class="driver-public-link-section">
    <p class="driver-link-label">🔗 Tu enlace de Tips La Liga</p>
    <div class="driver-link-box">
      <input id="selfLinkInput" class="driver-link-input" type="text" readonly
             value="${escapeHtml(selfPublicUrl)}" />
      <button id="selfCopyLinkBtn" class="btn ghost btn-sm" type="button">Copiar</button>
    </div>
    <div class="driver-link-qr">
      <img src="${selfQrSrc}" alt="QR de tu enlace" width="120" height="120" loading="lazy" />
      <p class="help" style="font-size:11px;margin:4px 0 0;text-align:center">
        Comparte este QR para recibir propinas directas
      </p>
    </div>
  </div>
` : `
  <p class="help" style="margin:8px 0 16px">
    Tu enlace público no está disponible aún. Pide al administrador que genere tu slug.
  </p>
`}
```

Y registrar el listener del botón copiar **después del innerHTML** (junto a los otros listeners de `showDriverSelfSection()`):

```javascript
const copyBtn = document.getElementById("selfCopyLinkBtn");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(selfPublicUrl);
      toast("¡Enlace copiado!");
    } catch {
      toast("No se pudo copiar. Cópialo manualmente.");
    }
  });
}
```

---

## Cambio 7 — `style.css`: estilos del enlace público

Añadir al final del archivo (bloque Sprint 3I):

```css
/* ===== Sprint 3I: Enlace directo y QR público ===== */

.driver-public-link-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.driver-link-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.driver-link-box {
  display: flex;
  gap: 8px;
  align-items: center;
}

.driver-link-input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  background: #fafafa;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.driver-link-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4px;
}

.driver-link-qr img {
  border-radius: 10px;
  border: 2px solid var(--line);
  background: white;
}
```

---

## Verificación post-implementación

- [ ] `STRINGS.es.driverNotFound` y `STRINGS.en.driverNotFound` presentes
- [ ] `loadDriverSelfProfile` SELECT incluye `tip_link_slug`
- [ ] `loadDriverBySlug(slug)` usa `.maybeSingle()` y retorna `null` en error
- [ ] `openDirectDriverView(slug)` oculta todas las secciones antes de mostrar `#tipDriverSection`
- [ ] `init()` lee `?driver=` y llama `openDirectDriverView` solo si hay valor
- [ ] `showDriverSelfSection()` calcula `selfPublicUrl` con `window.location.origin + pathname`
- [ ] Botón "Copiar" usa `navigator.clipboard.writeText()` con fallback toast
- [ ] `supabase.sql` sin modificar
- [ ] `index.html` sin modificar
- [ ] Edge Functions sin modificar
