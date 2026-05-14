# Sprint 3J Dev Summary

## Qué se implementó

Tres nuevas acciones en la sección "Mi enlace" para que el conductor pueda usar su QR público de forma práctica: imprimir un cartel, descargar el QR en PNG y compartir el enlace por móvil. QR de 120×120 ampliado a 160×160. Sin cambios en Supabase SQL, Edge Functions ni lógica de pagos.

---

## Archivos modificados

### `index.html` — 1 cambio

**`#printPoster`** añadido como hijo directo de `<body>`, entre `<div id="toast">` y el primer `<script>`:

```html
<div id="printPoster" class="print-only">
  <div class="poster-content">
    <p class="poster-brand">🏆 Tips La Liga</p>
    <p id="posterName" class="poster-name"></p>
    <img id="posterQr" class="poster-qr" src="" alt="QR" width="300" height="300" />
    <p class="poster-tagline">Escanea para dar una propina · Scan to leave a tip</p>
    <p class="poster-trust">
      La propina va directamente al conductor<br>
      Your tip goes directly to the driver
    </p>
  </div>
</div>
```

Permanece invisible en la app (`.print-only { display: none }`). Al imprimir, `body > * { display: none !important }` oculta todo y `#printPoster { display: flex !important }` lo muestra.

Debe ser hijo directo de `<body>` para que el selector `body > *` funcione correctamente.

---

### `style.css` — bloque Sprint 3J

**`.driver-link-actions`**
```css
display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
```
Contenedor flex para los botones de acción. `flex-wrap: wrap` apila en móvil.

**`.print-only { display: none }`**
Oculta el poster en la app normal.

**`@media print`**
- `body > * { display: none !important }` — oculta la app completa al imprimir.
- `#printPoster { display: flex !important }` — muestra solo el cartel.
- Estilos del cartel: `.poster-name` (32px, bold), `.poster-tagline` (20px), `.poster-trust` (14px, gris), `.poster-qr` (borde, border-radius), `.poster-content` (flex column, centrado, max-width 480px).

---

### `app.js` — ampliación de `showDriverSelfSection()`

**QR de 120 → 160 px**
```javascript
// selfQrSrc: size=120x120 → size=160x160
// <img>: width="120" height="120" → width="160" height="160"
```

**Variable `selfQrDownloadUrl` nueva**
```javascript
const selfQrDownloadUrl = selfPublicUrl
  ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(selfPublicUrl)}`
  : null;
```
URL de 400×400 px en PNG para la descarga.

**Template HTML — `.driver-link-actions`**
Añadido después del bloque `.driver-link-qr`, dentro de la rama `selfPublicUrl ?`:
```html
<div class="driver-link-actions">
  <button id="selfPrintBtn" ...>🖨 Imprimir cartel</button>
  <button id="selfDownloadQrBtn" ...>⬇ Descargar QR</button>
  ${navigator.share ? `<button id="selfShareBtn" ...>↗ Compartir enlace</button>` : ""}
</div>
```
`navigator.share` evaluado en tiempo de ejecución — el botón solo aparece en dispositivos que soporten la Web Share API.

**Listener imprimir** (post corrección BUG-01)
```javascript
document.getElementById("selfPrintBtn")?.addEventListener("click", () => {
  if (posterName) posterName.textContent = p.display_name;
  if (posterQr) {
    posterQr.onload = () => window.print();          // espera a que cargue la imagen
    posterQr.src = "...qrserver...size=300x300...";
    if (posterQr.complete) window.print();           // si ya cacheada, imprimir inmediato
  } else {
    window.print();                                  // sin QR, imprimir igual
  }
});
```
`posterQr.onload` garantiza que `window.print()` solo se llama cuando la imagen está cargada (Firefox). `posterQr.complete` cubre el caso donde la imagen ya está en caché (impresiones sucesivas). El `else` asegura que sin `#posterQr` en DOM se imprime igualmente.

**Listener descargar QR**
```javascript
document.getElementById("selfDownloadQrBtn")?.addEventListener("click", async () => {
  try {
    const res  = await fetch(selfQrDownloadUrl);  // qrserver devuelve CORS: *
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;  a.download = "qr-<slug>.png";  a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(selfQrDownloadUrl, "_blank", "noopener");  // fallback
  }
});
```
`URL.revokeObjectURL` libera memoria. Fallback `window.open` si `fetch` falla.

**Listener compartir**
```javascript
document.getElementById("selfShareBtn")?.addEventListener("click", async () => {
  try {
    await navigator.share({ title, text, url: selfPublicUrl });
  } catch { /* usuario canceló — silencio */ }
});
```
`?.addEventListener` — no lanza si el botón no existe en DOM (cuando `navigator.share` es falsy).

---

## Correcciones post-QA (2026-05-14)

### RIESGO-01 — Red corporativa bloquea QR externo

Añadido `id="selfQrImg"` a la `<img>` del QR en el template y `<p id="selfQrError" style="display:none">` como fallback. Después del innerHTML, listener `error` sobre `#selfQrImg`:
```javascript
selfQrImg.addEventListener("error", () => {
  selfQrImg.style.display = "none";
  document.getElementById("selfQrError").style.display = "block";
});
```
Si qrserver.com está bloqueado, la imagen se oculta y aparece: "No se pudo cargar el QR. Usa el botón 'Copiar' para compartir tu enlace."

### RIESGO-02 — Clipboard/share en dev HTTP

`style.css`: `.driver-link-input { cursor: text }` (era `cursor: default`). El cursor de texto indica al usuario que puede hacer click y seleccionar manualmente el enlace público si los métodos de copia automática no están disponibles. El botón "Compartir" ya se oculta cuando `navigator.share` es undefined. El fallback `execCommand` de Sprint 3I ya cubre el clipboard.

### RIESGO-03 — Error de carga en impresión/descarga

Print listener — añadido `posterQr.onerror`:
```javascript
posterQr.onerror = () => toast("No se pudo cargar el QR del cartel. Usa el botón 'Copiar' para compartir tu enlace.");
```
Download catch — añadido toast antes del fallback:
```javascript
} catch {
  toast("No se pudo descargar el QR. Usa el botón 'Copiar' para compartir tu enlace.");
  window.open(selfQrDownloadUrl, "_blank", "noopener");
}
```
En ambos casos el usuario recibe un mensaje claro y la alternativa (copiar el enlace) está a la vista.

---

## Fallbacks

| Funcionalidad | Disponible | Fallback |
|---|---|---|
| `navigator.share` | Solo móviles modernos | Botón no aparece — sin error |
| `fetch` para descarga | HTTPS/HTTP con CORS | Toast + `window.open` en nueva pestaña |
| `navigator.clipboard` | HTTPS/localhost | `execCommand` (Sprint 3I) + cursor text |
| QR no carga (red bloqueada) | — | Mensaje + URL seleccionable |
| QR no carga en impresión | — | Toast + alternativa copiar |

---

## Comportamiento del cartel impreso

El cartel impreso contiene:
1. "🏆 TIPS LA LIGA" (marca)
2. Nombre del conductor (32px, negrita)
3. QR 300×300 px con borde
4. "Escanea para dar una propina · Scan to leave a tip"
5. "La propina va directamente al conductor / Your tip goes directly to the driver"

Texto bilingüe hardcodeado (ES · EN) — visto por clientes, no por conductores.

---

## Archivos NO modificados

- `supabase.sql` ✅
- `supabase/functions/**` ✅
