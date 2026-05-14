# Sprint 3I QA Plan: Enlace directo y QR público por conductor

## Setup
- Cuenta A: usuario logueado sin perfil de conductor.
- Cuenta B: conductor con `tip_link_slug` configurado y métodos PayPal + Revolut activos.
- Cuenta B2: conductor con perfil pero **sin** `tip_link_slug` (admin no ha generado slug).
- Cuenta C: admin.
- Slug B: el valor de `tip_link_slug` de la Cuenta B (ej. `marta-g`).
- URL base: `https://lcostabonet.github.io/tips-la-liga/` (o localhost en desarrollo).

---

## T01 — Deep link: conductor válido con métodos

| Paso | Resultado esperado |
|---|---|
| Abrir `?driver=<slug-B>` sin sesión | Sección "Dar propina" visible directamente |
| El conductor es el correcto | Nombre y bio de Cuenta B |
| Sus métodos activos visibles | Bloques PayPal y/o Revolut con QR propios |
| Trust notice visible | "🔒 La propina va directamente al conductor" |
| Cambiar a EN | Trust notice y botones en inglés |
| Pulsar "Pay with PayPal →" | `window.open(paypal_url)` — sin API |
| Pulsar "← Conductores" / "← Volver" | Vuelve a la sección sin romperse |
| No se cargó la lista completa de conductores | `#driverList` está oculto tras `showDriverPayView()` |

---

## T02 — Deep link: conductor no encontrado / slug inválido

| Paso | Resultado esperado |
|---|---|
| Abrir `?driver=slug-que-no-existe` | Sección "Dar propina" visible |
| Mensaje de error en ES | "Conductor no encontrado o no disponible en este momento." |
| Cambiar idioma a EN antes del deep link | Mensaje en inglés al abrirse |
| `?driver=` (valor vacío) | Flujo normal sin deep link |
| Sin parámetro `?driver` | Flujo normal — lista de conductores visible |

---

## T03 — Deep link: conductor visible pero sin métodos activos

| Paso | Resultado esperado |
|---|---|
| Abrir `?driver=<slug-sin-métodos>` | Sección "Dar propina" visible |
| Vista de pago del conductor visible | Nombre y bio correctos |
| Mensaje "Sin método de pago configurado aún." | Visible (en ES) o "No payment method configured yet." (EN) |
| Trust notice vacío o ausente | No contradice el estado del conductor |

---

## T04 — Deep link con sesión activa (usuario logueado)

| Paso | Resultado esperado |
|---|---|
| Login como Cuenta A | App principal visible |
| Añadir `?driver=<slug-B>` a la URL y recargar | Sección "Dar propina" del conductor B visible |
| Estado de sesión intacto | Usuario sigue logueado (topbar con nombre) |
| Pulsar "← Volver" | Vuelve a `appSection` (sección principal del usuario) |

---

## T05 — "Mi enlace" con `tip_link_slug` disponible (Cuenta B)

| Paso | Resultado esperado |
|---|---|
| Login como Cuenta B, abrir "🔗 Mi enlace" | Sección "Mi enlace" visible |
| Sección de enlace público visible | Encabezado "🔗 Tu enlace de Tips La Liga" |
| URL en input | Formato `<base>?driver=<slug-B>` |
| Input es de solo lectura | No editable |
| QR visible | 120×120, generado con el URL correcto |
| Pulsar "Copiar" | Toast "¡Enlace copiado!" |
| Pegar URL en navegador | Abre directamente la vista de propinas de Cuenta B |
| Resto de "Mi enlace" intacto | Toggle visible, lista de métodos, disclaimer |

---

## T06 — "Mi enlace" sin `tip_link_slug` (Cuenta B2)

| Paso | Resultado esperado |
|---|---|
| Login como Cuenta B2, abrir "🔗 Mi enlace" | Sección "Mi enlace" visible |
| No aparece sección de enlace con QR | Sin input ni QR |
| Aparece mensaje informativo | "Tu enlace público no está disponible aún..." |
| No hay errores en consola | Guard `if (copyBtn)` previene errores |

---

## T07 — URL del deep link es consistente con el entorno

| Paso | Resultado esperado |
|---|---|
| En GitHub Pages | URL empieza por `https://lcostabonet.github.io/tips-la-liga/?driver=...` |
| En desarrollo local | URL empieza por `http://localhost:PORT/?driver=...` |
| URL no contiene rutas dobles ni errores de pathname | `/tips-la-liga/?driver=slug` correcto |

---

## T08 — Seguridad del deep link

| Paso | Resultado esperado |
|---|---|
| `loadDriverBySlug()` usa `public_driver_profiles` | No accede a `driver_payment_profiles` directamente |
| Respuesta no incluye `driver_id` | La vista no expone `driver_id` |
| Respuesta no incluye campos Stripe | La vista no expone `stripe_account_id` |
| Conductor con `is_visible = false` | No aparece (filtrado por la vista) |
| Conductor con `is_active = false` | No aparece (filtrado por la vista) |

---

## T09 — No regresiones en flujo normal

| Componente | Verificar |
|---|---|
| "💸 Dar propina" sin `?driver=` | Lista de conductores carga normalmente |
| Toggle ES/EN en la lista | Funciona sin `?driver=` |
| Login, logout, registro | Sin cambios |
| Rankings y propinas CRUD | Sin cambios |
| Panel admin "Conductores" | Sin cambios |
| "🔗 Mi enlace" (parte existente) | Toggle visible, métodos, disclaimer intactos |
| "🎫 Crear mi perfil" | Sin cambios |
| `supabase.sql` | Sin cambios |
| Edge Functions | Sin cambios |

---

## T10 — Responsivo

| Paso | Resultado esperado |
|---|---|
| Deep link en móvil (375px) | Vista de pago del conductor centrada, QR cabe en pantalla |
| "Mi enlace" en móvil | Input + botón copiar se apilan o se adaptan |
| QR público en "Mi enlace" en móvil | 120×120 centrado, legible |
