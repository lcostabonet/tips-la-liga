# Sprint 3A Dev Summary

## Qué se implementó
Soporte para enlace de pago externo (PayPal) por conductor. En "Dar propina", si el conductor tiene `payment_url` configurado, se muestra el QR del enlace y un botón "Pagar con PayPal →". Sin procesamiento de pagos, sin claves secretas. Stripe Connect queda aparcado.

---

## Archivos modificados

### `supabase.sql`
Bloque Sprint 3A añadido al final:
- `ALTER TABLE driver_payment_profiles ADD COLUMN IF NOT EXISTS` para `payment_provider`, `payment_url`, `payment_instructions`.
- Vista `public_driver_profiles` recreada exponiendo los 3 campos nuevos (Stripe sigue excluido).
- Re-grants `SELECT` a `anon` y `authenticated`.
- Constraint `payment_url_provider_match` (ver corrección BUG-01 abajo).

### `index.html`
- `<div class="external-pay-section hidden">` añadida dentro de `#driverPayView` (después de `.qr-box`): contiene `.payment-instructions`, `.external-pay-btn` y `.payment-provider-notice`.
- 3 campos nuevos en `#editDriverDialog`: select `editPaymentProvider`, input `editPaymentUrl` (type=url), textarea `editPaymentInstructions`.

### `style.css`
Bloque Sprint 3A al final:
- `.payment-badge`, `.payment-paypal` (azul PayPal), `.payment-none`.
- `.external-pay-section`, `.external-pay-btn`, `.payment-provider-notice`, `.payment-instructions`.

### `app.js`
- 4 referencias nuevas en `els`: `editPaymentProvider`, `editPaymentUrl`, `editPaymentInstructions`, `externalPayBtn`.
- `loadPublicDrivers()` amplía SELECT con 3 campos nuevos.
- `renderDriverList()` propaga 3 campos en objeto `normalized`.
- `showDriverPayView()` reescrita: QR prioriza `payment_url` → `public_url` → demo. Muestra/oculta `.external-pay-section` y chips/botón según `hasExternalPay`.
- `handleTipPayment()`: rama Stripe solo si no hay `payment_url` (`!selectedDriver.payment_url`).
- `loadDriverProfiles()` amplía SELECT con 3 campos.
- `openEditDriverDialog()` prellena los 3 campos nuevos.
- `saveEditDriver()` incluye 3 campos en `updates` + validación BUG-01.
- `renderDriverProfiles()` muestra badge de proveedor + data attrs en botón Editar.
- `setupEvents()` listener de `externalPayBtn`: abre `payment_url` con importe PayPal.me si fue seleccionado.

---

## Comportamiento por tipo de conductor

| Conductor | QR | Botón | Flujo |
|---|---|---|---|
| Real con `payment_url` (PayPal) | QR del `payment_url` real | "Pagar con PayPal →" | `window.open(payment_url)` — sin API, sin keys |
| Real sin `payment_url` | QR de `public_url` o demo | Aviso "Sin método configurado" | Chips + Stripe (aparcado) o simulación |
| MOCK_DRIVER (`isMock: true`) | QR ficticio demo | "Modo demo — el pago no es real" | Simulación |

---

## Corrección post-QA: BUG-01 (2026-05-13)

**Problema identificado en QA:**
`payment_url` no validaba que fuera un dominio PayPal cuando `payment_provider = 'paypal'`. Un admin podía guardar cualquier URL para conductores PayPal.

**Fix: doble capa de protección**

### Capa 1 — Validación en `saveEditDriver()` (frontend)

```javascript
const paymentProvider = els.editPaymentProvider.value || null;
const paymentUrl = els.editPaymentUrl.value.trim() || null;

if (paymentProvider === "paypal" && paymentUrl) {
  const validPaypalDomains = [
    "https://paypal.me/",
    "https://www.paypal.me/",
    "https://paypal.com/",
    "https://www.paypal.com/",
  ];
  if (!validPaypalDomains.some((d) => paymentUrl.startsWith(d))) {
    toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
    return;
  }
}
```

El admin ve un mensaje de error claro antes de intentar guardar. El UPDATE a Supabase no se ejecuta si la URL no es válida.

### Capa 2 — CHECK constraint en DB (`supabase.sql`)

```sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_url_provider_match'
      and conrelid = 'public.driver_payment_profiles'::regclass
  ) then
    alter table public.driver_payment_profiles
      add constraint payment_url_provider_match
      check (
        payment_provider is null
        or payment_provider <> 'paypal'
        or payment_url is null
        or payment_url like 'https://paypal.me/%'
        or payment_url like 'https://www.paypal.me/%'
        or payment_url like 'https://paypal.com/%'
        or payment_url like 'https://www.paypal.com/%'
      );
  end if;
end;
$$;
```

- **Idempotente:** el `DO $$ ... $$` comprueba `pg_constraint` antes de añadir. No falla si ya existe.
- **No bloquea proveedores futuros:** solo aplica cuando `payment_provider = 'paypal'`.
- **Permite NULL:** `payment_url IS NULL` es válido (conductor sin URL configurada).
- **Cobertura:** paypal.me, www.paypal.me, paypal.com, www.paypal.com.

**Para activar el constraint en Supabase:** ejecutar el bloque `DO $$ ... $$` del Sprint 3A en el SQL Editor.

---

## Archivos NO modificados
- Edge Functions de Stripe Connect ✅
- Columnas Stripe en `driver_payment_profiles` ✅
- `index.html` (salvo los 2 cambios de Sprint 3A) ✅
