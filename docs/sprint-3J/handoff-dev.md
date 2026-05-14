# Sprint 3J Handoff Dev

## Orden de implementación

1. `index.html` — añadir `#printPoster`
2. `style.css` — bloque Sprint 3J (`.driver-link-actions` + `@media print`)
3. `app.js` — ampliar `showDriverSelfSection()` (QR mayor, botones, listeners)

---

## Cambio 1 — `index.html`: elemento `#printPoster`

Añadir **entre `<div id="toast">` y `<script src="...supabase...">`**:

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

Debe ser hijo directo de `<body>` para que `body > * { display: none }` funcione y `#printPoster` pueda ser reactivado.

---

## Cambio 2 — `style.css`: bloque Sprint 3J

Añadir al final del archivo:

```css
/* ===== Sprint 3J: Imprimir y compartir QR ===== */

.driver-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.print-only {
  display: none;
}

@media print {
  body > * {
    display: none !important;
  }

  #printPoster {
    display: flex !important;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 0;
    margin: 0;
  }

  .poster-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    max-width: 480px;
    text-align: center;
    padding: 40px 24px;
  }

  .poster-brand {
    font-size: 18px;
    font-weight: 700;
    color: #555;
    margin: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .poster-name {
    font-size: 32px;
    font-weight: 900;
    color: #111;
    margin: 0;
    line-height: 1.1;
  }

  .poster-qr {
    border: 3px solid #ddd;
    border-radius: 16px;
    background: white;
    padding: 8px;
  }

  .poster-tagline {
    font-size: 20px;
    font-weight: 700;
    color: #222;
    margin: 0;
    line-height: 1.4;
  }

  .poster-trust {
    font-size: 14px;
    color: #666;
    margin: 0;
    line-height: 1.6;
  }
}
```

---

## Cambio 3 — `app.js`: ampliar `showDriverSelfSection()`

### 3a — Cambiar QR de 120 a 160

```javascript
// ANTES (línea ~1397):
const selfQrSrc = selfPublicUrl
  ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(selfPublicUrl)}`
  : null;

// DESPUÉS:
const selfQrSrc = selfPublicUrl
  ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(selfPublicUrl)}`
  : null;
```

Y en el `<img>` del template:
```html
<!-- ANTES: -->
<img src="${selfQrSrc}" alt="QR de tu enlace" width="120" height="120" loading="lazy" />

<!-- DESPUÉS: -->
<img src="${selfQrSrc}" alt="QR de tu enlace" width="160" height="160" loading="lazy" />
```

### 3b — Añadir fila de acciones en el template

Añadir **después del bloque `.driver-link-qr`** y **antes del cierre del bloque `selfPublicUrl ?`**:

```html
<div class="driver-link-actions">
  <button id="selfPrintBtn" class="btn ghost btn-sm" type="button">🖨 Imprimir cartel</button>
  <button id="selfDownloadQrBtn" class="btn ghost btn-sm" type="button">⬇ Descargar QR</button>
  ${navigator.share ? `<button id="selfShareBtn" class="btn ghost btn-sm" type="button">↗ Compartir enlace</button>` : ""}
</div>
```

**Nota:** `navigator.share` es evaluado en tiempo de ejecución dentro del template literal — correcto porque el template se evalúa al llamar `showDriverSelfSection()`, no al cargar el script.

### 3c — Registrar listeners (después del listener del botón "Copiar")

```javascript
// Imprimir cartel
document.getElementById("selfPrintBtn")?.addEventListener("click", () => {
  const posterName = document.getElementById("posterName");
  const posterQr   = document.getElementById("posterQr");
  if (posterName) posterName.textContent = p.display_name;
  if (posterQr)   posterQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selfPublicUrl)}`;
  window.print();
});

// Descargar QR
document.getElementById("selfDownloadQrBtn")?.addEventListener("click", async () => {
  const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(selfPublicUrl)}&format=png`;
  try {
    const res  = await fetch(downloadUrl);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `qr-${p.tip_link_slug || p.display_name.replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(downloadUrl, "_blank", "noopener");
  }
});

// Compartir (solo si navigator.share existe)
document.getElementById("selfShareBtn")?.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: `Propina para ${p.display_name} · Tips La Liga`,
      text:  `Deja una propina directamente a ${p.display_name}`,
      url:   selfPublicUrl,
    });
  } catch {
    // El usuario canceló o el navegador rechazó — no hacer nada
  }
});
```

**Notas sobre los listeners:**
- Todos usan `?.addEventListener` — si el elemento no existe (sin slug o sin `navigator.share`), no lanza error.
- `p` y `selfPublicUrl` están en el scope de `showDriverSelfSection()` — capturados correctamente por los closures.
- `URL.revokeObjectURL(url)` libera memoria tras el click.
- El fallback de descarga abre la URL en nueva pestaña (qrserver.com devuelve imagen directamente).

---

## Verificación post-implementación

- [ ] `#printPoster` en `index.html` como hijo directo de `<body>`
- [ ] `posterName` y `posterQr` tienen IDs correctos
- [ ] `.print-only { display: none }` en CSS normal
- [ ] `@media print` oculta `body > *` y muestra `#printPoster`
- [ ] QR en "Mi enlace" muestra 160×160
- [ ] Botones "Imprimir", "Descargar QR" siempre visibles (cuando hay slug)
- [ ] Botón "Compartir" visible solo si `navigator.share` está definido
- [ ] `window.print()` rellena el poster antes de llamar
- [ ] Descarga usa fetch + Blob; fallback a `window.open`
- [ ] `navigator.share()` no lanza error al cancelar (catch vacío)
- [ ] `supabase.sql` sin modificar
- [ ] Edge Functions sin modificar
