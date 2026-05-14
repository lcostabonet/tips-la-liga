# Sprint 3J QA Plan: Imprimir y compartir QR público del conductor

## Setup
- Cuenta B: conductor con `tip_link_slug` configurado y métodos PayPal/Revolut activos.
- Cuenta B2: conductor con perfil pero **sin** `tip_link_slug`.
- Cuenta C: admin.
- Dispositivo A: desktop Chrome/Firefox/Safari (para probar impresión y descarga).
- Dispositivo B: móvil iOS o Android (para probar `navigator.share`).

---

## T01 — QR más grande en "Mi enlace"

| Paso | Resultado esperado |
|---|---|
| Login como Cuenta B, abrir "🔗 Mi enlace" | QR visible en la sección de enlace público |
| Inspeccionar el tamaño del QR | 160×160 px (antes era 120×120) |
| URL del QR | Contiene `size=160x160` en el src |
| El QR es legible | Escaneado con cámara muestra el enlace correcto |

---

## T02 — Botones de acción presentes

| Paso | Resultado esperado |
|---|---|
| Login como Cuenta B, abrir "Mi enlace" | Tres acciones visibles bajo el QR |
| Botón "🖨 Imprimir cartel" | Visible |
| Botón "⬇ Descargar QR" | Visible |
| Botón "↗ Compartir enlace" | Visible en móvil con `navigator.share`; oculto en desktop sin soporte |
| Login como Cuenta B2 (sin slug) | Sin sección de QR — sin botones de acción |

---

## T03 — Imprimir cartel (Cuenta B — desktop)

| Paso | Resultado esperado |
|---|---|
| Pulsar "🖨 Imprimir cartel" | Diálogo de impresión del navegador se abre |
| Previsualización de impresión | Solo el cartel visible — la app está oculta |
| Nombre del conductor | Nombre correcto de la Cuenta B |
| QR en el cartel | QR grande (300×300) del enlace correcto |
| Texto bilingüe | "Escanea para dar una propina · Scan to leave a tip" visible |
| Texto de confianza | "La propina va directamente al conductor / Your tip goes directly to the driver" |
| Marca | "🏆 Tips La Liga" visible |
| Cancelar impresión | La app vuelve al estado normal sin cambios |

---

## T04 — Verificar cartel impreso

| Paso | Resultado esperado |
|---|---|
| Imprimir en papel (o guardar como PDF) | Cartel centrado, limpio, legible en B&N |
| QR escaneado del papel impreso | Abre la vista de propinas del conductor en el navegador |
| Márgenes y layout | Sin texto cortado, sin desbordamiento |

---

## T05 — Descargar QR (Cuenta B)

| Paso | Resultado esperado |
|---|---|
| Pulsar "⬇ Descargar QR" | Descarga iniciada en el navegador |
| Nombre del archivo | `qr-<slug>.png` (ej. `qr-marta-g.png`) |
| Formato | PNG |
| Tamaño de la imagen | 400×400 px |
| Contenido del QR | Escanear abre el enlace directo del conductor |
| Si fetch falla (red cortada) | Se abre la URL del QR en nueva pestaña |

---

## T06 — Compartir enlace (Cuenta B — móvil iOS/Android)

| Paso | Resultado esperado |
|---|---|
| Abrir "Mi enlace" en móvil con `navigator.share` | Botón "↗ Compartir enlace" visible |
| Pulsar "↗ Compartir enlace" | Share sheet nativo del sistema operativo se abre |
| Título en el share sheet | Contiene el nombre del conductor |
| URL a compartir | URL del deep link con el slug correcto |
| Seleccionar WhatsApp/Telegram/etc. | El enlace se comparte correctamente |
| Pulsar "Cancelar" en el share sheet | No aparece ningún error |

---

## T07 — Compartir enlace — desktop sin `navigator.share`

| Paso | Resultado esperado |
|---|---|
| Abrir "Mi enlace" en Chrome desktop | Botón "Compartir enlace" NO visible |
| Botones "Imprimir" y "Descargar QR" | Siguen visibles |

---

## T08 — "Mi enlace" sin `tip_link_slug` (Cuenta B2)

| Paso | Resultado esperado |
|---|---|
| Abrir "Mi enlace" | Mensaje "Tu enlace público no está disponible aún..." |
| Sin botones de acción (Imprimir, Descargar, Compartir) | Correcto — no hay URL que compartir |
| Sin errores en consola | Los `?.addEventListener` no lanzan errores |

---

## T09 — `@media print` no afecta la app normal

| Paso | Resultado esperado |
|---|---|
| Usar la app con normalidad | `.print-only` invisible en todas las secciones |
| Panel admin | Funciona correctamente |
| Deep link `?driver=slug` | Funciona correctamente |
| Rankings y propinas | Funcionan correctamente |

---

## T10 — Seguridad y alcance

| Check | Resultado esperado |
|---|---|
| `fetch` en descarga QR | Solo llama a `api.qrserver.com` — sin APIs de pago |
| `navigator.share` | Solo envía URL pública — sin datos privados |
| Sin claves secretas | 0 coincidencias en grep |
| `supabase.sql` no modificado | `git diff HEAD -- supabase.sql` → 0 |
| Edge Functions no modificadas | `git diff HEAD -- supabase/functions/` → 0 |
| Sin PayPal API | 0 coincidencias |
| Sin Revolut API | 0 coincidencias |

---

## T11 — No regresiones

| Componente | Verificar |
|---|---|
| Botón "Copiar" | Sigue funcionando con clipboard + fallback execCommand |
| Toggle "Visible en Dar propina" | Sigue funcionando |
| Lista de métodos de pago | Sigue funcionando |
| Deep link `?driver=slug` | Sin cambios |
| PayPal/Revolut en "Dar propina" | Sin cambios |
| Login/logout | Sin cambios |
| Rankings y propinas CRUD | Sin cambios |
| Panel admin | Sin cambios |
