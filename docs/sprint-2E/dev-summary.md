# Sprint 2E Dev Summary

## Qué se hizo en Sprint 2E
Sprint 2E es de validación E2E, no de implementación. El único cambio de código es la corrección de BUG-01 identificado en el QA sign-off (`docs/qa/sprint-2E-signoff.md`).

---

## Corrección BUG-01: MOCK_DRIVERS llamaban Edge Functions reales

**Problema identificado en QA:**
`MOCK_DRIVERS` tienen campos `slug` (ej. `"marta-g"`). Tras Sprint 2D, `handleTipPayment()` comprueba `if (slug && client)` para decidir si llamar a la Edge Function real `create-driver-payment-link`. Como los mocks tienen slug, se intentaba una llamada real que fallaba con 404, mostrando un toast de error en lugar del flujo simulado.

**Solución: flag `isMock`**

4 cambios mínimos en `app.js`:

### 1. `MOCK_DRIVERS` — añadir `isMock: true`
```javascript
const MOCK_DRIVERS = [
  { id: 1, name: "Marta G.", ..., slug: "marta-g", isMock: true },
  // ... (todos los 4 drivers)
];
```

### 2. Objeto `normalized` en `renderDriverList()` — propagar `isMock`
```javascript
const normalized = {
  ...,
  isMock: driver.isMock || false,  // ← añadido
};
```
Conductores reales de Supabase no tienen este campo, por lo que `driver.isMock` es `undefined` → `false`.

### 3. `handleTipPayment()` — excluir mocks de llamadas reales
```javascript
// Antes:
if (slug && client) {

// Después:
if (slug && client && !selectedDriver.isMock) {
```
- Mock drivers (`isMock: true`): condición falsa → salta al flujo simulado ✅
- Conductores reales (`isMock: false/undefined`): condición verdadera → llama Edge Function ✅

### 4. `showDriverPayView()` — corregir aviso demo para mocks
```javascript
// Antes:
demoNoticeEl.textContent = (driver.tip_link_slug || driver.slug)
  ? "🧪 Modo test — el pago es de prueba con Stripe"
  : "🧪 Modo demo — el pago no es real";

// Después:
demoNoticeEl.textContent = (driver.tip_link_slug || driver.slug) && !driver.isMock
  ? "🧪 Modo test — el pago es de prueba con Stripe"
  : "🧪 Modo demo — el pago no es real";
```
MOCK_DRIVERS tenían slug, por lo que mostraban "Modo test" incorrectamente. Ahora siempre muestran "Modo demo".

---

## Comportamiento resultante

| Escenario | Antes del fix | Después del fix |
|---|---|---|
| Conductor real (Supabase) con slug + `charges_enabled` | Stripe Checkout ✅ | Stripe Checkout ✅ |
| Conductor real sin slug | Simulación ✅ | Simulación ✅ |
| MOCK_DRIVER (fallback sin datos reales) | Error 404 en toast ❌ | Simulación ✅ |
| MOCK_DRIVER aviso demo | "Modo test" ❌ | "Modo demo" ✅ |

---

## Archivos modificados
- `app.js` — 4 cambios mínimos (ver arriba)
- `docs/sprint-2D/dev-summary.md` — descripción de `handleTipPayment()` y `showDriverPayView()` actualizada

## Archivos NO modificados
- `supabase.sql` ✅
- Edge Functions ✅
- `index.html` ✅
- `style.css` ✅
