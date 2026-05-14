# Sprint 3H Design Plan: Rediseño profesional

## Sistema de diseño actual

| Variable | Valor | Uso |
|---|---|---|
| `--bg` | `#f7f3ea` | Fondo general (beige cálido) |
| `--card` | `#ffffff` | Tarjetas |
| `--primary` | `#151515` | Botones primarios, texto |
| `--gold` | `#f4c542` | Acento, CTA "Dar propina" |
| `--muted` | `#6c6258` | Texto secundario |
| `--line` | `#e4dacb` | Bordes |
| Font | system-ui stack | Sin fuentes externas |

El diseño base es sólido: limpio, cálido, con buena jerarquía tipográfica. Los ajustes de Sprint 3H son incrementales, no un rediseño completo.

---

## D01 — CTA "Dar propina" más prominente

**Problema actual:** el botón `.tip-tab` tiene `padding: 12px 16px` — igual que cualquier botón `.btn`. En móvil queda a la misma altura que los botones de admin y conductor.

**Objetivo:** el botón de "Dar propina" debe verse como el CTA principal de la página pública, más grande y con más peso visual.

**CSS:**
```css
/* Override sobre la definición existente de .tip-tab */
.tip-tab {
  padding: 14px 28px;
  font-size: 16px;
  min-height: 52px;
  letter-spacing: -0.3px;
  box-shadow: 0 4px 14px rgba(244, 197, 66, 0.4);
}

.tip-tab:hover {
  box-shadow: 0 6px 20px rgba(244, 197, 66, 0.55);
  transform: translateY(-1px);
}
```

Sin cambios en `index.html` — solo CSS.

---

## D02 — Toggle de idioma ES/EN

**Diseño:** dos botones pill pequeños, coherentes con `.auth-tabs`. El toggle activo tiene fondo `--primary`. Máximo 44px de altura táctil.

```css
.lang-toggle {
  display: flex;
  gap: 4px;
}

.lang-btn {
  border: 1px solid var(--line);
  background: #fffaf0;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  color: var(--text);
  transition: background 0.12s, color 0.12s;
}

.lang-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.lang-btn:not(.active):hover {
  border-color: var(--gold);
}
```

**Posición en HTML:** dentro de `.tip-driver-header`, al final del flex container. En móvil se coloca en la segunda fila (`.tip-driver-header` tiene `flex-wrap: wrap`).

```html
<!-- Añadir al final de .tip-driver-header -->
<div class="lang-toggle">
  <button class="lang-btn active" data-lang="es" type="button">ES</button>
  <button class="lang-btn" data-lang="en" type="button">EN</button>
</div>
```

---

## D03 — Aviso de confianza (trust notice)

**Objetivo:** el cliente debe ver de inmediato que su propina va directamente al conductor y que la app no retiene nada. Texto breve, visible, no intrusivo.

**Posición:** entre `.driver-pay-header` y `.qr-box` (o `.external-pay-section`). Se rellena con `t('directToDriver')` desde JS.

```css
.tip-trust-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  margin: 0 0 16px;
  font-weight: 600;
}
```

El icono 🔒 se inserta desde JS como parte del string `t('directToDriver')` para que también sea traducible:
- ES: `"🔒 La propina va directamente al conductor"`
- EN: `"🔒 Your tip goes directly to the driver"`

---

## D04 — Mejoras de `.payment-method-block`

**Problema actual:** el bloque tiene `padding: 16px`, borde `1px solid var(--line)` y `border-radius: 20px`. Es funcional pero se ve básico. No hay hover, no transmite calidad.

**Override:**
```css
/* Sprint 3H: override del bloque definido en Sprint 3D */
.payment-method-block {
  padding: 24px 20px;
  border: 2px solid var(--line);
  border-radius: 24px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.payment-method-block:hover {
  border-color: var(--gold);
  box-shadow: 0 4px 16px rgba(244, 197, 66, 0.2);
}

.payment-method-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.2px;
}
```

El QR se mantiene en 160×160 px — tamaño ya adecuado para escaneo.

---

## D05 — Mejora del aviso de proveedor

El `.payment-provider-notice` actual es demasiado pequeño (12px) y se mezcla con el resto. Añadir separador visual:

```css
/* Sprint 3H: mejora del aviso de proveedor externo */
.payment-provider-notice {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: 4px;
}
```

---

## D06 — Eliminar `.demo-badge` del encabezado público

El badge "🧪 Demo" en `.tip-driver-header` se muestra a todos los usuarios (clientes que van a dar una propina real). Rompe la confianza.

**Acción:** eliminar el `<span class="demo-badge">🧪 Demo</span>` del HTML de `#tipDriverSection`.

Si en el futuro se necesita un indicador de entorno para conductores/admin, se añadirá condicionalmente desde JS (ej. solo si `isAdmin()`).

---

## Resumen de cambios CSS

| ID | Selector | Cambio |
|---|---|---|
| D01 | `.tip-tab` | Más padding, font-size 16px, sombra dorada, hover con elevación |
| D02 | `.lang-toggle`, `.lang-btn`, `.lang-btn.active` | Toggle ES/EN, 44px min-height |
| D03 | `.tip-trust-notice` | Flex centrado, texto muted 13px |
| D04 | `.payment-method-block` | Más padding, borde 2px, hover dorado |
| D04 | `.payment-method-name` | Font-size 16px, font-weight 800 |
| D05 | `.payment-provider-notice` | Separador top, padding |

---

## Principios de diseño mantenidos

- Sin librerías de fuentes externas ni iconos.
- Sin cambios en `--bg`, `--primary`, `--gold`, `--card` — la paleta es correcta.
- Sin cambios en el sistema de grid ni en la estructura de cards.
- Los emojis de conductor (🚌, 🚐, etc.) se mantienen — son identificadores visuales útiles.
- El emoji de CTA (💸 en "Dar propina") se mantiene — reconocible.
