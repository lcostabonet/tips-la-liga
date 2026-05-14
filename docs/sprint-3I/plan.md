# Sprint 3I Plan: Enlace directo y QR público por conductor

## Contexto

La app ya tiene `tip_link_slug` en `driver_payment_profiles` y lo expone en `public_driver_profiles`. El admin genera el slug mediante la Edge Function `generate-tip-link`. La experiencia pública "Dar propina" es bilingüe ES/EN (Sprint 3H).

Sprint 3I añade dos cosas independientes pero relacionadas:

1. **Deep link**: `?driver=<slug>` en la URL abre directamente la vista de propinas del conductor sin pasar por la lista.
2. **"Mi enlace" mejorado**: el conductor ve su propio enlace público de Tips La Liga con QR y botón de copiar.

---

## Análisis de estado previo

### Lo que ya existe y se reutiliza

| Elemento | Estado | Uso en Sprint 3I |
|---|---|---|
| `tip_link_slug` en `driver_payment_profiles` | ✅ columna existente | Base del deep link |
| `tip_link_slug` en `public_driver_profiles` view | ✅ expuesto | Query por slug |
| `anon` tiene SELECT en `public_driver_profiles` | ✅ grant existente | Deep link sin login |
| `loadPublicDrivers()` con SELECT completo | ✅ | Re-usar campos en `loadDriverBySlug()` |
| `showDriverPayView(driver)` | ✅ | Se llama con el conductor encontrado |
| Sistema i18n STRINGS/t() | ✅ Sprint 3H | Mensaje de error bilingüe |
| `showTipSection()` — muestra `#tipDriverSection` | ✅ | Reutilizado en el deep link |

### Lo que falta

| Elemento | Acción |
|---|---|
| `loadDriverSelfProfile()` no incluye `tip_link_slug` | Ampliar SELECT |
| No hay función que query un conductor por slug | Añadir `loadDriverBySlug(slug)` |
| No hay entrada de deep link en `init()` | Añadir lectura de `?driver=` en `init()` |
| `showDriverSelfSection()` no muestra enlace público | Ampliar template HTML |
| `STRINGS` no tiene clave `driverNotFound` | Añadir clave bilingüe |

### ¿Se necesita cambiar `supabase.sql`?

No. `tip_link_slug` ya existe, la vista ya lo expone, el anon ya tiene acceso. Sin cambios en SQL.

---

## Cambios planificados

### `app.js` — 5 grupos de cambios

**A01 — `loadDriverSelfProfile()`: ampliar SELECT**
Añadir `tip_link_slug` al SELECT (actualmente `id, driver_id, display_name, is_visible`).

**A02 — Nueva función `loadDriverBySlug(slug)`**
Query a `public_driver_profiles` donde `tip_link_slug = slug`. Usa `.maybeSingle()`. Retorna `null` si no hay resultado (conductor no visible, inactivo o slug inexistente).

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

**A03 — Nueva función `openDirectDriverView(slug)`**
Orquesta el deep link. No llama a `showTipSection()` (evita cargar la lista completa) — muestra manualmente `#tipDriverSection` con un estado de carga, ejecuta `loadDriverBySlug()`, y llama a `showDriverPayView()` o muestra error.

```javascript
async function openDirectDriverView(slug) {
  // Mostrar sección y estado de carga
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

**A04 — `init()`: leer `?driver=` y lanzar deep link**
Después del setup de auth, comprobar el parámetro URL:
```javascript
const slug = new URLSearchParams(window.location.search).get("driver");
if (slug) openDirectDriverView(slug);
```
Se ejecuta independientemente de si hay sesión activa. El deep link es público.

**A05 — `showDriverSelfSection()`: enlace público y QR**
Ampliar el template HTML para mostrar, si `driverSelfProfile.tip_link_slug` tiene valor:
- El URL completo del conductor: `<origin><pathname>?driver=<slug>`
- Un QR de ese URL (qrserver.com, 120×120)
- Un botón "Copiar enlace" que usa `navigator.clipboard.writeText()`

Si `tip_link_slug` es `null` o vacío: mensaje informativo invitando al admin a generar el slug.

**A06 — `STRINGS`: clave `driverNotFound`**
```javascript
es: { driverNotFound: "Conductor no encontrado o no disponible en este momento." }
en: { driverNotFound: "Driver not found or unavailable right now." }
```

---

### `style.css` — 1 bloque nuevo al final

Estilos para la sección de enlace público en "Mi enlace":
- `.driver-public-link-section`: contenedor con borde superior
- `.driver-link-box`: flex row con input de solo lectura + botón copiar
- `.driver-link-input`: input readonly, fondo muy claro, truncado con ellipsis
- `.driver-link-qr`: centrado, margen adecuado

---

### `index.html`

Sin cambios. `showDriverSelfSection()` es completamente dinámica (innerHTML). El HTML de la sección de enlace se inyecta desde JS.

---

## Alcance — qué NO cambia

- `supabase.sql` — sin cambios
- `supabase/functions/**` — sin cambios
- Panel admin `renderDriverProfiles()` — sin cambios (tiene su propio QR de Stripe `public_url`)
- Flujo PayPal/Revolut en "Dar propina" — sin cambios
- Sistema i18n — solo se añade una clave

---

## Comportamiento por caso de uso

| Caso | Comportamiento |
|---|---|
| URL sin `?driver=` | Flujo normal — sin cambios |
| `?driver=slug-válido` (conductor visible, con métodos) | Abre directamente la vista de propinas del conductor |
| `?driver=slug-válido` (conductor visible, sin métodos) | Muestra vista de pago con "Sin método configurado" |
| `?driver=slug-inválido` o conductor no visible | Muestra `t("driverNotFound")` en la sección |
| Conductor con `tip_link_slug` en "Mi enlace" | Muestra URL, QR y botón "Copiar enlace" |
| Conductor sin `tip_link_slug` en "Mi enlace" | Mensaje "Enlace no disponible. Pide al admin que lo genere." |

---

## Generación del URL del deep link

```javascript
const base = window.location.origin + window.location.pathname;
const publicUrl = `${base}?driver=${encodeURIComponent(slug)}`;
```

- Desarrollo local: `http://localhost:PORT/?driver=marta-g`
- GitHub Pages: `https://lcostabonet.github.io/tips-la-liga/?driver=marta-g`

No se hardcodea ninguna URL de producción.
