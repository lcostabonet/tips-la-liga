# Sprint 3H i18n Plan: Experiencia bilingüe ES/EN

## Decisión de enfoque

**Opción elegida: toggle ES/EN** — un pequeño selector en el encabezado de la sección "Dar propina".

**Alternativas descartadas:**
- *Textos bilingües siempre visibles*: duplica el contenido, aspecto más cargado, no estándar.
- *Auto-detección de idioma* (`navigator.language`): puede no reflejar la preferencia real del usuario; añade complejidad para un flujo de un solo uso.

**Alcance del bilingüismo:** solo la experiencia pública de "Dar propina" (`#tipDriverSection`). Panel admin, "Mi enlace", formularios de conductor y login quedan en español.

---

## Arquitectura i18n

### Variable de idioma activo
```javascript
let currentLang = 'es';
```
Inicializa en español. Sin persistencia (`localStorage`) por ahora — cada sesión empieza en español.

### Objeto de cadenas
```javascript
const STRINGS = {
  es: {
    leaveATip:        "💸 Dar propina",
    chooseDriver:     "Elige un conductor",
    directToDriver:   "🔒 La propina va directamente al conductor",
    scanOrTap:        "Escanea el QR o pulsa el botón",
    tipBtn:           "Dar propina",
    noDrivers:        "No hay conductores disponibles en este momento.",
    loading:          "Cargando conductores...",
    selectAmount:     "Selecciona un importe",
    payBtnActive:     (amount) => `Pagar ${amount} €`,
    anotherTip:       "Dar otra propina",
    tipSent:          (name) => `¡Propina enviada a ${name}!`,
    demoNotice:       "🧪 Modo demo — el pago no es real",
    testNotice:       "🧪 Modo test — el pago es de prueba con Stripe",
    noMethodNotice:   "Sin método de pago configurado aún.",
    providerNotice:   "🔗 El pago se completa en el proveedor externo. Esta app no procesa ni registra la transacción.",
    payWithPaypal:    "Pagar con PayPal →",
    payWithRevolut:   "Pagar con Revolut →",
    payWith:          (name) => `Pagar con ${name} →`,
  },
  en: {
    leaveATip:        "💸 Leave a tip",
    chooseDriver:     "Choose a driver",
    directToDriver:   "🔒 Your tip goes directly to the driver",
    scanOrTap:        "Scan the QR code or tap the button",
    tipBtn:           "Leave a tip",
    noDrivers:        "No drivers available right now.",
    loading:          "Loading drivers...",
    selectAmount:     "Select an amount",
    payBtnActive:     (amount) => `Pay ${amount} €`,
    anotherTip:       "Leave another tip",
    tipSent:          (name) => `Tip sent to ${name}!`,
    demoNotice:       "🧪 Demo mode — payment is not real",
    testNotice:       "🧪 Test mode — this is a Stripe test payment",
    noMethodNotice:   "No payment method configured yet.",
    providerNotice:   "🔗 Payment is completed on the external provider. This app does not process or record the transaction.",
    payWithPaypal:    "Pay with PayPal →",
    payWithRevolut:   "Pay with Revolut →",
    payWith:          (name) => `Pay with ${name} →`,
  },
};
```

### Helper `t(key)`
```javascript
function t(key) {
  return STRINGS[currentLang][key];
}
```
Retorna directamente el valor (string o función). Si el valor es función, el caller la invoca: `t('payBtnActive')(5.00)`.

### Función `setLang(lang)`
```javascript
function setLang(lang) {
  currentLang = lang;
  // Actualizar clases del toggle
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  // Re-renderizar la vista activa dentro de #tipDriverSection
  if (!els.driverPayView.classList.contains("hidden") && selectedDriver) {
    showDriverPayView(selectedDriver);
  } else {
    renderDriverList();
  }
}
```

`renderDriverList()` recarga la lista de conductores de Supabase. El coste es una query ligera; es aceptable para un cambio de idioma puntual.

---

## Aplicación de `t()` por función

### `renderDriverList()` — 3 puntos
| Texto actual | Clave STRINGS |
|---|---|
| `"Cargando conductores..."` | `t('loading')` |
| `"No hay conductores disponibles..."` | `t('noDrivers')` |
| `"Dar propina"` (botón de tarjeta) | `t('tipBtn')` |

### `showDriverPayView()` — 6 puntos
| Texto actual | Clave STRINGS |
|---|---|
| `"Escanea el QR o elige un importe"` (`.qr-hint`) | `t('scanOrTap')` |
| Trust notice (nuevo) | `t('directToDriver')` |
| `"🧪 Modo demo..."` | `t('demoNotice')` |
| `"🧪 Modo test..."` | `t('testNotice')` |
| `"Sin método de pago configurado aún."` | `t('noMethodNotice')` |
| `.payment-provider-notice` | `t('providerNotice')` |

### `providerLabel()` — 1 punto
```javascript
function providerLabel(provider) {
  return STRINGS[currentLang][`payWith${provider.charAt(0).toUpperCase() + provider.slice(1)}`]
    || t('payWith')(providerDisplayName(provider));
}
```
O más simple:
```javascript
function providerLabel(provider) {
  if (provider === 'paypal')  return t('payWithPaypal');
  if (provider === 'revolut') return t('payWithRevolut');
  return t('payWith')(providerDisplayName(provider));
}
```
Esta función solo es llamada desde `showDriverPayView()` — seguro hacerla language-aware.

### `updatePayButton()` — 2 puntos
| Texto actual | Clave STRINGS |
|---|---|
| `"Selecciona un importe"` | `t('selectAmount')` |
| `` `Pagar ${X} €` `` | `t('payBtnActive')(X)` |

### `handleTipPayment()` — 1 punto
| Texto actual | Clave STRINGS |
|---|---|
| `` `¡Propina de X € enviada a Y!` `` | `t('tipSent')(driverName)` (con amount en el string si se decide incluir) |

Nota: la confirmación de pago actual concatena importe y nombre en una sola frase. En la clave `tipSent` se simplifica a nombre únicamente para mantener la traducción manejable. El importe ya es visible en el botón anterior.

### `setupEvents()` — 1 punto (listener del toggle)
```javascript
// Delegación sobre el contenedor del toggle
document.querySelector(".lang-toggle")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (btn?.dataset.lang) setLang(btn.dataset.lang);
});
```
Un único listener para los dos botones ES/EN.

### `els.newTipBtn` textContent — 1 punto
`els.newTipBtn.textContent` es estático en `setupEvents()`. Debe actualizarse en `setLang()` o mediante un `textContent` directo en la función de confirmación:
```javascript
els.newTipBtn.textContent = t('anotherTip');
```
Mejor: actualizar en `handleTipPayment()` cuando se muestra la confirmación, y en `setLang()` si la confirmación ya está visible.

---

## Cadenas que NO se traducen

- Nombres de conductores (`display_name`) — son datos de la DB, no strings de la app.
- `vehicle_info`, `route_info` — ídem.
- `payment_instructions` — texto libre del conductor, no de la app.
- Mensajes de toast (errores, "Sesión iniciada", etc.) — son mensajes internos para usuarios registrados.
- Todo el panel admin, "Mi enlace", formularios de conductor.

---

## Limitaciones del enfoque

1. **`renderDriverList()` hace query a Supabase al cambiar idioma** en la vista de lista. En la vista de pago (`driverPayView`) el cambio es síncrono y sin coste. Aceptable para uso real.
2. **Sin persistencia del idioma** entre sesiones. El usuario que prefiere inglés debe volver a pulsar EN en cada visita. Mitigación Sprint 3I si se requiere: guardar en `sessionStorage`.
3. **`handleTipPayment()` tiene un timeout de 1500ms** para la simulación Stripe. Si el usuario cambia idioma durante ese intervalo, el mensaje de confirmación aparecerá en el idioma activo en ese momento (no el que tenía al pulsar). Comportamiento aceptable.
