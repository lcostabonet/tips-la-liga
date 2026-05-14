# Sprint 3J Checklist

## index.html

- [ ] `#printPoster` añadido entre `<div id="toast">` y `<script src="...supabase...">`
- [ ] `#printPoster` es hijo directo de `<body>`
- [ ] Contiene `<div class="poster-content">` con:
  - `<p class="poster-brand">🏆 Tips La Liga</p>`
  - `<p id="posterName" class="poster-name"></p>` — vacío
  - `<img id="posterQr" class="poster-qr" src="" ...>` — src vacío
  - `<p class="poster-tagline">` con texto bilingüe ES · EN
  - `<p class="poster-trust">` con texto bilingüe ES · EN y `<br>`

---

## style.css

### Bloque normal
- [ ] `.driver-link-actions` definido con `display: flex; flex-wrap: wrap; gap: 8px`
- [ ] `.print-only { display: none }` definido

### `@media print`
- [ ] `body > * { display: none !important }` oculta toda la app
- [ ] `#printPoster { display: flex !important }` remuestra el cartel
- [ ] `.poster-content` centrado en columna
- [ ] `.poster-name` con `font-size: 32px; font-weight: 900`
- [ ] `.poster-tagline` con `font-size: 20px`
- [ ] `.poster-qr` con borde y `border-radius`
- [ ] `.poster-trust` con color gris
- [ ] Sin fuentes externas ni dependencias de red en el CSS de impresión

---

## app.js — `showDriverSelfSection()`

### QR display
- [ ] `selfQrSrc` usa `size=160x160`
- [ ] `<img>` del template usa `width="160" height="160"`

### Template HTML
- [ ] `.driver-link-actions` present en el bloque `selfPublicUrl ? ...`
- [ ] Botón `#selfPrintBtn` con `type="button"` y texto "🖨 Imprimir cartel"
- [ ] Botón `#selfDownloadQrBtn` con `type="button"` y texto "⬇ Descargar QR"
- [ ] Botón `#selfShareBtn` condicional a `navigator.share` — solo aparece si existe

### Listener imprimir
- [ ] Rellena `posterName.textContent = p.display_name`
- [ ] Rellena `posterQr.src` con QR de 300×300 px
- [ ] Llama `window.print()`
- [ ] Guard `if (posterName)` y `if (posterQr)` — previene errores si el DOM no está listo

### Listener descargar QR
- [ ] URL de descarga usa `size=400x400` y `format=png`
- [ ] `fetch(downloadUrl)` → `blob()` → `URL.createObjectURL`
- [ ] Elemento `<a>` creado dinámicamente con `a.download` y `a.click()`
- [ ] `URL.revokeObjectURL` liberado después del click
- [ ] `catch` fallback abre URL en nueva pestaña con `window.open`
- [ ] Nombre de archivo: `qr-<slug>.png` o `qr-<display_name>.png`

### Listener compartir
- [ ] `navigator.share({ title, text, url: selfPublicUrl })`
- [ ] `catch` vacío — no muestra error si el usuario cancela
- [ ] `#selfShareBtn` solo existe en DOM cuando `navigator.share` está disponible
- [ ] `?.addEventListener` en todos los listeners — no lanza si el elemento no existe

---

## Verificación funcional

### Imprimir
- [ ] Pulsar "Imprimir cartel" abre el diálogo de impresión del navegador
- [ ] El diálogo muestra el cartel con nombre del conductor y QR
- [ ] El resto de la app queda oculto en la previsualización de impresión
- [ ] El texto bilingüe aparece correctamente
- [ ] Funciona en Chrome, Firefox y Safari

### Descargar QR
- [ ] Pulsar "Descargar QR" inicia una descarga de imagen PNG
- [ ] El archivo se llama `qr-<slug>.png`
- [ ] La imagen PNG descargada contiene el QR correcto
- [ ] Fallback: si fetch falla, se abre una nueva pestaña con el QR

### Compartir
- [ ] En iOS/Android: botón "Compartir enlace" visible; al pulsarlo se abre el share sheet nativo
- [ ] En desktop sin `navigator.share`: botón no aparece
- [ ] Cancelar el share sheet no muestra error

### No-regresiones
- [ ] QR 160×160 muestra la misma URL que antes (solo el tamaño cambió)
- [ ] Botón "Copiar" sigue funcionando
- [ ] Toggle "Visible en Dar propina" sigue funcionando
- [ ] Lista de métodos sigue funcionando
- [ ] "Mi enlace" sin slug: mensaje sin slug, sin botones de acción
- [ ] Panel admin sin cambios
- [ ] Deep link `?driver=slug` sin cambios
- [ ] Flujo PayPal/Revolut sin cambios

---

## Seguridad
- [ ] Sin claves secretas en los listeners
- [ ] `fetch` solo llama a `api.qrserver.com` (ya en uso en el resto de la app)
- [ ] `navigator.share` no envía datos a servidores de la app
- [ ] `supabase.sql` sin modificar
- [ ] Edge Functions sin modificar

---

## Archivos modificados
- [ ] `index.html` ← 1 elemento añadido
- [ ] `style.css` ← 1 bloque Sprint 3J añadido
- [ ] `app.js` ← ampliación de `showDriverSelfSection()`
