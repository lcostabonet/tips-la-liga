# Sprint 3I Checklist

## app.js

### i18n
- [ ] `STRINGS.es.driverNotFound` definido
- [ ] `STRINGS.en.driverNotFound` definido
- [ ] Ambas claves con el mismo nombre exacto

### `loadDriverSelfProfile()`
- [ ] SELECT incluye `tip_link_slug`
- [ ] `driverSelfProfile.id` sigue disponible ✓
- [ ] `driverSelfProfile.display_name` sigue disponible ✓
- [ ] `driverSelfProfile.is_visible` sigue disponible ✓

### `loadDriverBySlug(slug)`
- [ ] Función declarada y accesible
- [ ] Usa `public_driver_profiles` (vista pública, no la tabla)
- [ ] SELECT idéntico al de `loadPublicDrivers()`
- [ ] Usa `.eq("tip_link_slug", slug)`
- [ ] Usa `.maybeSingle()` — no `.single()`
- [ ] Retorna `null` en caso de error o sin resultado
- [ ] Guard `if (!client) return null`

### `openDirectDriverView(slug)`
- [ ] Oculta `authSection`, `appSection`, `driverSelfSection`, `driverSetupSection`, `adminDriversSection`, `driverMethodsSection`
- [ ] Muestra `tipDriverSection` y `driverList`
- [ ] Oculta `driverPayView` antes de la query
- [ ] Muestra `t("loading")` mientras carga
- [ ] Si `driver === null` → muestra `t("driverNotFound")`
- [ ] Objeto `normalized` incluye todos los campos que `showDriverPayView()` necesita
- [ ] `isMock: false` — nunca trata conductores reales como mock
- [ ] Llama `showDriverPayView(normalized)` al encontrar el conductor

### `init()`
- [ ] Lee `new URLSearchParams(window.location.search).get("driver")`
- [ ] Solo llama `openDirectDriverView(driverSlug)` si `driverSlug` tiene valor truthy
- [ ] Se ejecuta DESPUÉS de `onAuthStateChanged()` — auth ya establecida
- [ ] Sin cambios en el resto de `init()`

### `showDriverSelfSection()`
- [ ] Calcula `base = window.location.origin + window.location.pathname`
- [ ] Construye `selfPublicUrl` solo si `driverSelfProfile.tip_link_slug` es truthy
- [ ] `selfPublicUrl` usa `encodeURIComponent(tip_link_slug)`
- [ ] QR URL generado con `qrserver.com` y `encodeURIComponent(selfPublicUrl)`
- [ ] Si `selfPublicUrl` es null → muestra mensaje de slug no disponible
- [ ] Input `#selfLinkInput` es `readonly`
- [ ] `selfPublicUrl` escapado con `escapeHtml()` en el atributo `value`
- [ ] Listener del botón "Copiar" registrado después del innerHTML
- [ ] `navigator.clipboard.writeText()` con try/catch y toast en ambos casos
- [ ] Si `#selfCopyLinkBtn` no existe (sin slug) — guard `if (copyBtn)` previene error

---

## style.css

- [ ] `.driver-public-link-section` definido con `border-top` y flex column
- [ ] `.driver-link-label` — `font-weight: 700`
- [ ] `.driver-link-box` — flex row con gap
- [ ] `.driver-link-input` — `cursor: default`, `text-overflow: ellipsis`, fondo claro
- [ ] `.driver-link-qr` — flex column centrado
- [ ] `.driver-link-qr img` — borde y border-radius

---

## index.html

- [ ] Sin modificaciones

---

## Verificación funcional

### Deep link
- [ ] URL `?driver=slug-valido` → salta lista y muestra vista de pago directa
- [ ] El conductor correcto aparece (nombre, bio, emoji)
- [ ] Sus métodos activos se muestran (PayPal, Revolut)
- [ ] Sus QR individuales se generan correctamente
- [ ] Botones de pago abren `window.open(payment_url)` — sin API
- [ ] Trust notice visible y bilingüe
- [ ] Toggle ES/EN funciona dentro del deep link
- [ ] "← Volver" regresa a la lista de conductores
- [ ] "← Conductores" regresa al mismo

### Deep link — casos de error
- [ ] `?driver=slug-inexistente` → mensaje `t("driverNotFound")` en ES
- [ ] Cambiar a EN antes del error → mensaje en inglés
- [ ] `?driver=` (vacío) → no activa el deep link, flujo normal
- [ ] Sin parámetro `?driver` → flujo normal sin cambios

### "Mi enlace" con slug disponible
- [ ] URL visible en el input readonly (formato correcto)
- [ ] QR generado del URL correcto
- [ ] Botón "Copiar" copia al portapapeles
- [ ] Toast "¡Enlace copiado!" visible tras copiar
- [ ] Enlace abre el deep link correcto al pegarlo en un navegador

### "Mi enlace" sin slug
- [ ] Mensaje "Tu enlace público no está disponible" visible
- [ ] No hay input ni QR
- [ ] No hay error en consola

### No-regresiones
- [ ] Flujo normal "Dar propina" (sin URL param) funciona
- [ ] Lista de conductores se carga normalmente
- [ ] Login/logout funcionan
- [ ] Rankings y propinas CRUD funcionan
- [ ] Panel admin "Conductores" funciona
- [ ] Métodos de pago (añadir/editar/eliminar) funcionan
- [ ] Toggle ES/EN funciona en todos los contextos

### Seguridad
- [ ] Sin claves secretas añadidas
- [ ] Sin PayPal API ni Revolut API
- [ ] Sin procesamiento de pagos
- [ ] `supabase.sql` sin modificar
- [ ] Edge Functions sin modificar
- [ ] `loadDriverBySlug()` usa `public_driver_profiles` (no `driver_payment_profiles`)
- [ ] No se expone `driver_id` ni campos Stripe en el deep link
