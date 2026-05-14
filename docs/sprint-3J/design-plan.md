# Sprint 3J Design Plan: Cartel de impresión y acciones de enlace

## Estado actual de "Mi enlace" (Sprint 3I)

```
┌──────────────────────────────────────────┐
│ Nombre del conductor                      │
│ ☑ Visible en "Dar propina"               │
│                                           │
│ [Lista de métodos / + Añadir método]      │
│                                           │
│ 🔗 Tu enlace de Tips La Liga             │
│ [url larga    ..................] [Copiar] │
│ [QR 120×120]                             │
│  Comparte este QR para recibir propinas  │
│                                           │
│ ⚠ Aviso: no se procesan pagos            │
│                           [Cerrar]        │
└──────────────────────────────────────────┘
```

## Diseño Sprint 3J — "Mi enlace" ampliada

```
┌──────────────────────────────────────────┐
│ Nombre del conductor                      │
│ ☑ Visible en "Dar propina"               │
│                                           │
│ [Lista de métodos / + Añadir método]      │
│                                           │
│ 🔗 Tu enlace de Tips La Liga             │
│ [url larga    ..................] [Copiar] │
│                                           │
│         [QR 160×160]                     │  ← más grande
│   Comparte este QR para recibir propinas  │
│                                           │
│ [🖨 Imprimir] [⬇ Descargar QR] [↗ Compartir]│  ← nuevo
│                                           │
│ ⚠ Aviso: no se procesan pagos            │
│                           [Cerrar]        │
└──────────────────────────────────────────┘
```

---

## D01 — `.driver-link-actions`

```css
.driver-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
```

Los botones usan la clase existente `.btn.ghost.btn-sm` — coherentes con el botón "Copiar" ya existente. Sin nuevas clases de botón.

En móvil (`flex-wrap: wrap`): los tres botones se apilan si no caben en una línea. `btn-sm` ya tiene `min-height: 44px`.

---

## D02 — Cartel de impresión

### Estructura

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

### CSS normal (oculto en app)

```css
.print-only {
  display: none;
}
```

### CSS `@media print`

```css
@media print {
  /* Ocultar toda la app */
  body > * {
    display: none !important;
  }

  /* Mostrar solo el cartel */
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

### Aspecto resultante en A4 vertical

- Fondo blanco (blanco del papel)
- Centrado verticalmente en la página
- Fuente del sistema — sin dependencias externas
- QR grande (300×300 px) — legible con cualquier smartphone
- Texto bilingüe en español e inglés bajo el QR

---

## D03 — QR display en "Mi enlace"

Cambiar de 120×120 a 160×160 en el `<img>` y en el `selfQrSrc`:

```javascript
// ANTES:
`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=...`
// width="120" height="120"

// DESPUÉS:
`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=...`
// width="160" height="160"
```

El contenedor `.driver-link-qr` ya usa `flex-direction: column; align-items: center` — se adapta automáticamente.

---

## Principios mantenidos

- Sin librerías nuevas.
- Sin fuentes externas (Google Fonts, etc.).
- Sin imágenes embebidas (el QR viene de qrserver.com, que ya se usa en el resto de la app).
- El cartel es imprimible en cualquier impresora en blanco y negro.
- El botón "Compartir" solo aparece si `navigator.share` está disponible — sin detección de usuario-agente.
