# Sprint 3I Dev Summary

## Qué se implementó

Enlace directo por conductor (`?driver=<slug>`) y sección de enlace público con QR en "Mi enlace". Sin cambios en Supabase SQL, Edge Functions ni `index.html`.

---

## Archivos modificados

### `app.js` — 6 grupos de cambios

---

### A01 — `STRINGS`: clave `driverNotFound`

```javascript
es: { driverNotFound: "Conductor no encontrado o no disponible en este momento." }
en: { driverNotFound: "Driver not found or unavailable right now." }
```

Usada por `openDirectDriverView()` cuando el slug no existe o el conductor está oculto/inactivo.

---

### A02 — `loadDriverSelfProfile()`: SELECT ampliado

```javascript
// Antes:
.select("id, driver_id, display_name, is_visible")
// Después:
.select("id, driver_id, display_name, is_visible, tip_link_slug")
```

Necesario para construir el URL público del conductor en `showDriverSelfSection()`.

---

### A03 — Nueva función `loadDriverBySlug(slug)`

Query puntual a `public_driver_profiles` por `tip_link_slug`. Usa `.maybeSingle()` — retorna `null` sin error si el conductor no existe, está oculto o inactivo (la vista ya filtra `is_active = true AND is_visible = true`). Accesible por `anon` (grant existente desde Sprint 2B). Sin cambios en SQL.

```javascript
async function loadDriverBySlug(slug) {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("public_driver_profiles")
      .select("id, display_name, vehicle_info, route_info, tip_link_slug, public_url,
               payment_provider, payment_url, payment_instructions, payment_methods")
      .eq("tip_link_slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch { return null; }
}
```

---

### A04 — Nueva función `openDirectDriverView(slug)`

Orquesta el deep link. Oculta todas las secciones, muestra `#tipDriverSection` con estado de carga, llama a `loadDriverBySlug()` y:
- Si no encuentra conductor → muestra `t("driverNotFound")` en el idioma activo.
- Si encuentra → construye objeto `normalized` y llama `showDriverPayView(normalized)`.

No llama a `showTipSection()` para evitar cargar la lista completa de conductores innecesariamente.

El objeto `normalized` replica exactamente la estructura que `showDriverPayView()` espera (`isMock: false`, todos los campos de pago).

---

### A05 — `init()`: lectura de `?driver=`

```javascript
// Añadido al final de init(), después del listener de auth:
const driverSlug = new URLSearchParams(window.location.search).get("driver");
if (driverSlug) openDirectDriverView(driverSlug);
```

Se ejecuta después de `onAuthStateChanged()` — el estado de autenticación ya está establecido. Funciona con y sin sesión activa. Si no hay `?driver=` en la URL, `get()` devuelve `null` y el bloque se omite.

---

### A06 — `showDriverSelfSection()`: enlace público y QR

Antes de la plantilla HTML, se calculan:
```javascript
const selfBase = window.location.origin + window.location.pathname;
const selfPublicUrl = p.tip_link_slug
  ? `${selfBase}?driver=${encodeURIComponent(p.tip_link_slug)}`
  : null;
const selfQrSrc = selfPublicUrl
  ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(selfPublicUrl)}`
  : null;
```

En la plantilla, entre `#selfMethodList` y `.disclaimer-box`:
- **Con slug**: sección `.driver-public-link-section` con input readonly del URL, botón "Copiar" y QR 120×120.
- **Sin slug**: mensaje informativo invitando al admin a generar el slug.

Listener del botón "Copiar" registrado después del innerHTML:
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
Guard `if (copyBtn)` previene error cuando el conductor no tiene slug.

---

### `style.css` — bloque Sprint 3I

Estilos para la sección de enlace público en "Mi enlace":

| Selector | Propósito |
|---|---|
| `.driver-public-link-section` | Flex column, borde superior, separación visual |
| `.driver-link-label` | Etiqueta 14px bold |
| `.driver-link-box` | Flex row — input + botón |
| `.driver-link-input` | Input readonly: fondo `#fafafa`, color muted, `text-overflow: ellipsis`, `min-width: 0` |
| `.driver-link-qr` | Flex column centrado |
| `.driver-link-qr img` | Borde `var(--line)`, `border-radius: 10px`, fondo blanco |

---

## Comportamiento por caso de uso

| URL / Situación | Resultado |
|---|---|
| Sin `?driver=` | Flujo normal — sin cambios |
| `?driver=slug-válido` (visible, con métodos) | Vista de propinas directa del conductor |
| `?driver=slug-válido` (visible, sin métodos) | Vista de pago con "Sin método configurado" |
| `?driver=slug-inválido` o conductor oculto | Mensaje `t("driverNotFound")` — bilingüe |
| `?driver=` (valor vacío) | `get()` devuelve `""` (falsy) — flujo normal |
| "Mi enlace" — conductor con `tip_link_slug` | URL, QR y botón "Copiar" visibles |
| "Mi enlace" — conductor sin `tip_link_slug` | Mensaje "no disponible, pide al admin" |

---

## Correcciones post-QA (2026-05-14)

### RIESGO-01 — Race condition auth en deep link

**Causa:** `onAuthStateChanged()` oculta `#tipDriverSection` al inicio de cada ejecución. Si el listener de auth disparaba mientras el deep link era visible, la sección desaparecía.

**Fix:** Variable global `directDriverSlug = null`. Cuando se activa el deep link, se guarda el slug. Al final de `onAuthStateChanged()`, si `directDriverSlug` está definido, se re-llama `openDirectDriverView(directDriverSlug)`. Cuando el usuario pulsa "← Volver" (`hideTipSection()`), el flag se limpia → los refrescos de auth posteriores no vuelven a abrir la sección.

```javascript
// Globals:
let directDriverSlug = null;

// hideTipSection(): directDriverSlug = null; (primera línea)
// onAuthStateChanged() final: if (directDriverSlug) openDirectDriverView(directDriverSlug);
// init(): directDriverSlug = driverSlug; antes de openDirectDriverView(driverSlug);
```

### RIESGO-02 — Mensaje "Modo test" en conductores con slug sin métodos

**Causa:** La condición en `showDriverPayView()` mostraba `t("testNotice")` para cualquier conductor real con `tip_link_slug`, aunque no tuviera métodos de pago.

**Fix:** Nueva clave `noActiveMethods` en STRINGS (ES/EN) y condición simplificada:
```javascript
// Antes:
demoNoticeEl.textContent = driver.isMock ? t("demoNotice")
  : (driver.tip_link_slug || driver.slug) ? t("testNotice") : t("noMethodNotice");

// Después:
demoNoticeEl.textContent = driver.isMock ? t("demoNotice") : t("noActiveMethods");
```
Mensaje: `"Este conductor todavía no tiene métodos de pago activos."` / `"This driver does not have active payment methods yet."`

### RIESGO-03 — `navigator.clipboard` requiere HTTPS

**Fix:** Fallback con `document.execCommand("copy")` en el `catch` del botón "Copiar". Si `clipboard` API no está disponible, selecciona el input `#selfLinkInput` y usa el método legacy. Si ambos fallan, mensaje manual.

---

## Archivos NO modificados

- `index.html` ✅
- `supabase.sql` ✅
- `supabase/functions/**` ✅
