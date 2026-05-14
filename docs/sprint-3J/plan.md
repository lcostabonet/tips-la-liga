# Sprint 3J Plan: Imprimir y compartir QR público del conductor

## Contexto

Sprint 3I añadió el enlace directo `?driver=slug` y mostró en "Mi enlace" un QR 120×120 con un botón "Copiar". Sprint 3J extiende esta sección para que el conductor pueda usar su enlace de forma práctica: compartirlo por móvil, imprimirlo como cartel y descargarlo como imagen.

---

## Objetivo

1. **Compartir**: botón "Compartir enlace" mediante `navigator.share` (visible solo si la API está disponible — móviles modernos).
2. **Imprimir cartel**: botón "Imprimir cartel" que abre el diálogo de impresión del navegador con un diseño de cartel limpio y bilingüe listo para colgar en el vehículo.
3. **Descargar QR**: botón "Descargar QR" que descarga el QR en PNG de 400×400 px via fetch + Blob.
4. **QR más grande en "Mi enlace"**: subir de 120×120 a 160×160 para mejor legibilidad.

---

## Análisis de estado previo (Sprint 3I)

| Elemento | Estado | Sprint 3J |
|---|---|---|
| `selfPublicUrl` calculado con `origin + pathname` | ✅ | Reutilizar |
| QR via qrserver.com `size=120x120` | ✅ | Subir a 160×160 en display |
| Botón "Copiar" con clipboard + execCommand fallback | ✅ | Sin cambios |
| `driverSelfProfile.tip_link_slug` en SELECT | ✅ | Sin cambios |
| `#printPoster` en `index.html` | ❌ no existe | Añadir |
| CSS `@media print` | ❌ no existe | Añadir |
| `navigator.share` | ❌ no existe | Añadir condicional |
| Descarga QR via fetch/Blob | ❌ no existe | Añadir |

---

## Cambios planificados

### `index.html` — 1 cambio

**P01 — Elemento `#printPoster`**
Añadir antes del `</body>`, después del `<div id="toast">`:
```html
<div id="printPoster" class="print-only">
  <div class="poster-content">
    <p class="poster-brand">🏆 Tips La Liga</p>
    <p id="posterName" class="poster-name"></p>
    <img id="posterQr" class="poster-qr" src="" alt="QR" width="300" height="300" />
    <p class="poster-tagline">Escanea para dar una propina · Scan to leave a tip</p>
    <p class="poster-trust">La propina va directamente al conductor<br>Your tip goes directly to the driver</p>
  </div>
</div>
```
Permanece invisible (`display: none`) en la app normal. Solo aparece al imprimir.

---

### `style.css` — 2 bloques nuevos al final

**D01 — Acciones de enlace en "Mi enlace"**
```css
.driver-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
```
Contenedor flex para los 3 botones de acción (compartir, imprimir, descargar).

**D02 — Cartel de impresión (`@media print`)**
```css
.print-only { display: none; }

@media print {
  body > * { display: none !important; }
  #printPoster { display: flex !important; ... }
  /* Estilos del cartel: centrado, tipografía clara, QR grande */
}
```

---

### `app.js` — 3 grupos de cambios

**A01 — QR display de 120 a 160 en `showDriverSelfSection()`**
`selfQrSrc` sigue apuntando a `size=120x120` para el src del `<img>` (se puede actualizar a 160x160 directamente). En el `<img>` cambiar `width="120" height="120"` a `width="160" height="160"`.

**A02 — Nuevos botones en `showDriverSelfSection()`**
En el template HTML, dentro de `.driver-public-link-section`, añadir fila de acciones debajo del QR:
```html
<div class="driver-link-actions">
  <button id="selfPrintBtn" class="btn ghost btn-sm" type="button">🖨 Imprimir cartel</button>
  <button id="selfDownloadQrBtn" class="btn ghost btn-sm" type="button">⬇ Descargar QR</button>
  ${typeof navigator !== "undefined" && navigator.share ? `
    <button id="selfShareBtn" class="btn ghost btn-sm" type="button">↗ Compartir enlace</button>
  ` : ""}
</div>
```

**A03 — Listeners de los nuevos botones**
Después del listener del botón "Copiar", registrar:

*Imprimir:*
```javascript
document.getElementById("selfPrintBtn")?.addEventListener("click", () => {
  document.getElementById("posterName").textContent = p.display_name;
  document.getElementById("posterQr").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selfPublicUrl)}`;
  window.print();
});
```

*Descargar QR:*
```javascript
document.getElementById("selfDownloadQrBtn")?.addEventListener("click", async () => {
  const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(selfPublicUrl)}&format=png`;
  try {
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${p.tip_link_slug || p.display_name.replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(downloadUrl, "_blank", "noopener");
  }
});
```

*Compartir (condicional):*
```javascript
document.getElementById("selfShareBtn")?.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: `Propina para ${p.display_name} · Tips La Liga`,
      text: `Deja una propina directamente a ${p.display_name}`,
      url: selfPublicUrl,
    });
  } catch {
    // El usuario canceló o hubo un error — no hacer nada
  }
});
```

---

## Diseño del cartel de impresión

El cartel debe ser limpio, centrado en página A4/Letter, listo para imprimir y recortar:

```
┌─────────────────────────────────────────┐
│                                         │
│         🏆 Tips La Liga                 │
│                                         │
│         NOMBRE DEL CONDUCTOR            │
│                                         │
│         ┌──────────────────┐            │
│         │                  │            │
│         │    QR 300×300    │            │
│         │                  │            │
│         └──────────────────┘            │
│                                         │
│  Escanea para dar una propina           │
│  Scan to leave a tip                    │
│                                         │
│  La propina va directamente al conductor│
│  Your tip goes directly to the driver   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Alcance — qué NO cambia

- `supabase.sql` — sin cambios
- `supabase/functions/**` — sin cambios
- Botón "Copiar" — sin cambios
- Flujo de pago PayPal/Revolut — sin cambios
- Deep link `?driver=slug` — sin cambios

---

## Decisión sobre i18n

Los botones de acción ("Imprimir cartel", "Descargar QR", "Compartir enlace") están en "Mi enlace", que es conductor-facing e interno → se mantienen en español, sin añadir claves a STRINGS.

El cartel de impresión es visto por clientes → es bilingüe por diseño (texto hardcodeado ES · EN en el HTML del poster).
