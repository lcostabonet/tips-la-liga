# Sprint 2A Checklist: Prototipo "Dar Propina"

## Estado general
- [x] Sprint iniciado
- [x] Código listo para revisión
- [x] Revisión QA completada — sign-off en `docs/qa/sprint-2A-signoff.md`
- [x] Sprint aprobado (con 2 bugs menores pendientes — ver `bugfix-task.md`)

---

## Estructura y navegación
- [x] Pestaña "Dar propina" visible en la nav principal
- [x] La pestaña activa su sección sin romper las demás vistas
- [x] El botón de volver a la lista funciona correctamente

## Lista de conductores
- [x] Se renderizan al menos 3 conductores de ejemplo (se implementaron 4)
- [x] Cada tarjeta muestra emoji, nombre y bio
- [x] El botón "Dar propina" funciona y muestra la vista de pago
- [ ] Las tarjetas son accesibles y tienen buen contraste (pendiente prueba en navegador)

## Vista de pago
- [x] Se muestra el nombre y emoji del conductor seleccionado
- [x] El QR ficticio aparece y es visible (imagen de `api.qrserver.com`)
- [x] El QR no contiene datos reales ni secrets
- [x] Chips de importe (1€, 2€, 5€, 10€) funcionan y se marcan al seleccionar
- [x] El input de importe libre acepta valores y actualiza el botón
- [x] El botón "Pagar" muestra el importe seleccionado
- [x] El botón "Pagar" está desactivado si no hay importe
- [x] El aviso "Modo demo" es visible y claro

## Feedback simulado
- [x] Al pulsar "Pagar" el botón cambia a estado "Procesando..."
- [x] Después del timeout aparece el mensaje de confirmación
- [x] El mensaje incluye importe y nombre del conductor
- [x] El botón "Dar otra propina" vuelve a la lista de conductores

## Diseño móvil
- [x] La interfaz es usable en 375px — confirmado por análisis de CSS responsive
- [x] La interfaz es usable en 390px — confirmado por análisis de CSS responsive
- [x] Los botones tienen al menos 44px de alto
- [x] El QR es legible en pantallas pequeñas (180×180 px)
- [ ] No hay overflow horizontal en ninguna vista (pendiente prueba en navegador)

## Código y seguridad
- [x] No hay `STRIPE_SECRET_KEY` ni ninguna key secreta en el código
- [x] No hay `SUPABASE_SERVICE_ROLE_KEY` en el código
- [x] No se realizan llamadas a Edge Functions
- [x] No se modifican tablas ni RLS de Supabase
- [x] Los datos de conductores son hardcodeados (no vienen de Supabase)
- [x] No se añaden dependencias nuevas sin justificación

## Compatibilidad con código existente
- [x] Las vistas de login, ranking e historial siguen funcionando
- [x] El CSS nuevo no rompe estilos globales existentes
- [x] La lógica JS nueva no interfiere con eventos existentes

## Revisión final
- [ ] Probado en Chrome (escritorio y modo responsive)
- [ ] Probado en Safari móvil (o simulador iOS)
- [ ] Sin errores en consola del navegador (QA estático pasado; pendiente prueba real)
- [ ] El aviso "Modo demo" es visible en todas las resoluciones probadas
- [x] Documentación actualizada: `dev-summary.md`, `bugfix-task.md`, QA sign-off

---

## Correcciones post-QA (antes de Sprint 2B)

> Detalle completo en `docs/sprint-2A/bugfix-task.md`

- [x] **BUG-01** (baja): `els.tipDriverSection.classList.add("hidden")` añadido al inicio de `onAuthStateChanged()` — app.js línea 578.
- [x] **BUG-02** (muy baja): `selectedTipAmount = null`, vaciado de input y deselección de chips añadidos al listener de `newTipBtn` — app.js líneas 638–640.
- [ ] Verificar pruebas mínimas del bugfix (ver `bugfix-task.md` §Pruebas mínimas).
