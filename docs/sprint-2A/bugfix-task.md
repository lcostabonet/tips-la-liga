# Mini-tarea: Correcciones post-QA Sprint 2A

**Origen:** QA sign-off `docs/qa/sprint-2A-signoff.md` (2026-05-12)
**Estado sprint:** APROBADO — estos bugs no bloquearon el sprint, pero deben corregirse antes de iniciar Sprint 2B.
**Estimación total:** ~15 minutos de código.

---

## BUG-01 — Solapamiento visual al cambiar sesión en `tipDriverSection`

| Campo | Detalle |
|---|---|
| **Gravedad** | Baja |
| **Archivo** | `app.js` |
| **Función** | `onAuthStateChanged()` |
| **Línea aprox.** | 577–598 |

### Descripción
Cuando Supabase emite un evento de autenticación (expiración de token, logout forzado) mientras el usuario está en la sección "Dar propina", `onAuthStateChanged()` muestra `authSection` o `appSection` sin ocultar `tipDriverSection`. Resultado: dos secciones visibles a la vez.

### Causa raíz
`onAuthStateChanged()` gestiona `authSection` y `appSection` pero no conoce `tipDriverSection`.

### Fix requerido
Añadir una línea al inicio del bloque de "sesión cerrada" y otra al inicio del bloque de "sesión activa", dentro de `onAuthStateChanged()`:

```js
// En el bloque if (!currentUser):
els.tipDriverSection.classList.add("hidden");

// En el bloque try (sesión activa), antes de mostrar appSection:
els.tipDriverSection.classList.add("hidden");
```

O de forma más limpia, añadir **una sola línea** al inicio de `onAuthStateChanged()` que siempre oculte `tipDriverSection` independientemente del estado de sesión:

```js
async function onAuthStateChanged(session) {
  els.tipDriverSection.classList.add("hidden"); // ← añadir esta línea
  currentUser = session?.user || null;
  ...
}
```

### Criterio de aceptación
- Iniciar sesión en la sección "Dar propina" no causa solapamiento visual.
- Cerrar sesión en la sección "Dar propina" no causa solapamiento visual.
- El flujo normal de "Dar propina" sin login sigue funcionando.

---

## BUG-02 — `selectedTipAmount` no se resetea al pulsar "Dar otra propina"

| Campo | Detalle |
|---|---|
| **Gravedad** | Muy baja |
| **Archivo** | `app.js` |
| **Listener** | `els.newTipBtn.addEventListener(...)` |
| **Línea aprox.** | 636–639 |

### Descripción
Al pulsar "Dar otra propina", el listener llama a `renderDriverList()` y restaura el botón de pago, pero no resetea `selectedTipAmount`. El valor queda en memoria hasta que el usuario selecciona un conductor nuevo (que sí lo resetea en `showDriverPayView()`). No hay impacto visual inmediato, pero el estado interno queda inconsistente.

### Causa raíz
El listener de `newTipBtn` no incluye `selectedTipAmount = 0`, a diferencia de `hideTipSection()` y `showDriverPayView()` que sí lo hacen.

### Fix requerido
Añadir `selectedTipAmount = 0;` en el listener de `newTipBtn`:

```js
// Antes:
els.newTipBtn.addEventListener("click", () => {
  els.payTipBtn.classList.remove("hidden");
  renderDriverList();
});

// Después:
els.newTipBtn.addEventListener("click", () => {
  selectedTipAmount = 0;
  els.payTipBtn.classList.remove("hidden");
  renderDriverList();
});
```

### Criterio de aceptación
- Tras pulsar "Dar otra propina", `selectedTipAmount` vale 0.
- El botón "Pagar" aparece desactivado con texto "Selecciona un importe" al volver al listado.
- Seleccionar un conductor nuevo y un importe funciona correctamente.

---

## Orden de implementación sugerido

1. BUG-02 primero (1 línea, sin riesgo de regresión).
2. BUG-01 después (1 línea, verificar que el flujo sin login no se rompe).

## Pruebas mínimas tras el fix

- [ ] Pulsar "Dar propina" → seleccionar conductor → pagar → "Dar otra propina" → confirmar que el botón aparece desactivado.
- [ ] Con sesión activa: ir a "Dar propina" → pulsar "Salir" → confirmar que solo se muestra `authSection`.
- [ ] Sin sesión: ir a "Dar propina" → volver → confirmar que solo se muestra `authSection`.
- [ ] El flujo completo de login, registro y rankings sigue funcionando.
